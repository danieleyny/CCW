import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { BrandKey } from "@/config/brands"
import { CASE_STAGES, isNypdControlled, stageIndex, type CaseStageKey } from "@/config/stages"
import {
  DOCUMENT_REVIEW_BUSINESS_DAYS,
  MESSAGE_REPLY_BUSINESS_DAYS,
  QA_SIGNOFF_DAYS,
  STAGE_TARGET_DAYS,
} from "@/config/service-targets"
import { duplicateCaseMetadata } from "@/lib/admin/case-visibility"
import { deriveCaseOwnership } from "@/lib/admin/ownership"
import { paidCaseIds } from "@/lib/packages"
import type { Database, Json } from "@/lib/supabase/types"
import {
  buildStageVisits,
  businessDurationDays,
  distribution,
  friendlyLeadSource,
  inRange,
  reportRange,
  type ReportRangeKey,
  type StageVisit,
} from "@/lib/admin/reports-model"

type DB = SupabaseClient<Database>

export type ReportTab = "overview" | "bottlenecks" | "service"
export type ReportServiceFilter = "all" | "concierge" | "self_guided"
export type ReportTrackFilter = "all" | "resident" | "business" | "non_resident"
export type ReportBrandFilter = "all" | BrandKey

export interface ReportFilters {
  range: ReportRangeKey
  service: ReportServiceFilter
  track: ReportTrackFilter
  brand: ReportBrandFilter
  compare: boolean
  showHidden: boolean
  isAdmin: boolean
}

export interface MetricValue {
  label: string
  value: number
  prior: number | null
  kind: "number" | "percent" | "money"
  note?: string | null
}

export interface StageMetric {
  key: CaseStageKey
  label: string
  short: string
  median: number | null
  q25: number | null
  q75: number | null
  n: number
  target: number | null
  nypd: boolean
  applicant: number
  staff: number
  unknown: number
}

export interface FunnelRow {
  label: "Leads" | "Paid" | "Filed" | "Licensed"
  count: number
  percent: number
}

export interface ReportContext {
  filters: ReportFilters
  rangeLabel: string
  hidden: { tests: number; duplicates: number }
  includingHidden: boolean
  errors: string[]
}

export interface OverviewReportData extends ReportContext {
  tab: "overview"
  metrics: MetricValue[]
  funnel: FunnelRow[]
  services: Array<{ key: "concierge" | "self_guided"; label: string; clients: number; bookedCents: number; comps: number }>
  brands: Array<{ key: BrandKey; label: string; leads: number; paid: number; collectedCents: number; stageCounts: number }>
  upgrades: { count: number; collectedCents: number }
  leadSources: Array<{ label: string; count: number }>
  rawLeadSources: Array<{ value: string; count: number }>
  stages: StageMetric[]
  tooLittleData: boolean
  exportRows: Array<[string, string | number]>
}

export interface BottlenecksReportData extends ReportContext {
  tab: "bottlenecks"
  stages: StageMetric[]
  slowdown: StageMetric | null
  funnel: FunnelRow[]
  tooLittleData: boolean
  exportRows: Array<[string, string | number]>
}

export interface ServiceMetric {
  key: "reply" | "documents" | "qa"
  label: string
  median: number | null
  n: number
  open: number
  target: number
  withinPercent: number | null
  trackingStarted: string | null
  trackingPending: boolean
}

export interface StaffServiceRow {
  id: string
  name: string
  replies: number
  replyMedian: number | null
  documents: number
  documentMedian: number | null
}

export interface ServiceLevelsReportData extends ReportContext {
  tab: "service"
  metrics: ServiceMetric[]
  staff: StaffServiceRow[]
  exportRows: Array<[string, string | number]>
}

interface RawCase {
  id: string
  clientId: string
  clientName: string
  clientEmail: string | null
  track: ReportTrackFilter
  leadSource: string | null
  assignedStaff: string | null
  stage: CaseStageKey
  serviceMode: "concierge" | "self_guided" | null
  brand: BrandKey
  brandOrigin: BrandKey
  createdAt: string
  updatedAt: string
  isDemo: boolean
  licenseIssuedOn: string | null
  licenseExpiresOn: string | null
}

