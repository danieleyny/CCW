import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import {
  CASE_STAGES,
  isNypdControlled,
  stageIndex,
  stageMeta,
  type CaseStageKey,
} from "@/config/stages"
import { STALLED_DAYS } from "@/config/service-targets"
import { APPLICATION_TYPE_LABELS, type ApplicationType } from "@/lib/application-types"
import { agreementsCurrentFor } from "@/lib/concierge/onboarding"
import { paidCaseIds } from "@/lib/packages"
import { deriveCaseOwnership, type CaseMoveOwner } from "@/lib/admin/ownership"
import { duplicateCaseMetadata } from "@/lib/admin/case-visibility"

type DB = SupabaseClient<Database>

export type PipelineView = "active" | "leads"
export type PipelineTrackFilter = "all" | "premise" | "concealed" | "special"
export type PipelineServiceFilter = "all" | "concierge" | "self_guided" | "none"
export type PipelineAssignedFilter = "all" | "me" | "unassigned" | string

export interface PipelineFilters {
  track: PipelineTrackFilter
  service: PipelineServiceFilter
  assigned: PipelineAssignedFilter
  stalled: boolean
  currentUserId: string
}

export type ActivePhaseKey = "getting_started" | "training" | "paperwork" | "filing" | "nypd" | "licensed"
export type LeadGroupKey = "new" | "screened" | "package" | "quiet"

export interface PipelineCard {
  id: string
  clientName: string
  trackKey: Exclude<PipelineTrackFilter, "all">
  trackLabel: string
  serviceKey: Exclude<PipelineServiceFilter, "all" | "none"> | null
  serviceLabel: string
  stage: CaseStageKey
  stageLabel: string
  nextStep: string
  whoseMove: CaseMoveOwner
  days: number
  stalled: boolean
  nypdControlled: boolean
  qaSignedOff: boolean
  ownerId: string | null
  ownerName: string | null
  ownerInitials: string
  isDemo: boolean
  isDuplicate: boolean
  duplicateLabel: string | null
  pendingAmount: string | null
  lastStep: string | null
  progressStep: number
  classification: PipelineView
  phase: ActivePhaseKey
  leadGroup: LeadGroupKey
  hiddenDuplicate: boolean
}

export interface PipelineColumn {
  key: ActivePhaseKey | LeadGroupKey
  label: string
  subtitle: string | null
  tone: "default" | "agency" | "licensed" | "warm" | "muted"
  cards: PipelineCard[]
  stageCounts: Array<{ key: CaseStageKey; label: string; count: number }>
  multiStage: boolean
  stalledCount: number
}

export interface PipelineStaffOption {
  id: string
  name: string
}

export interface PipelineData {
  view: PipelineView
  columns: PipelineColumn[]
  activeCount: number
  leadCount: number
  currentCount: number
  unfilteredVisibleCount: number
  hidden: { test: number; duplicate: number }
  stalledCount: number
  showHidden: boolean
  isFiltered: boolean
  filters: PipelineFilters
  staff: PipelineStaffOption[]
  asOf: string
  /** Server-only consumers such as Cases use this to share every pipeline rule. */
  allCards: PipelineCard[]
}

export type PipelineClientData = Omit<PipelineData, "allCards">

interface RawCase {
  id: string
  clientId: string
  clientName: string
  clientEmail: string | null
  clientTrack: string
  assignedStaff: string | null
  stage: CaseStageKey
  status: string
  applicationType: ApplicationType | null
  licenseTrack: string
  serviceMode: "concierge" | "self_guided" | null
  stageEnteredAt: string
  updatedAt: string
  isDemo: boolean
  qaSignedOffBy: string | null
  licenseIssuedOn: string | null
  licenseExpiresOn: string | null
}

interface PendingPaymentRow {
  case_id: string | null
  amount_cents: number
  currency: string
  created_at: string
  package_key: string | null
}

