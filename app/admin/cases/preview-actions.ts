"use server"

import { z } from "zod"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { evaluatePreFilingGate } from "@/lib/qa-gate"
import { loadPipeline } from "@/lib/admin/pipeline"
import { deriveCaseOwnership, type CaseMoveOwner } from "@/lib/admin/today"
import { stageIndex, stageMeta, type CaseStageKey } from "@/config/stages"
import { APPLICATION_TYPE_LABELS, type ApplicationType } from "@/lib/application-types"

const caseIdSchema = z.string().uuid()

export interface CasePreviewOpenBox {
  label: string
  count: number
  titles: string[]
  items: Array<{ id: string; title: string }>
}

export interface CasePreviewData {
  id: string
  clientName: string
  initials: string
  email: string | null
  phone: string | null
  ownerName: string | null
  trackLabel: string
  serviceLabel: string
  openedAt: string
  stage: CaseStageKey
  stageLabel: string
  phaseLabel: string
  days: number
  stalled: boolean
  progressStep: number
  whoseMove: CaseMoveOwner
  nextStep: string
  nextHref: string
  nextAction: string
  isLead: boolean
  leadGroup: string | null
  lastStep: string | null
  pendingAmount: string | null
  paymentStatus: string
  openBeforeFiling: {
    total: number
    boxes: CasePreviewOpenBox[]
    gate: { passes: boolean; blockerCount: number } | null
  } | null
  activity: Array<{ id: string; at: string; line: string }>
  jump: Array<{ key: string; label: string; summary: string; href: string; alert: boolean }>
}

const PHASES: Array<{ label: string; stages: CaseStageKey[] }> = [
  { label: "Getting started", stages: ["lead", "eligibility_screened", "signed_up_paid"] },
  { label: "Training", stages: ["training_scheduled", "training_complete"] },
  { label: "Paperwork", stages: ["document_collection", "notarization"] },
  { label: "Filing", stages: ["application_assembled", "filed"] },
  { label: "With NYPD", stages: ["fingerprinting_booked", "under_investigation", "decision"] },
  { label: "Licensed", stages: ["licensed"] },
]

function phaseLabel(stage: CaseStageKey) {
  return PHASES.find((phase) => phase.stages.includes(stage))?.label ?? "Case"
}

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "A"
}

function daysSince(value: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000))
}

function safeActivityLine(action: string, entity: string | null) {
  const value = action.toLowerCase()
  if (value.includes("note") || value.includes("disclosure") || value.includes("ssn") || entity === "case_note") return null
  if (value.includes("upload") || (entity === "document" && value.includes("created"))) return "Uploaded a document"
  if (entity === "document" || value.includes("document")) return "Document review updated"
  if (value.includes("message")) return "Message sent"
  if (value.includes("stage")) return "Case stage updated"
  if (value.includes("requirement")) return "Checklist item updated"
  if (value.includes("payment") || entity === "payment") return "Payment status updated"
  if (value.includes("reference")) return "Reference progress updated"
  if (value.includes("cohabitant")) return "Cohabitant request updated"
  if (value.includes("training") || value.includes("booking")) return "Training progress updated"
  if (value.includes("intake")) return "Applicant details updated"
  if (value.includes("created") || value.includes("opened")) return "Case opened"
  return "Case activity recorded"
}

function nextDestination(caseId: string, whoseMove: CaseMoveOwner, nextStep: string) {
  const base = `/admin/cases/${caseId}`
  if (whoseMove !== "Staff") return { href: base, action: "Open case" }
  const value = nextStep.toLowerCase()
  if (value.includes("reply") || value.includes("message")) return { href: `${base}?tab=messages`, action: "Reply" }
  if (value.includes("document") || value.includes("upload") || value.includes("review")) return { href: `${base}?tab=checklist`, action: "Start review" }
  if (value.includes("qa") || value.includes("sign-off") || value.includes("sign off")) return { href: "/admin/queue?bucket=ready", action: "Review & sign" }
  if (value.includes("intro call")) return { href: `${base}?tab=application`, action: "Open intro call" }
  return { href: base, action: "Open case" }
}

function responseError(value: { error: unknown | null }, label: string) {
  if (value.error) throw new Error(`${label}: ${String((value.error as { message?: string }).message ?? value.error)}`)
}