interface RawPayment {
  id: string
  caseId: string | null
  amountCents: number
  status: string
  paidAt: string | null
  createdAt: string
  updatedAt: string
  brand: BrandKey
}

interface RawBrandTransfer {
  caseId: string
  paymentId: string | null
  createdAt: string
}

interface RawActivity {
  id: string
  caseId: string | null
  action: string
  createdAt: string
  actor: string | null
  entityId: string | null
  detail: Record<string, unknown>
}

interface BaseData extends ReportContext {
  cases: RawCase[]
  payments: RawPayment[]
  activities: RawActivity[]
  paidIds: Set<string>
  visits: StageVisit[]
  transfers: RawBrandTransfer[]
  range: ReturnType<typeof reportRange>
}

function detailObject(value: Json): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function mapCases(rows: unknown[]): RawCase[] {
  return rows.map((value) => {
    const row = value as {
      id: string
      client_id: string
      stage: CaseStageKey
      service_mode: "concierge" | "self_guided" | null
      brand: BrandKey
      brand_origin: BrandKey
      created_at: string
      updated_at: string
      is_demo: boolean
      license_issued_on: string | null
      license_expires_on: string | null
      clients: { full_name: string; email: string | null; track: ReportTrackFilter; lead_source: string | null; assigned_staff: string | null }
    }
    return {
      id: row.id,
      clientId: row.client_id,
      clientName: row.clients.full_name,
      clientEmail: row.clients.email,
      track: row.clients.track,
      leadSource: row.clients.lead_source,
      assignedStaff: row.clients.assigned_staff,
      stage: row.stage,
      serviceMode: row.service_mode,
      brand: row.brand,
      brandOrigin: row.brand_origin,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isDemo: row.is_demo,
      licenseIssuedOn: row.license_issued_on,
      licenseExpiresOn: row.license_expires_on,
    }
  })
}

function matchesFilters(kase: RawCase, filters: ReportFilters) {
  if (filters.service !== "all" && kase.serviceMode !== filters.service) return false
  if (filters.track !== "all" && kase.track !== filters.track) return false
  if (filters.brand !== "all" && kase.brand !== filters.brand) return false
  return true
}