const DAY = 86_400_000
const ACTIVE_PHASES: Array<{
  key: ActivePhaseKey
  label: string
  tone: PipelineColumn["tone"]
  stages: CaseStageKey[]
}> = [
  { key: "getting_started", label: "Getting started", tone: "default", stages: ["lead", "eligibility_screened", "signed_up_paid"] },
  { key: "training", label: "Training", tone: "default", stages: ["training_scheduled", "training_complete"] },
  { key: "paperwork", label: "Paperwork", tone: "default", stages: ["document_collection", "notarization"] },
  { key: "filing", label: "Filing", tone: "default", stages: ["application_assembled", "filed"] },
  { key: "nypd", label: "With NYPD", tone: "agency", stages: ["fingerprinting_booked", "under_investigation", "decision"] },
  { key: "licensed", label: "Licensed", tone: "licensed", stages: ["licensed"] },
]

const LEAD_GROUPS: Array<{
  key: LeadGroupKey
  label: string
  subtitle: string
  tone: PipelineColumn["tone"]
}> = [
  { key: "new", label: "New", subtitle: "Signed up or asked in the last 14 days", tone: "default" },
  { key: "screened", label: "Screened", subtitle: "Eligibility checked, no package yet", tone: "default" },
  { key: "package", label: "Chose a package — not paid", subtitle: "Closest to enrolling", tone: "warm" },
  { key: "quiet", label: "Gone quiet", subtitle: "No activity in 30+ days", tone: "muted" },
]

function daysSince(value: string, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / DAY))
}

function latest(values: Array<string | null | undefined>, fallback: string) {
  return values.filter((value): value is string => !!value).sort().at(-1) ?? fallback
}

function ownerInitials(name: string | null) {
  if (!name) return "—"
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "—"
}

function applicationTrack(c: RawCase, paid: boolean): {
  key: Exclude<PipelineTrackFilter, "all">
  label: string
} {
  const type = c.applicationType
  if (type === "premise_residence") return { key: "premise", label: "PREMISE RES." }
  if (type === "premise_business") return { key: "premise", label: "PREMISE BUSINESS" }
  if (type === "special_carry" || type === "special_carry_guard") return { key: "special", label: "SPECIAL CARRY" }
  if (type === "carry_guard") return { key: "concealed", label: "CARRY GUARD" }
  if (type === "retired_leo") return { key: "concealed", label: "RETIRED LEO" }
  if (type === "concealed_carry") return { key: "concealed", label: "CONCEALED CARRY" }
  if (c.clientTrack === "non_resident" || c.licenseTrack === "special_carry_guard") {
    return { key: "special", label: "SPECIAL CARRY" }
  }
  if (c.licenseTrack === "carry_guard") return { key: "concealed", label: "CARRY GUARD" }
  return { key: "concealed", label: paid ? "CONCEALED CARRY" : "NO PATH YET" }
}

function service(c: RawCase) {
  if (c.serviceMode === "concierge") return { key: "concierge" as const, label: "Concierge" }
  if (c.serviceMode === "self_guided") return { key: "self_guided" as const, label: "Self-guided" }
  return { key: null, label: "No package" }
}

function activePhase(stage: CaseStageKey): ActivePhaseKey {
  if (stage === "licensed") return "licensed"
  if (stage === "fingerprinting_booked" || stage === "under_investigation" || stage === "decision") return "nypd"
  if (stage === "application_assembled" || stage === "filed") return "filing"
  if (stage === "document_collection" || stage === "notarization") return "paperwork"
  if (stage === "training_scheduled" || stage === "training_complete") return "training"
  return "getting_started"
}

function leadGroup(c: RawCase, pendingPayment: boolean, inactivityDays: number): LeadGroupKey {
  if (inactivityDays >= 30) return "quiet"
  if (c.serviceMode || pendingPayment) return "package"
  if (c.stage === "eligibility_screened") return "screened"
  return "new"
}