export async function getCasePreview(caseIdInput: string): Promise<CasePreviewData> {
  const { userId } = await requireStaff()
  const caseId = caseIdSchema.parse(caseIdInput)
  const db = await createClient()
  const now = new Date()
  const [pipeline, kaseResult, requirementsResult, documentsResult, referencesResult, referenceRequestsResult, cohabitantsResult, messagesResult, trainingResult, paymentsResult, tasksResult, activityResult] = await Promise.all([
    loadPipeline(db, { view: "active", showHidden: true, filters: { track: "all", service: "all", assigned: "all", stalled: false, currentUserId: userId }, now }),
    db.from("cases").select("id, stage, status, opened_at, updated_at, stage_entered_at, application_type, license_track, service_mode, license_issued_on, license_expires_on, training_completed_on, training_expires_on, clients!inner(id, full_name, email, phone, track, assigned_staff)").eq("id", caseId).single(),
    db.from("case_requirements").select("id, status, document_id, reference_id, cohabitant_id, requirements!inner(title, blocking)").eq("case_id", caseId),
    db.from("documents").select("id, status, created_at").eq("case_id", caseId),
    db.from("character_references").select("id, notarized").eq("case_id", caseId),
    db.from("reference_requests").select("reference_id, status, revoked_at").eq("case_id", caseId),
    db.from("cohabitants").select("id, affidavit_status, sent_at, token_revoked_at").eq("case_id", caseId),
    db.from("messages").select("id, created_at, read, profiles:sender_id(role)").eq("case_id", caseId).is("engagement_id", null).order("created_at", { ascending: false }),
    db.from("training_sessions").select("class_date, range_date, passed, created_at").eq("case_id", caseId).order("created_at", { ascending: false }),
    db.from("payments").select("amount_cents, currency, status, created_at, paid_at").eq("case_id", caseId).order("created_at", { ascending: false }),
    db.from("tasks").select("id, status").eq("case_id", caseId),
    db.from("activity_log").select("id, action, entity, created_at").eq("case_id", caseId).order("created_at", { ascending: false }).limit(12),
  ])

  for (const [label, result] of [
    ["Case", kaseResult], ["Requirements", requirementsResult], ["Documents", documentsResult],
    ["References", referencesResult], ["Reference requests", referenceRequestsResult], ["Cohabitants", cohabitantsResult],
    ["Messages", messagesResult], ["Training", trainingResult], ["Payments", paymentsResult], ["Tasks", tasksResult], ["Activity", activityResult],
  ] as const) responseError(result, label)

  const kase = kaseResult.data
  if (!kase) throw new Error("Case not found")
  const client = kase.clients as unknown as { id: string; full_name: string; email: string | null; phone: string | null; track: string; assigned_staff: string | null }
  const card = pipeline.allCards.find((candidate) => candidate.id === caseId)
  const stage = kase.stage as CaseStageKey
  const ownerName = client.assigned_staff ? pipeline.staff.find((person) => person.id === client.assigned_staff)?.name ?? null : null
  const fallbackOwnership = deriveCaseOwnership(
    { stage, licenseIssuedOn: kase.license_issued_on, licenseExpiresOn: kase.license_expires_on },
    { applicantNextStep: kase.status === "closed" ? "Case closed" : stageMeta(stage).clientHint }
  )
  const whoseMove = kase.status === "closed" ? "Applicant" : card?.whoseMove ?? fallbackOwnership.whoseMove
  const nextStep = kase.status === "closed" ? "Case closed" : card?.nextStep ?? fallbackOwnership.nextStep
  const destination = nextDestination(caseId, whoseMove, nextStep)
  const applicationType = kase.application_type as ApplicationType | null
  const trackLabel = card?.trackLabel ?? (applicationType ? APPLICATION_TYPE_LABELS[applicationType].toUpperCase() : kase.license_track.replaceAll("_", " ").toUpperCase())
  const serviceLabel = card?.serviceLabel ?? (kase.service_mode === "concierge" ? "Concierge" : kase.service_mode === "self_guided" ? "Self-guided" : "No package")

  const documents = new Map((documentsResult.data ?? []).map((document) => [document.id, document]))
  const requests = new Map((referenceRequestsResult.data ?? []).filter((request) => !request.revoked_at).map((request) => [request.reference_id, request]))
  const cohabitants = new Map((cohabitantsResult.data ?? []).map((cohabitant) => [cohabitant.id, cohabitant]))
  const openRequirements = (requirementsResult.data ?? []).filter((row) => {
    const requirement = row.requirements as unknown as { blocking: boolean }
    return requirement.blocking && row.status !== "satisfied" && row.status !== "na"
  })
  const reviewItems: Array<{ id: string; title: string }> = []
  const applicantItems: Array<{ id: string; title: string }> = []
  const thirdPartyItems: Array<{ id: string; title: string }> = []
  for (const row of openRequirements) {
    const title = (row.requirements as unknown as { title: string }).title
    const document = row.document_id ? documents.get(row.document_id) : null
    const reference = row.reference_id ? requests.get(row.reference_id) : null
    const cohabitant = row.cohabitant_id ? cohabitants.get(row.cohabitant_id) : null
    const thirdPartyOpen = !!reference && ["sent", "opened"].includes(reference.status)
      || !!cohabitant && !!cohabitant.sent_at && !cohabitant.token_revoked_at && cohabitant.affidavit_status === "not_started"
    if (document?.status === "pending") reviewItems.push({ id: row.id, title })
    else if (thirdPartyOpen) thirdPartyItems.push({ id: row.id, title })
    else applicantItems.push({ id: row.id, title })
  }
  const boxes: CasePreviewOpenBox[] = [
    { label: "Staff to review", count: reviewItems.length, titles: reviewItems.slice(0, 3).map((item) => item.title), items: reviewItems.slice(0, 3) },
    { label: "Applicant to send", count: applicantItems.length, titles: applicantItems.slice(0, 3).map((item) => item.title), items: applicantItems.slice(0, 3) },
    { label: "Third party", count: thirdPartyItems.length, titles: thirdPartyItems.slice(0, 3).map((item) => item.title), items: thirdPartyItems.slice(0, 3) },
  ]
  const beforeFiled = stageIndex(stage) < stageIndex("filed")
  const isLead = card?.classification === "leads"
  const gateResult = stage === "application_assembled" ? await evaluatePreFilingGate(db, caseId) : null
  const openBeforeFiling = !isLead && beforeFiled ? {
    total: boxes.reduce((sum, box) => sum + box.count, 0),
    boxes,
    gate: gateResult ? { passes: gateResult.ok, blockerCount: gateResult.blockers.length } : null,
  } : null

  const safeActivity = (activityResult.data ?? []).flatMap((entry) => {
    const line = safeActivityLine(entry.action, entry.entity)
    return line ? [{ id: entry.id, at: entry.created_at, line }] : []
  }).slice(0, 3)
  const refs = referencesResult.data ?? []
  const referenceDone = refs.filter((reference) => reference.notarized).length
  const pendingDocuments = (documentsResult.data ?? []).filter((document) => document.status === "pending").length
  const unreadMessages = (messagesResult.data ?? []).filter((message) => {
    const profile = message.profiles as unknown as { role?: string } | null
    return profile?.role === "client" && !message.read
  }).length
  const lastMessage = messagesResult.data?.[0]?.created_at ?? null
  const requirementDone = (requirementsResult.data ?? []).filter((row) => row.status === "satisfied" || row.status === "na").length
  const requirementTotal = (requirementsResult.data ?? []).length
  const training = trainingResult.data?.[0]
  const trainingSummary = kase.training_completed_on
    ? `Complete · valid to ${new Date(kase.training_expires_on ?? kase.training_completed_on).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`
    : training?.class_date ? `Scheduled ${new Date(training.class_date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}` : "Not scheduled"
  const payments = paymentsResult.data ?? []
  const paidTotal = payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount_cents, 0)
  const pendingPayment = payments.find((payment) => payment.status === "pending")
  const money = (amount: number, currency = "usd") => new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(amount / 100)
  const paymentSummary = paidTotal > 0 ? "Paid in full" : pendingPayment ? `${money(pendingPayment.amount_cents, pendingPayment.currency)} requested` : "No payment requested"
  const openTasks = (tasksResult.data ?? []).filter((task) => task.status !== "done").length
  const base = `/admin/cases/${caseId}`
  const jump = [
    { key: "requirements", label: "Requirements", summary: `${requirementDone} of ${requirementTotal} done`, href: `${base}?tab=requirements`, alert: false },
    { key: "documents", label: "Documents", summary: `${pendingDocuments} to review`, href: `${base}?tab=documents`, alert: pendingDocuments > 0 },
    { key: "people", label: "People", summary: `${referenceDone} of ${refs.length} refs`, href: `${base}?tab=people`, alert: false },
    { key: "messages", label: "Messages", summary: unreadMessages > 0 ? `${unreadMessages} unread` : lastMessage ? `Last ${new Date(lastMessage).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "No messages", href: `${base}?tab=messages`, alert: unreadMessages > 0 },
    { key: "training", label: "Training", summary: trainingSummary, href: `${base}?tab=training`, alert: false },
    { key: "payments", label: "Payments", summary: paymentSummary, href: `/admin/payments?client=${client.id}`, alert: false },
    { key: "tasks", label: "Tasks", summary: `${openTasks} open`, href: `${base}?tab=tasks`, alert: false },
    { key: "activity", label: "Activity", summary: "Full history", href: `${base}?tab=activity`, alert: false },
  ]
  const pendingPaymentStatus = pendingPayment
    ? `Requested ${money(pendingPayment.amount_cents, pendingPayment.currency)} on ${new Date(pendingPayment.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : "No payment requested"

  return {
    id: caseId,
    clientName: client.full_name || "Applicant",
    initials: initials(client.full_name || "Applicant"),
    email: client.email,
    phone: client.phone,
    ownerName,
    trackLabel,
    serviceLabel,
    openedAt: kase.opened_at,
    stage,
    stageLabel: stageMeta(stage).short,
    phaseLabel: phaseLabel(stage),
    days: card?.days ?? daysSince(kase.stage_entered_at || kase.updated_at),
    stalled: card?.stalled ?? false,
    progressStep: card?.progressStep ?? Math.max(1, Math.min(11, stageIndex(stage) - stageIndex("signed_up_paid") + 1)),
    whoseMove,
    nextStep,
    nextHref: destination.href,
    nextAction: destination.action,
    isLead,
    leadGroup: isLead ? card?.leadGroup ?? null : null,
    lastStep: isLead ? card?.lastStep ?? null : null,
    pendingAmount: isLead ? card?.pendingAmount ?? null : null,
    paymentStatus: isLead ? pendingPaymentStatus : paymentSummary,
    openBeforeFiling,
    activity: safeActivity,
    jump,
  }
}