async function loadBase(db: DB, filters: ReportFilters, now = new Date()): Promise<BaseData> {
  const range = reportRange(filters.range, now)
  const caseResult = await db
    .from("cases")
    .select("id, client_id, stage, service_mode, brand, brand_origin, created_at, updated_at, is_demo, license_issued_on, license_expires_on, clients!inner(full_name, email, track, lead_source, assigned_staff)")
    .order("created_at", { ascending: true })
  if (caseResult.error) throw new Error(`Cases: ${caseResult.error.message}`)

  const allCases = mapCases((caseResult.data ?? []) as unknown[])
  const duplicates = duplicateCaseMetadata(allCases.map((kase) => ({
    id: kase.id,
    clientId: kase.clientId,
    clientEmail: kase.clientEmail,
    updatedAt: kase.updatedAt,
  })))
  const hidden = {
    tests: allCases.filter((kase) => kase.isDemo).length,
    duplicates: allCases.filter((kase) => !kase.isDemo && duplicates.get(kase.id)?.hidden).length,
  }
  const includeHidden = filters.isAdmin && filters.showHidden
  const cases = allCases.filter((kase) => matchesFilters(kase, filters)).filter((kase) => (
    includeHidden || (!kase.isDemo && !duplicates.get(kase.id)?.hidden)
  ))
  const caseIds = cases.map((kase) => kase.id)
  const errors: string[] = []
  if (!caseIds.length) {
    return {
      filters,
      rangeLabel: range.label,
      hidden,
      includingHidden: includeHidden,
      errors,
      cases,
      payments: [],
      activities: [],
      paidIds: new Set(),
      visits: [],
      transfers: [],
      range,
    }
  }

  const [paymentResult, activityResult, paidResult, transferResult] = await Promise.all([
    db.from("payments").select("id, case_id, amount_cents, status, paid_at, created_at, updated_at, brand").in("case_id", caseIds).order("created_at", { ascending: true }),
    db.from("activity_log").select("id, case_id, action, created_at, actor, entity_id, detail").in("case_id", caseIds).in("action", ["case.stage_advanced", "case.stage_auto_advanced", "case.license_issued", "case.qa_signed_off", "document.reviewed"]).order("created_at", { ascending: true }),
    paidCaseIds(db, caseIds).catch(() => null),
    db.from("brand_transfers").select("case_id, payment_id, created_at").in("case_id", caseIds).eq("reason", "upgrade_to_concierge"),
  ])
  if (paymentResult.error) errors.push("payments")
  if (activityResult.error) errors.push("activity history")
  if (!paidResult) errors.push("paid status")
  if (transferResult.error) errors.push("brand upgrades")

  const payments: RawPayment[] = (paymentResult.data ?? []).map((row) => ({
    id: row.id,
    caseId: row.case_id,
    amountCents: row.amount_cents,
    status: row.status,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    brand: row.brand,
  }))
  const transfers: RawBrandTransfer[] = (transferResult.data ?? []).map((row) => ({
    caseId: row.case_id,
    paymentId: row.payment_id,
    createdAt: row.created_at,
  }))
  const activities: RawActivity[] = (activityResult.data ?? []).map((row) => ({
    id: row.id,
    caseId: row.case_id,
    action: row.action,
    createdAt: row.created_at,
    actor: row.actor,
    entityId: row.entity_id,
    detail: detailObject(row.detail),
  }))
  const stageEvents = activities.filter((row) => row.action === "case.stage_advanced" || row.action === "case.stage_auto_advanced")
  const visits = buildStageVisits(
    cases.map((kase) => ({ id: kase.id, createdAt: kase.createdAt })),
    stageEvents.filter((row) => row.caseId).map((row) => ({
      caseId: row.caseId!,
      createdAt: row.createdAt,
      actor: row.actor,
      detail: row.detail,
      to: row.detail.to,
    })),
  )
  return {
    filters,
    rangeLabel: range.label,
    hidden,
    includingHidden: includeHidden,
    errors,
    cases,
    payments,
    activities,
    paidIds: paidResult ?? new Set(),
    visits,
    transfers,
    range,
  }
}

function firstPaidByCase(payments: RawPayment[]) {
  const first = new Map<string, RawPayment>()
  for (const payment of payments) {
    if (payment.status !== "paid" || !payment.caseId || !payment.paidAt) continue
    const current = first.get(payment.caseId)
    if (!current || payment.paidAt < (current.paidAt ?? "")) first.set(payment.caseId, payment)
  }
  return first
}

function licenseDate(kase: RawCase, activities: RawActivity[]) {
  const logged = activities.find((row) => row.caseId === kase.id && row.action === "case.license_issued")?.createdAt
  return logged ?? kase.licenseIssuedOn
}

function collectedFor(payments: RawPayment[], start: Date | null, end: Date, caseIds?: Set<string>) {
  let collected = 0
  let comps = 0
  for (const payment of payments) {
    if (!payment.caseId || (caseIds && !caseIds.has(payment.caseId))) continue
    const when = payment.paidAt ?? payment.updatedAt ?? payment.createdAt
    if (!inRange(when, start, end)) continue
    if (payment.status === "paid" && payment.amountCents > 0) collected += payment.amountCents
    if (payment.status === "paid" && payment.amountCents === 0) comps += 1
    if (payment.status === "refunded" && payment.amountCents > 0) collected -= payment.amountCents
  }
  return { collected: Math.max(0, collected), comps }
}