function defaultApplicantStep(c: RawCase, pendingRequirements: number, intakeStep: number | null, intakeDone: boolean) {
  if (!intakeDone && intakeStep != null) return `Finish intake · step ${Math.min(6, intakeStep + 1)} of 6`
  if (pendingRequirements > 0 && stageIndex(c.stage) >= stageIndex("document_collection") && stageIndex(c.stage) < stageIndex("filed")) {
    return `${pendingRequirements} checklist item${pendingRequirements === 1 ? "" : "s"} remaining`
  }
  const byStage: Record<CaseStageKey, string> = {
    lead: "Complete eligibility",
    eligibility_screened: "Choose a service package",
    signed_up_paid: "Finish intake",
    training_scheduled: "Complete scheduled training",
    training_complete: "Start the document checklist",
    document_collection: "Complete document checklist",
    notarization: "Finish notarizations",
    application_assembled: "Review the assembled application",
    filed: "Application submitted",
    fingerprinting_booked: "Attend fingerprinting and interview",
    under_investigation: "NYPD review",
    decision: "Review the NYPD decision",
    licensed: "Licensed",
  }
  return byStage[c.stage]
}

function appointmentLabel(type: string, scheduledAt: string) {
  const label = type === "fingerprinting" ? "Fingerprints" : type === "nypd_interview" ? "Interview" : "Appointment"
  const date = new Date(scheduledAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  })
  return `${label} ${date}`
}

function matchesFilters(card: PipelineCard, filters: PipelineFilters) {
  if (filters.track !== "all" && card.trackKey !== filters.track) return false
  if (filters.service === "none" && card.serviceKey !== null) return false
  if (filters.service !== "all" && filters.service !== "none" && card.serviceKey !== filters.service) return false
  if (filters.assigned === "me" && card.ownerId !== filters.currentUserId) return false
  if (filters.assigned === "unassigned" && card.ownerId !== null) return false
  if (!["all", "me", "unassigned"].includes(filters.assigned) && card.ownerId !== filters.assigned) return false
  if (filters.stalled && !card.stalled) return false
  return true
}

function isFiltered(filters: PipelineFilters) {
  return filters.track !== "all" || filters.service !== "all" || filters.assigned !== "all" || filters.stalled
}

function responseError(value: { error: unknown | null }, label: string) {
  if (value.error) throw new Error(`${label}: ${String((value.error as { message?: string }).message ?? value.error)}`)
}

