import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { stageIndex, stageMeta, type CaseStageKey } from "@/config/stages"
import type { Database, Json } from "@/lib/supabase/types"
import { paidCaseIds } from "@/lib/packages"
import { etYear, median, privacyTiming, type PrivacyKind, type PrivacyStatus } from "@/lib/admin/privacy-model"

type DB = SupabaseClient<Database>

export interface PrivacyCountRequest {
  id: string
  caseId: string | null
  clientId: string | null
  requestedAt: string
  kind: PrivacyKind
  status: "open" | "acknowledged"
}

export interface PrivacyCounts {
  total: number
  access: number
  correction: number
  deletion: number
  oldestDays: number
  late: number
  requests: PrivacyCountRequest[]
}

export interface PrivacyRequestView {
  id: string
  caseId: string | null
  clientId: string | null
  kind: PrivacyKind
  status: PrivacyStatus
  requesterEmail: string
  detail: string | null
  requestedAt: string
  fulfilledAt: string | null
  resolutionNote: string | null
  clientName: string
  clientEmail: string | null
  caseRef: string | null
  caseLine: string
  path: string | null
  stage: string | null
  paid: boolean
  filed: boolean
  paymentCount: number
  caseErased: boolean
  timing: ReturnType<typeof privacyTiming>
}

export interface RetentionPolicyView {
  key: string
  label: string
  description: string | null
  action: string
  retainDays: number | null
  enabled: boolean
  notes: string | null
}

export interface ErasureLogView {
  id: string
  requestId: string | null
  caseId: string | null
  createdAt: string
  who: string
  caseRef: string
  actor: string
  note: string | null
  surfaces: Record<string, number>
}

export interface AdminPrivacyData {
  open: PrivacyRequestView[]
  closed: PrivacyRequestView[]
  selectedId: string | null
  counts: PrivacyCounts
  cards: {
    closedThisYear: number
    medianDaysToClose: number | null
    erasedThisYear: number
    latestErasure: string | null
  }
  policies: RetentionPolicyView[]
  activePolicies: number
  erasures: ErasureLogView[]
  isAdmin: boolean
  now: string
}

function asRecord(value: Json): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === "number"))
}