function metricSet(base: BaseData, start: Date | null, end: Date) {
  const firstPaid = firstPaidByCase(base.payments)
  const leads = base.cases.filter((kase) => inRange(kase.createdAt, start, end))
  const becamePaid = [...firstPaid.values()].filter((payment) => inRange(payment.paidAt, start, end)).length
  const leadPaid = leads.filter((kase) => base.paidIds.has(kase.id)).length
  const { collected, comps } = collectedFor(base.payments, start, end)
  const licensed = base.cases.filter((kase) => inRange(licenseDate(kase, base.activities), start, end)).length
  return {
    leads: leads.length,
    becamePaid,
    leadToPaid: leads.length ? Math.round((leadPaid / leads.length) * 100) : 0,
    collected,
    comps,
    licensed,
  }
}

function funnelFor(base: BaseData) {
  const leads = base.cases.filter((kase) => inRange(kase.createdAt, base.range.start, base.range.end))
  const filedIds = new Set(base.activities.filter((activity) => (
    activity.caseId
    && (activity.action === "case.stage_advanced" || activity.action === "case.stage_auto_advanced")
    && typeof activity.detail.to === "string"
    && stageIndex(activity.detail.to as CaseStageKey) >= stageIndex("filed")
  )).map((activity) => activity.caseId!))
  const counts = [
    leads.length,
    leads.filter((kase) => base.paidIds.has(kase.id)).length,
    leads.filter((kase) => filedIds.has(kase.id)).length,
    leads.filter((kase) => !!licenseDate(kase, base.activities)).length,
  ]
  return (["Leads", "Paid", "Filed", "Licensed"] as const).map((label, index) => ({
    label,
    count: counts[index],
    percent: counts[0] ? Math.round((counts[index] / counts[0]) * 100) : 0,
  }))
}

function stageMetrics(base: BaseData): StageMetric[] {
  const allowed = new Set(CASE_STAGES.slice(stageIndex("signed_up_paid"), stageIndex("under_investigation") + 1).map((stage) => stage.key))
  const stageTargets: Partial<Record<CaseStageKey, number>> = STAGE_TARGET_DAYS
  return CASE_STAGES.filter((stage) => allowed.has(stage.key)).map((stage) => {
    const rows = base.visits.filter((visit) => visit.stage === stage.key && inRange(visit.endedAt, base.range.start, base.range.end))
    const stats = distribution(rows.map((row) => row.days))
    let applicant = 0
    let staff = 0
    let unknown = 0
    for (const row of rows) {
      if (isNypdControlled(stage.key)) continue
      try {
        const historicalOwner = row.detail.on_behalf === true
          ? "staff"
          : row.detail.owner === "applicant" || row.detail.waited_on === "applicant"
            ? "applicant"
            : null
        if (!historicalOwner) {
          unknown += 1
          continue
        }
        const ownership = deriveCaseOwnership(
          { stage: stage.key },
          historicalOwner === "staff" ? { staffNextStep: "Staff completed the stage" } : { applicantNextStep: "Applicant completed the stage" },
        )
        if (ownership.whoseMove === "Staff") staff += 1
        else if (ownership.whoseMove === "Applicant") applicant += 1
        else unknown += 1
      } catch {
        unknown += 1
      }
    }
    return {
      key: stage.key,
      label: stage.label,
      short: stage.short,
      ...stats,
      target: stageTargets[stage.key] ?? null,
      nypd: isNypdControlled(stage.key),
      applicant,
      staff,
      unknown,
    }
  })
}