export async function loadPipeline(
  db: DB,
  {
    view,
    showHidden,
    filters,
    now = new Date(),
  }: { view: PipelineView; showHidden: boolean; filters: PipelineFilters; now?: Date }
): Promise<PipelineData> {
  const caseResult = await db
    .from("cases")
    .select("id, client_id, stage, status, application_type, license_track, service_mode, stage_entered_at, updated_at, is_demo, qa_signed_off_by, license_issued_on, license_expires_on, clients!inner(id, full_name, email, track, assigned_staff)")
    .neq("status", "closed")
    .order("updated_at", { ascending: false })
  responseError(caseResult, "Cases")

  const cases: RawCase[] = (caseResult.data ?? []).map((row) => {
    const client = row.clients as unknown as {
      id: string
      full_name: string
      email: string | null
      track: string
      assigned_staff: string | null
    }
    return {
      id: row.id,
      clientId: row.client_id,
      clientName: client.full_name || "Applicant",
      clientEmail: client.email,
      clientTrack: client.track,
      assignedStaff: client.assigned_staff,
      stage: row.stage as CaseStageKey,
      status: row.status,
      applicationType: row.application_type as ApplicationType | null,
      licenseTrack: row.license_track,
      serviceMode: row.service_mode,
      stageEnteredAt: row.stage_entered_at || row.updated_at,
      updatedAt: row.updated_at,
      isDemo: row.is_demo,
      qaSignedOffBy: row.qa_signed_off_by,
      licenseIssuedOn: row.license_issued_on,
      licenseExpiresOn: row.license_expires_on,
    }
  })
  const ids = cases.map((c) => c.id)

  if (ids.length === 0) {
    return {
      view,
      columns: view === "active"
        ? ACTIVE_PHASES.map((phase) => ({ ...phase, subtitle: null, cards: [], stageCounts: [], multiStage: phase.stages.length > 1, stalledCount: 0 }))
        : LEAD_GROUPS.map((group) => ({ ...group, cards: [], stageCounts: [], multiStage: false, stalledCount: 0 })),
      activeCount: 0,
      leadCount: 0,
      currentCount: 0,
      unfilteredVisibleCount: 0,
      hidden: { test: 0, duplicate: 0 },
      stalledCount: 0,
      showHidden,
      isFiltered: isFiltered(filters),
      filters,
      staff: [],
      asOf: now.toISOString(),
      allCards: [],
    }
  }

  const [
    paidIds,
    pendingPayments,
    staffResult,
    messagesResult,
    documentsResult,
    tasksResult,
    referencesResult,
    cohabitantsResult,
    bookingsResult,
    appointmentsResult,
    introsResult,
    requirementsResult,
    intakesResult,
    agreementsResult,
  ] = await Promise.all([
    paidCaseIds(db, ids),
    db.from("payments").select("case_id, amount_cents, currency, created_at, package_key").eq("status", "pending").in("case_id", ids),
    db.from("profiles").select("id, full_name, role").in("role", ["staff", "admin"]).order("full_name"),
    db.from("messages").select("case_id, created_at, read, profiles:sender_id(role)").in("case_id", ids).is("engagement_id", null),
    db.from("documents").select("case_id, status, created_at").in("case_id", ids),
    db.from("tasks").select("case_id, title, due_date, created_at, status").in("case_id", ids).eq("status", "open"),
    db.from("reference_requests").select("case_id, status, created_at, revoked_at").in("case_id", ids),
    db.from("cohabitants").select("case_id, affidavit_status, sent_at, token_revoked_at, created_at").in("case_id", ids),
    db.from("bookings").select("case_id, status, starts_at, type").in("case_id", ids).neq("status", "cancelled"),
    db.from("appointments").select("case_id, type, scheduled_at").in("case_id", ids).gte("scheduled_at", now.toISOString()).order("scheduled_at"),
    db.from("intro_calls").select("case_id, status, scheduled_at").in("case_id", ids),
    db.from("case_requirements").select("case_id, status").in("case_id", ids).in("status", ["pending", "rejected"]),
    db.from("intake_sessions").select("case_id, current_step, completed_at, updated_at").in("case_id", ids),
    db.from("case_agreements").select("case_id, kind, version").in("case_id", ids),
  ])

  for (const [label, result] of [
    ["Pending payments", pendingPayments], ["Staff", staffResult], ["Messages", messagesResult],
    ["Documents", documentsResult], ["Tasks", tasksResult], ["References", referencesResult],
    ["Cohabitants", cohabitantsResult], ["Bookings", bookingsResult], ["Appointments", appointmentsResult],
    ["Intro calls", introsResult], ["Requirements", requirementsResult], ["Intake", intakesResult],
    ["Agreements", agreementsResult],
  ] as const) responseError(result, label)

  const staff = (staffResult.data ?? []).map((person) => ({ id: person.id, name: person.full_name || "Staff" }))
  const staffName = new Map(staff.map((person) => [person.id, person.name]))
  const duplicates = duplicateCaseMetadata(cases)

  const pendingPayment = new Map<string, PendingPaymentRow>()
  for (const payment of pendingPayments.data ?? []) {
    if (!payment.case_id) continue
    const current = pendingPayment.get(payment.case_id)
    if (!current || payment.created_at > current.created_at) pendingPayment.set(payment.case_id, payment)
  }

  const unreadClientMessages = new Map<string, number>()
  const activity = new Map<string, string[]>()
  for (const message of messagesResult.data ?? []) {
    const role = (message.profiles as unknown as { role?: string } | null)?.role
    if (role !== "client") continue
    const rows = activity.get(message.case_id) ?? []
    rows.push(message.created_at)
    activity.set(message.case_id, rows)
    if (!message.read) unreadClientMessages.set(message.case_id, (unreadClientMessages.get(message.case_id) ?? 0) + 1)
  }

  const pendingDocuments = new Map<string, number>()
  for (const document of documentsResult.data ?? []) {
    const rows = activity.get(document.case_id) ?? []
    rows.push(document.created_at)
    activity.set(document.case_id, rows)
    if (document.status === "pending") pendingDocuments.set(document.case_id, (pendingDocuments.get(document.case_id) ?? 0) + 1)
  }

  const overdueTasks = new Map<string, { title: string; created_at: string }>()
  const todayKey = now.toISOString().slice(0, 10)
  for (const task of tasksResult.data ?? []) {
    if (!task.case_id || !task.due_date || task.due_date >= todayKey) continue
    const current = overdueTasks.get(task.case_id)
    if (!current || task.created_at < current.created_at) overdueTasks.set(task.case_id, { title: task.title, created_at: task.created_at })
  }

  const references = new Map<string, { total: number; notarized: number; open: number }>()
  for (const request of referencesResult.data ?? []) {
    if (request.revoked_at) continue
    const value = references.get(request.case_id) ?? { total: 0, notarized: 0, open: 0 }
    value.total++
    if (request.status === "notarized") value.notarized++
    if (request.status === "sent" || request.status === "opened") value.open++
    references.set(request.case_id, value)
  }

  const pendingCohabitants = new Map<string, number>()
  for (const cohabitant of cohabitantsResult.data ?? []) {
    if (cohabitant.sent_at && !cohabitant.token_revoked_at && cohabitant.affidavit_status === "not_started") {
      pendingCohabitants.set(cohabitant.case_id, (pendingCohabitants.get(cohabitant.case_id) ?? 0) + 1)
    }
  }

  const requestedBooking = new Map<string, { starts_at: string; type: string }>()
  for (const booking of bookingsResult.data ?? []) {
    if (booking.status === "requested" && !requestedBooking.has(booking.case_id)) requestedBooking.set(booking.case_id, booking)
  }

  const nextAppointment = new Map<string, string>()
  for (const appointment of appointmentsResult.data ?? []) {
    if (appointment.case_id && !nextAppointment.has(appointment.case_id)) {
      nextAppointment.set(appointment.case_id, appointmentLabel(appointment.type, appointment.scheduled_at))
    }
  }
  const intros = new Map((introsResult.data ?? []).map((intro) => [intro.case_id, intro]))

  const requirementCount = new Map<string, number>()
  for (const requirement of requirementsResult.data ?? []) requirementCount.set(requirement.case_id, (requirementCount.get(requirement.case_id) ?? 0) + 1)
  const intakes = new Map((intakesResult.data ?? []).map((intake) => [intake.case_id, intake]))
  const agreementRows = new Map<string, Array<{ kind: string; version: number }>>()
  for (const agreement of agreementsResult.data ?? []) {
    const rows = agreementRows.get(agreement.case_id) ?? []
    rows.push({ kind: agreement.kind, version: agreement.version })
    agreementRows.set(agreement.case_id, rows)
  }

  const cards = cases.map((c): PipelineCard & { classification: PipelineView; phase: ActivePhaseKey; leadGroup: LeadGroupKey } => {
    const paid = paidIds.has(c.id)
    const days = daysSince(c.stageEnteredAt || c.updatedAt, now)
    const nypdControlled = isNypdControlled(c.stage) && c.stage !== "filed"
    const stalled = days > STALLED_DAYS && stageIndex(c.stage) < stageIndex("filed") && !nypdControlled
    const track = applicationTrack(c, paid)
    const serviceInfo = service(c)
    const ownerName = c.assignedStaff ? staffName.get(c.assignedStaff) ?? null : null
    const pendingDocs = pendingDocuments.get(c.id) ?? 0
    const unread = unreadClientMessages.get(c.id) ?? 0
    const openRequirements = requirementCount.get(c.id) ?? 0
    const ref = references.get(c.id)
    const cohabitantCount = pendingCohabitants.get(c.id) ?? 0
    const booking = requestedBooking.get(c.id)
    const intro = intros.get(c.id)
    const agreementsComplete = agreementsCurrentFor(agreementRows.get(c.id) ?? []).complete
    const intake = intakes.get(c.id)

    let staffNextStep: string | null = null
    if (c.qaSignedOffBy || (c.stage === "notarization" && openRequirements === 0)) staffNextStep = c.qaSignedOffBy ? "Open signed case" : "Final QA sign-off"
    else if (unread > 0) staffNextStep = "Client waiting on a reply"
    else if (pendingDocs > 0) staffNextStep = `Review ${pendingDocs} uploaded document${pendingDocs === 1 ? "" : "s"}`
    else if (c.serviceMode === "concierge" && agreementsComplete && intro?.status === "requested") staffNextStep = "Schedule intro call"
    else if (c.serviceMode === "concierge" && agreementsComplete && !intro?.scheduled_at) staffNextStep = "Book the intro call"
    else if (overdueTasks.has(c.id)) staffNextStep = overdueTasks.get(c.id)?.title ?? "Complete overdue task"

    let thirdPartyNextStep: string | null = null
    if ((ref?.open ?? 0) > 0) thirdPartyNextStep = `${ref?.notarized ?? 0} of ${ref?.total ?? 0} references notarized`
    else if (cohabitantCount > 0) thirdPartyNextStep = cohabitantCount === 1 ? "Cohabitant affidavit not opened" : `${cohabitantCount} cohabitant affidavits pending`
    else if (booking) thirdPartyNextStep = `Instructor confirmation · ${new Date(booking.starts_at).toLocaleDateString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })}`

    let applicantNextStep = defaultApplicantStep(c, openRequirements, intake?.current_step ?? null, !!intake?.completed_at)
    if (c.serviceMode === "concierge" && !agreementsComplete) applicantNextStep = "Sign service agreements"
    const ownership = deriveCaseOwnership(
      { stage: c.stage, licenseIssuedOn: c.licenseIssuedOn, licenseExpiresOn: c.licenseExpiresOn },
      { nextAppointment: nextAppointment.get(c.id), staffNextStep, thirdPartyNextStep, applicantNextStep }
    )

    const pending = pendingPayment.get(c.id)
    const lastActivityAt = latest([c.updatedAt, intake?.updated_at, ...(activity.get(c.id) ?? [])], c.updatedAt)
    const inactivityDays = daysSince(lastActivityAt, now)
    const duplicate = duplicates.get(c.id) ?? { duplicate: false, hidden: false, label: null }
    const group = leadGroup(c, !!pending, inactivityDays)
    const pendingAmount = pending
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: pending.currency.toUpperCase(), maximumFractionDigits: 0 }).format(pending.amount_cents / 100)
      : null
    const lastStep: Record<LeadGroupKey, string> = {
      new: c.stage === "lead" ? "Signed up" : stageMeta(c.stage).short,
      screened: "Eligibility checked",
      package: serviceInfo.key ? `${serviceInfo.label} selected` : "Payment started",
      quiet: "No recent activity",
    }
    const firstProgressStage = stageIndex("signed_up_paid")
    const progressStep = Math.max(1, Math.min(11, stageIndex(c.stage) - firstProgressStage + 1))

    return {
      id: c.id,
      clientName: c.clientName,
      trackKey: track.key,
      trackLabel: track.label,
      serviceKey: serviceInfo.key,
      serviceLabel: serviceInfo.label,
      stage: c.stage,
      stageLabel: stageMeta(c.stage).short,
      nextStep: ownership.nextStep,
      whoseMove: ownership.whoseMove,
      days: paid ? days : inactivityDays,
      stalled,
      nypdControlled,
      qaSignedOff: !!c.qaSignedOffBy,
      ownerId: c.assignedStaff,
      ownerName,
      ownerInitials: ownerInitials(ownerName),
      isDemo: c.isDemo,
      isDuplicate: duplicate.duplicate,
      duplicateLabel: duplicate.label,
      pendingAmount,
      lastStep: lastStep[group],
      progressStep,
      classification: paid ? "active" : "leads",
      phase: activePhase(c.stage),
      leadGroup: group,
      hiddenDuplicate: duplicate.hidden,
    }
  })

  const defaultVisible = cards.filter((card) => !card.isDemo && !(duplicates.get(card.id)?.hidden ?? false))
  const activeCount = defaultVisible.filter((card) => card.classification === "active").length
  const leadCount = defaultVisible.filter((card) => card.classification === "leads").length
  const inView = cards.filter((card) => card.classification === view)
  const filteredAll = inView.filter((card) => matchesFilters(card, filters))
  const hidden = {
    test: filteredAll.filter((card) => card.isDemo).length,
    duplicate: filteredAll.filter((card) => !card.isDemo && (duplicates.get(card.id)?.hidden ?? false)).length,
  }
  const visible = filteredAll.filter((card) => showHidden || (!card.isDemo && !(duplicates.get(card.id)?.hidden ?? false)))
  const unfilteredVisibleCount = inView.filter((card) => !card.isDemo && !(duplicates.get(card.id)?.hidden ?? false)).length

  const sorted = (rows: typeof visible) => [...rows].sort((a, b) => {
    if (a.stalled !== b.stalled) return a.stalled ? -1 : 1
    return b.days - a.days || a.clientName.localeCompare(b.clientName)
  })

  const columns: PipelineColumn[] = view === "active"
    ? ACTIVE_PHASES.map((phase) => {
      const phaseCards = sorted(visible.filter((card) => card.phase === phase.key))
      return {
        key: phase.key,
        label: phase.label,
        subtitle: null,
        tone: phase.tone,
        cards: phaseCards,
        stageCounts: phase.stages.map((stage) => ({ key: stage, label: stageMeta(stage).short, count: phaseCards.filter((card) => card.stage === stage).length })),
        multiStage: phase.stages.length > 1,
        stalledCount: phaseCards.filter((card) => card.stalled).length,
      }
    })
    : LEAD_GROUPS.map((group) => ({
      key: group.key,
      label: group.label,
      subtitle: group.subtitle,
      tone: group.tone,
      cards: sorted(visible.filter((card) => card.leadGroup === group.key)),
      stageCounts: [],
      multiStage: false,
      stalledCount: 0,
    }))

  return {
    view,
    columns,
    activeCount,
    leadCount,
    currentCount: visible.length,
    unfilteredVisibleCount,
    hidden,
    stalledCount: visible.filter((card) => card.stalled).length,
    showHidden,
    isFiltered: isFiltered(filters),
    filters,
    staff,
    asOf: now.toISOString(),
    allCards: cards,
  }
}

export const pipelineModel = {
  activePhase,
  leadGroup,
  applicationTrack,
  duplicateMetadata: duplicateCaseMetadata,
  matchesFilters,
  activePhases: ACTIVE_PHASES,
  leadGroups: LEAD_GROUPS,
  applicationTypeLabels: APPLICATION_TYPE_LABELS,
  caseStages: CASE_STAGES,
}