function pathLabel(applicationType: string | null, licenseTrack: string | null) {
  const key = applicationType ?? licenseTrack ?? ""
  const labels: Record<string, string> = {
    concealed_carry: "Concealed Carry",
    premise_residence: "Premise Residence",
    premise_business: "Premise Business",
    special_carry: "Special Carry",
    carry_guard: "Carry Guard",
    special_carry_guard: "Special Carry Guard",
    retired_leo: "Retired LEO",
    sponsored_unresolved: "Path pending",
  }
  return labels[key] ?? key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function displayNote(value: string | null) {
  return value?.replace(/\bcounsel\b/gi, "the owner") ?? null
}

export async function privacyCounts(db: DB, now = new Date()): Promise<PrivacyCounts> {
  const { data, error } = await db
    .from("data_requests")
    .select("id, case_id, client_id, requested_at, kind, status")
    .in("status", ["open", "acknowledged"])
    .order("requested_at", { ascending: true })
  if (error) throw new Error(`Privacy counts: ${error.message}`)

  const requests = (data ?? []).map((row) => ({
    id: row.id,
    caseId: row.case_id,
    clientId: row.client_id,
    requestedAt: row.requested_at,
    kind: row.kind as PrivacyKind,
    status: row.status as "open" | "acknowledged",
  }))
  const timings = requests.map((request) => privacyTiming(request.requestedAt, now))
  return {
    total: requests.length,
    access: requests.filter((request) => request.kind === "access").length,
    correction: requests.filter((request) => request.kind === "correction").length,
    deletion: requests.filter((request) => request.kind === "deletion").length,
    oldestDays: Math.max(0, ...timings.map((timing) => timing.days)),
    late: timings.filter((timing) => timing.late).length,
    requests,
  }
}

export async function loadAdminPrivacy(
  db: DB,
  { isAdmin, selectedId, now = new Date() }: { isAdmin: boolean; selectedId?: string | null; now?: Date },
): Promise<AdminPrivacyData> {
  const [requestResult, policyResult, erasureResult, counts] = await Promise.all([
    db.from("data_requests").select("id, case_id, client_id, kind, status, requester_email, detail, requested_at, fulfilled_at, resolution_note").order("requested_at", { ascending: false }),
    db.from("retention_policies").select("key, label, description, retain_days, enabled, action, notes").order("key"),
    db.from("data_erasure_log").select("id, case_id, client_id, data_request_id, actor, surfaces, note, created_at").order("created_at", { ascending: false }),
    privacyCounts(db, now),
  ])
  if (requestResult.error) throw new Error(`Privacy requests: ${requestResult.error.message}`)
  if (policyResult.error) throw new Error(`Retention policies: ${policyResult.error.message}`)
  if (erasureResult.error) throw new Error(`Erasure log: ${erasureResult.error.message}`)

  const rawRequests = requestResult.data ?? []
  const clientIds = [...new Set(rawRequests.map((row) => row.client_id).filter((id): id is string => !!id))]
  const caseIds = [...new Set(rawRequests.map((row) => row.case_id).filter((id): id is string => !!id))]
  const actorIds = [...new Set((erasureResult.data ?? []).map((row) => row.actor).filter((id): id is string => !!id))]

  const [clientResult, caseResult, paymentResult, actorResult, paidIds] = await Promise.all([
    clientIds.length ? db.from("clients").select("id, full_name, email").in("id", clientIds) : Promise.resolve({ data: [], error: null }),
    caseIds.length ? db.from("cases").select("id, nypd_app_ref, application_type, license_track, stage").in("id", caseIds) : Promise.resolve({ data: [], error: null }),
    caseIds.length ? db.from("payments").select("id, case_id").in("case_id", caseIds) : Promise.resolve({ data: [], error: null }),
    actorIds.length ? db.from("profiles").select("id, full_name").in("id", actorIds) : Promise.resolve({ data: [], error: null }),
    paidCaseIds(db, caseIds),
  ])
  if (clientResult.error) throw new Error(`Privacy clients: ${clientResult.error.message}`)
  if (caseResult.error) throw new Error(`Privacy cases: ${caseResult.error.message}`)
  if (paymentResult.error) throw new Error(`Privacy payments: ${paymentResult.error.message}`)
  if (actorResult.error) throw new Error(`Privacy actors: ${actorResult.error.message}`)

  const clients = new Map((clientResult.data ?? []).map((row) => [row.id, row]))
  const cases = new Map((caseResult.data ?? []).map((row) => [row.id, row]))
  const payments = new Map<string, number>()
  for (const row of paymentResult.data ?? []) {
    if (row.case_id) payments.set(row.case_id, (payments.get(row.case_id) ?? 0) + 1)
  }
  const actors = new Map((actorResult.data ?? []).map((row) => [row.id, row.full_name]))
  const erasedRequestIds = new Set((erasureResult.data ?? []).map((row) => row.data_request_id).filter(Boolean))

  const requests: PrivacyRequestView[] = rawRequests.map((row) => {
    const client = row.client_id ? clients.get(row.client_id) : null
    const kase = row.case_id ? cases.get(row.case_id) : null
    const paid = row.case_id ? paidIds.has(row.case_id) : false
    const caseRef = kase ? (kase.nypd_app_ref || `CASE-${kase.id.slice(0, 8).toUpperCase()}`) : null
    const path = kase ? pathLabel(kase.application_type, kase.license_track) : null
    const stage = kase ? stageMeta(kase.stage as CaseStageKey).short : null
    const filed = kase ? stageIndex(kase.stage as CaseStageKey) >= stageIndex("filed") : false
    const caseErased = !row.case_id && (erasedRequestIds.has(row.id) || (row.kind === "deletion" && row.status === "fulfilled"))
    return {
      id: row.id,
      caseId: row.case_id,
      clientId: row.client_id,
      kind: row.kind as PrivacyKind,
      status: row.status as PrivacyStatus,
      requesterEmail: row.requester_email,
      detail: row.detail,
      requestedAt: row.requested_at,
      fulfilledAt: row.fulfilled_at,
      resolutionNote: row.resolution_note,
      clientName: client?.full_name || row.requester_email,
      clientEmail: client?.email ?? null,
      caseRef,
      caseLine: caseErased ? "Case erased" : !kase ? "No case attached" : !paid ? "Lead · never paid" : `${caseRef} · ${path} · ${stage}`,
      path,
      stage,
      paid,
      filed,
      paymentCount: row.case_id ? payments.get(row.case_id) ?? 0 : 0,
      caseErased,
      timing: privacyTiming(row.requested_at, now),
    }
  })

  const open = requests
    .filter((request) => request.status === "open" || request.status === "acknowledged")
    .sort((a, b) => b.timing.days - a.timing.days || a.requestedAt.localeCompare(b.requestedAt))
  const closed = requests
    .filter((request) => request.status === "fulfilled" || request.status === "refused")
    .sort((a, b) => (b.fulfilledAt ?? b.requestedAt).localeCompare(a.fulfilledAt ?? a.requestedAt))
  const currentYear = etYear(now)
  const closedThisYear = closed.filter((request) => request.fulfilledAt && etYear(request.fulfilledAt) === currentYear)
  const erasuresThisYear = (erasureResult.data ?? []).filter((row) => etYear(row.created_at) === currentYear)
  const requestById = new Map(requests.map((request) => [request.id, request]))

  return {
    open,
    closed,
    selectedId: open.some((request) => request.id === selectedId) ? selectedId! : open[0]?.id ?? null,
    counts,
    cards: {
      closedThisYear: closedThisYear.length,
      medianDaysToClose: median(closedThisYear.map((request) => privacyTiming(request.requestedAt, new Date(request.fulfilledAt!)).days)),
      erasedThisYear: erasuresThisYear.length,
      latestErasure: erasuresThisYear[0]?.created_at ?? null,
    },
    policies: (policyResult.data ?? []).map((policy) => ({
      key: policy.key,
      label: policy.label,
      description: policy.description,
      action: policy.action,
      retainDays: policy.retain_days,
      enabled: policy.enabled,
      notes: displayNote(policy.notes),
    })),
    activePolicies: (policyResult.data ?? []).filter((policy) => policy.enabled && policy.retain_days).length,
    erasures: (erasureResult.data ?? []).map((entry) => {
      const request = entry.data_request_id ? requestById.get(entry.data_request_id) : null
      return {
        id: entry.id,
        requestId: entry.data_request_id,
        caseId: entry.case_id,
        createdAt: entry.created_at,
        who: request?.clientName ?? request?.requesterEmail ?? "Request no longer linked",
        caseRef: request?.caseRef ?? (entry.case_id ? `CASE-${entry.case_id.slice(0, 8).toUpperCase()}` : "Case erased"),
        actor: entry.actor ? actors.get(entry.actor) ?? "Staff" : "System",
        note: entry.note,
        surfaces: asRecord(entry.surfaces),
      }
    }),
    isAdmin,
    now: now.toISOString(),
  }
}