function rawSources(cases: RawCase[]) {
  const counts = new Map<string, number>()
  for (const kase of cases) {
    const value = kase.leadSource?.trim() || "(null)"
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

export async function loadOverviewReport(db: DB, filters: ReportFilters, now = new Date()): Promise<OverviewReportData> {
  const base = await loadBase(db, filters, now)
  const current = metricSet(base, base.range.start, base.range.end)
  const prior = filters.compare && base.range.priorStart && base.range.priorEnd
    ? metricSet(base, base.range.priorStart, base.range.priorEnd)
    : null
  const metrics: MetricValue[] = [
    { label: "New leads", value: current.leads, prior: prior?.leads ?? null, kind: "number" },
    { label: "Became paid clients", value: current.becamePaid, prior: prior?.becamePaid ?? null, kind: "number" },
    { label: "Lead → paid", value: current.leadToPaid, prior: prior?.leadToPaid ?? null, kind: "percent", note: "of leads created in the period" },
    { label: "Collected", value: current.collected, prior: prior?.collected ?? null, kind: "money", note: current.comps ? `${current.comps} comp${current.comps === 1 ? "" : "s"} not counted` : null },
    { label: "Licensed", value: current.licensed, prior: prior?.licensed ?? null, kind: "number" },
  ]
  const firstPaid = firstPaidByCase(base.payments)
  const services = (["concierge", "self_guided"] as const).map((key) => {
    const ids = new Set(base.cases.filter((kase) => kase.serviceMode === key && inRange(firstPaid.get(kase.id)?.paidAt, base.range.start, base.range.end)).map((kase) => kase.id))
    const money = collectedFor(base.payments, base.range.start, base.range.end, ids)
    return { key, label: key === "concierge" ? "Full Concierge" : "Self-guided", clients: ids.size, bookedCents: money.collected, comps: money.comps }
  })
  const brands = (["gln", "fl"] as const).map((key) => {
    const brandCases = base.cases.filter((kase) => kase.brandOrigin === key)
    const brandCaseIds = new Set(brandCases.map((kase) => kase.id))
    const leads = brandCases.filter((kase) => inRange(kase.createdAt, base.range.start, base.range.end)).length
    const paid = [...firstPaid.values()].filter((payment) => payment.brand === key && inRange(payment.paidAt, base.range.start, base.range.end)).length
    const collectedCents = collectedFor(base.payments.filter((payment) => payment.brand === key), base.range.start, base.range.end).collected
    return {
      key,
      label: key === "gln" ? "Gun License NYC" : "Firearm License NYC",
      leads,
      paid,
      collectedCents,
      stageCounts: brandCaseIds.size,
    }
  })
  const paymentById = new Map(base.payments.map((payment) => [payment.id, payment]))
  const periodUpgrades = base.transfers.filter((transfer) => inRange(transfer.createdAt, base.range.start, base.range.end))
  const upgrades = {
    count: periodUpgrades.length,
    collectedCents: periodUpgrades.reduce((sum, transfer) => {
      const payment = transfer.paymentId ? paymentById.get(transfer.paymentId) : null
      return sum + (payment?.status === "paid" ? payment.amountCents : 0)
    }, 0),
  }
  const leads = base.cases.filter((kase) => inRange(kase.createdAt, base.range.start, base.range.end))
  const sourceCounts = new Map<string, number>()
  for (const kase of leads) {
    const label = friendlyLeadSource(kase.leadSource)
    sourceCounts.set(label, (sourceCounts.get(label) ?? 0) + 1)
  }
  const leadSources = [...sourceCounts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  const stages = stageMetrics(base)
  return {
    tab: "overview",
    filters: base.filters,
    rangeLabel: base.rangeLabel,
    hidden: base.hidden,
    includingHidden: base.includingHidden,
    errors: base.errors,
    metrics,
    funnel: funnelFor(base),
    services,
    brands,
    upgrades,
    leadSources,
    rawLeadSources: rawSources(leads),
    stages,
    tooLittleData: current.leads < 5,
    exportRows: [
      ...metrics.map((metric) => [metric.label, metric.kind === "money" ? metric.value / 100 : metric.value] as [string, string | number]),
      ...brands.flatMap((brand) => [
        [`${brand.label} new leads`, brand.leads] as [string, string | number],
        [`${brand.label} became paid`, brand.paid] as [string, string | number],
        [`${brand.label} collected`, brand.collectedCents / 100] as [string, string | number],
        [`${brand.label} active cases`, brand.stageCounts] as [string, string | number],
      ]),
      ["FL → GLN upgrades", upgrades.count],
      ["FL → GLN upgrade revenue", upgrades.collectedCents / 100],
      ...stages.map((stage) => [`${stage.label} median days`, stage.median ?? "Not enough data"] as [string, string | number]),
    ],
  }
}

export async function loadBottlenecksReport(db: DB, filters: ReportFilters, now = new Date()): Promise<BottlenecksReportData> {
  const base = await loadBase(db, filters, now)
  const stages = stageMetrics(base)
  const slowdown = stages
    .filter((stage) => !stage.nypd && stage.target !== null && stage.median !== null && stage.n >= 5 && stage.median > stage.target)
    .sort((a, b) => (b.median! - b.target!) - (a.median! - a.target!))[0] ?? null
  const funnel = funnelFor(base)
  const leads = funnel[0]?.count ?? 0
  return {
    tab: "bottlenecks",
    filters: base.filters,
    rangeLabel: base.rangeLabel,
    hidden: base.hidden,
    includingHidden: base.includingHidden,
    errors: base.errors,
    stages,
    slowdown,
    funnel,
    tooLittleData: leads < 5,
    exportRows: [
      ...(slowdown ? [["Biggest slowdown", slowdown.label], ["Slowdown median days", slowdown.median ?? ""]] as Array<[string, string | number]> : [["Biggest slowdown", "None over target"]] as Array<[string, string | number]>),
      ...stages.map((stage) => [`${stage.label} median days`, stage.median ?? "Not enough data"] as [string, string | number]),
    ],
  }
}

function serviceMetric(key: ServiceMetric["key"], label: string, target: number, completed: number[], open: number, trackingStarted: string | null = null): ServiceMetric {
  const medianValue = distribution(completed).median
  const within = completed.length ? Math.round((completed.filter((value) => value <= target).length / completed.length) * 100) : null
  return {
    key,
    label,
    median: medianValue,
    n: completed.length,
    open,
    target,
    withinPercent: within,
    trackingStarted,
    trackingPending: key === "documents" && completed.length < 5,
  }
}

export async function loadServiceLevelsReport(db: DB, filters: ReportFilters, now = new Date()): Promise<ServiceLevelsReportData> {
  const base = await loadBase(db, filters, now)
  const caseIds = base.cases.map((kase) => kase.id)
  if (!caseIds.length) {
    const metrics = [
      serviceMetric("reply", "Reply to client", MESSAGE_REPLY_BUSINESS_DAYS, [], 0),
      serviceMetric("documents", "Document review", DOCUMENT_REVIEW_BUSINESS_DAYS, [], 0),
      serviceMetric("qa", "Final QA sign-off", QA_SIGNOFF_DAYS, [], 0),
    ]
    return { ...base, tab: "service", metrics, staff: [], exportRows: metrics.map((metric) => [metric.label, "Not enough data"]) }
  }

  const [messageResult, documentResult, profileResult] = await Promise.all([
    db.from("messages").select("id, case_id, sender_id, created_at, staff_only").in("case_id", caseIds).eq("staff_only", false).order("created_at", { ascending: true }),
    db.from("documents").select("id, case_id, created_at, status").in("case_id", caseIds),
    db.from("profiles").select("id, full_name, role").in("role", ["client", "staff", "admin"]),
  ])
  const errors = [...base.errors]
  if (messageResult.error) errors.push("message response times")
  if (documentResult.error) errors.push("document review times")
  if (profileResult.error) errors.push("staff names")

  const profiles = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile]))
  const messages = messageResult.data ?? []
  const replyCompleted: Array<{ days: number; staffId: string }> = []
  let replyOpen = 0
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]
    if (profiles.get(message.sender_id ?? "")?.role !== "client") continue
    const reply = messages.slice(index + 1).find((candidate) => (
      candidate.case_id === message.case_id
      && ["staff", "admin"].includes(profiles.get(candidate.sender_id ?? "")?.role ?? "")
    ))
    if (reply && inRange(reply.created_at, base.range.start, base.range.end)) {
      replyCompleted.push({ days: businessDurationDays(message.created_at, reply.created_at), staffId: reply.sender_id ?? "unknown" })
    } else if (!reply && inRange(message.created_at, base.range.start, base.range.end)) {
      replyOpen += 1
    }
  }

  const documentById = new Map((documentResult.data ?? []).map((document) => [document.id, document]))
  const reviewLogs = base.activities.filter((row) => row.action === "document.reviewed" && row.entityId)
  const docCompleted: Array<{ days: number; staffId: string }> = []
  for (const log of reviewLogs) {
    const document = documentById.get(log.entityId!)
    if (!document || !inRange(log.createdAt, base.range.start, base.range.end)) continue
    docCompleted.push({ days: businessDurationDays(document.created_at, log.createdAt), staffId: log.actor ?? "unknown" })
  }
  const reviewedIds = new Set(reviewLogs.map((log) => log.entityId))
  const docOpen = (documentResult.data ?? []).filter((document) => document.status === "pending" && inRange(document.created_at, base.range.start, base.range.end) && !reviewedIds.has(document.id)).length
  const trackingStarted = reviewLogs.map((log) => log.createdAt).sort()[0] ?? "2026-11-19T05:00:00.000Z"

  const stageEvents = base.activities.filter((row) => (
    (row.action === "case.stage_advanced" || row.action === "case.stage_auto_advanced")
    && row.detail.to === "application_assembled"
    && row.caseId
  ))
  const qaLogs = base.activities.filter((row) => row.action === "case.qa_signed_off" && row.caseId)
  const qaCompleted: Array<{ days: number; staffId: string }> = []
  let qaOpen = 0
  for (const start of stageEvents) {
    const end = qaLogs.find((log) => log.caseId === start.caseId && log.createdAt >= start.createdAt)
    if (end && inRange(end.createdAt, base.range.start, base.range.end)) {
      qaCompleted.push({ days: businessDurationDays(start.createdAt, end.createdAt), staffId: end.actor ?? "unknown" })
    } else if (!end && inRange(start.createdAt, base.range.start, base.range.end)) {
      qaOpen += 1
    }
  }

  const metrics = [
    serviceMetric("reply", "Reply to client", MESSAGE_REPLY_BUSINESS_DAYS, replyCompleted.map((row) => row.days), replyOpen),
    serviceMetric("documents", "Document review", DOCUMENT_REVIEW_BUSINESS_DAYS, docCompleted.map((row) => row.days), docOpen, trackingStarted),
    serviceMetric("qa", "Final QA sign-off", QA_SIGNOFF_DAYS, qaCompleted.map((row) => row.days), qaOpen),
  ]
  const staffIds = new Set([...replyCompleted.map((row) => row.staffId), ...docCompleted.map((row) => row.staffId)])
  const staff = [...staffIds].map((id) => {
    const replies = replyCompleted.filter((row) => row.staffId === id)
    const documents = docCompleted.filter((row) => row.staffId === id)
    return {
      id,
      name: profiles.get(id)?.full_name || "Unknown staff member",
      replies: replies.length,
      replyMedian: distribution(replies.map((row) => row.days)).median,
      documents: documents.length,
      documentMedian: distribution(documents.map((row) => row.days)).median,
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
  return {
    tab: "service",
    filters: base.filters,
    rangeLabel: base.rangeLabel,
    hidden: base.hidden,
    includingHidden: base.includingHidden,
    errors,
    metrics,
    staff,
    exportRows: metrics.flatMap((metric) => [
      [`${metric.label} median business days`, metric.median ?? "Not enough data"] as [string, string | number],
      [`${metric.label} within target`, metric.withinPercent === null ? "Not enough data" : `${metric.withinPercent}%`] as [string, string | number],
      [`${metric.label} still open`, metric.open] as [string, string | number],
    ]),
  }
}
