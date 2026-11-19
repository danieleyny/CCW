import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

export type AdminPaymentFilter = "all" | "requested" | "paid" | "comped" | "failed"
export type AdminPaymentState = "requested" | "paid" | "comped" | "failed" | "refunded" | "unknown"

export interface AdminPaymentRow {
  id: string
  caseId: string | null
  clientId: string | null
  clientName: string
  amountCents: number
  currency: string
  type: string
  status: string
  state: AdminPaymentState
  createdAt: string
  paidAt: string | null
  description: string | null
  packageKey: string | null
  packageLabel: string
  detail: string
  compLabel: string | null
  documentUrl: string | null
  documentLabel: "Receipt" | "Invoice link" | null
  ageDays: number
  isTest: boolean
}

export interface AdminPaymentMonth {
  key: string
  label: string
  collectedCents: number
  compCount: number
  current: boolean
}

export interface AdminPaymentTestClient {
  clientId: string
  name: string
  email: string | null
  createdAt: string
  caseIds: string[]
  paymentCount: number
  hasRealStripePayment: boolean
}

export interface AdminPaymentsData {
  filter: AdminPaymentFilter
  q: string
  showTests: boolean
  isAdmin: boolean
  rows: AdminPaymentRow[]
  exportRows: AdminPaymentRow[]
  page: number
  hasMore: boolean
  counts: Record<AdminPaymentFilter, number>
  stats: {
    collectedCents: number
    requestedCents: number
    requestedCount: number
    oldestRequestedDays: number
    compedClients: number
    thisMonthCents: number
    thisMonthPayments: number
    thisMonthComps: number
  }
  months: AdminPaymentMonth[]
  aging: {
    under15Cents: number
    days15To30Cents: number
    over30Cents: number
    compedThisYear: number
  }
  chartSummary: string
  caseOptions: Array<{ id: string; name: string; serviceMode: string | null }>
  hiddenTests: { clients: number; payments: number }
  testReview: {
    marked: AdminPaymentTestClient[]
    suggestions: AdminPaymentTestClient[]
    deletableCaseIds: string[]
    deletableClientCount: number
    excluded: AdminPaymentTestClient[]
  } | null
}

const DAY = 86_400_000
const PAGE_SIZE = 25
const ET = "America/New_York"
const FILTERS = new Set<AdminPaymentFilter>(["all", "requested", "paid", "comped", "failed"])

const packageLabels: Record<string, string> = {
  self_guided: "Self-Guided",
  full_concierge: "Full Concierge",
  non_resident: "Special Carry",
  renewal: "Renewal",
}

function responseError(value: { error: unknown | null }, label: string) {
  if (value.error) throw new Error(`${label}: ${String((value.error as { message?: string }).message ?? value.error)}`)
}

function etParts(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(typeof value === "string" ? new Date(value) : value)
  const year = Number(parts.find((part) => part.type === "year")?.value ?? 0)
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 0)
  return { year, month, key: `${year}-${String(month).padStart(2, "0")}` }
}

function lastTwelveMonths(now: Date) {
  const current = etParts(now)
  const anchor = new Date(Date.UTC(current.year, current.month - 1, 1))
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - (11 - index), 1))
    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
    }
  })
}

function paymentState(status: string, amountCents: number): AdminPaymentState {
  if (status === "paid" && amountCents === 0) return "comped"
  if (status === "paid") return "paid"
  if (status === "pending") return "requested"
  if (status === "failed") return "failed"
  if (status === "refunded") return "refunded"
  return "unknown"
}

export function accessCodeLabel(description: string | null | undefined) {
  const match = description?.match(/Access code redeemed\s*\(([^)]+)\)/i)
  return match?.[1]?.trim() ? `Access code “${match[1].trim()}”` : "Access code"
}

function detailsFor(payment: {
  state: AdminPaymentState
  description: string | null
  stripe_invoice_id: string | null
  hosted_invoice_url: string | null
  stripe_session_id: string | null
}) {
  if (payment.state === "comped") return accessCodeLabel(payment.description)
  if (payment.stripe_invoice_id || payment.hosted_invoice_url) return "Card · Stripe invoice"
  if (payment.stripe_session_id) return "Card · checkout"
  if (payment.state === "requested") return "Invoice emailed"
  return payment.description || "Payment record"
}

function looksLikeTest(name: string, email: string | null) {
  const trimmed = name.trim()
  const normalizedEmail = email?.toLowerCase() ?? ""
  return /\btest\b/i.test(trimmed)
    || trimmed.length <= 3
    || normalizedEmail.includes("+test")
    || normalizedEmail.includes("@example.")
    || normalizedEmail.includes("test@")
}

function moneyCompact(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents >= 100_000 ? 1 : 0,
    notation: cents >= 100_000 ? "compact" : "standard",
  }).format(cents / 100)
}

function filterMatches(row: AdminPaymentRow, filter: AdminPaymentFilter) {
  if (filter === "all") return true
  if (filter === "failed") return row.state === "failed" || row.state === "refunded" || row.state === "unknown"
  return row.state === filter
}

export async function loadAdminPayments(
  db: DB,
  input: {
    isAdmin: boolean
    filter: string | undefined
    q: string
    showTests: boolean
    clientId?: string | null
    page: number
    now?: Date
  }
): Promise<AdminPaymentsData> {
  const now = input.now ?? new Date()
  const filter = FILTERS.has(input.filter as AdminPaymentFilter) ? input.filter as AdminPaymentFilter : "all"
  const showTests = input.isAdmin && input.showTests
  const [paymentResult, caseResult] = await Promise.all([
    db.from("payments").select("id, case_id, client_id, amount_cents, currency, type, status, description, package_key, stripe_payment_intent, stripe_invoice_id, stripe_session_id, hosted_invoice_url, invoice_url, paid_at, created_at, clients(id, full_name, email, created_at), cases(id, client_id, is_demo, service_mode)").order("created_at", { ascending: false }),
    db.from("cases").select("id, client_id, is_demo, service_mode, status, created_at, clients!inner(id, full_name, email, created_at)").order("created_at", { ascending: false }),
  ])
  responseError(paymentResult, "Payments")
  responseError(caseResult, "Cases")

  const rawCases = (caseResult.data ?? []) as unknown as Array<{
    id: string
    client_id: string
    is_demo: boolean
    service_mode: string | null
    status: string
    created_at: string
    clients: { id: string; full_name: string; email: string | null; created_at: string }
  }>
  const nonDemoClients = new Set(rawCases.filter((kase) => !kase.is_demo).map((kase) => kase.client_id))
  const caseById = new Map(rawCases.map((kase) => [kase.id, kase]))

  const allRows: AdminPaymentRow[] = (paymentResult.data ?? []).map((raw) => {
    const client = raw.clients as unknown as { id: string; full_name: string; email: string | null; created_at: string } | null
    const joinedCase = raw.cases as unknown as { id: string; client_id: string; is_demo: boolean; service_mode: string | null } | null
    const kase = joinedCase ?? (raw.case_id ? caseById.get(raw.case_id) ?? null : null)
    const clientId = raw.client_id ?? kase?.client_id ?? client?.id ?? null
    const state = paymentState(raw.status, raw.amount_cents)
    const documentUrl = raw.hosted_invoice_url ?? raw.invoice_url
    const packageLabel = raw.package_key ? packageLabels[raw.package_key] ?? raw.package_key.replaceAll("_", " ") : "No package"
    const isTest = !!kase?.is_demo || !clientId || !nonDemoClients.has(clientId)
    return {
      id: raw.id,
      caseId: raw.case_id,
      clientId,
      clientName: client?.full_name || "Unknown client",
      amountCents: raw.amount_cents,
      currency: raw.currency,
      type: raw.type,
      status: raw.status,
      state,
      createdAt: raw.created_at,
      paidAt: raw.paid_at,
      description: raw.description,
      packageKey: raw.package_key,
      packageLabel,
      detail: detailsFor({
        state,
        description: raw.description,
        stripe_invoice_id: raw.stripe_invoice_id,
        hosted_invoice_url: raw.hosted_invoice_url,
        stripe_session_id: raw.stripe_session_id,
      }),
      compLabel: state === "comped" ? accessCodeLabel(raw.description) : null,
      documentUrl,
      documentLabel: documentUrl ? state === "paid" ? "Receipt" : "Invoice link" : null,
      ageDays: Math.max(0, Math.floor((now.getTime() - new Date(raw.created_at).getTime()) / DAY)),
      isTest,
    }
  })

  const visibleBase = allRows.filter((row) => showTests || !row.isTest)
  const scoped = visibleBase.filter((row) => !input.clientId || row.clientId === input.clientId)
  const query = input.q.trim().toLocaleLowerCase()
  const searched = scoped.filter((row) => !query || row.clientName.toLocaleLowerCase().includes(query))
  const counts: Record<AdminPaymentFilter, number> = {
    all: searched.length,
    requested: searched.filter((row) => row.state === "requested").length,
    paid: searched.filter((row) => row.state === "paid").length,
    comped: searched.filter((row) => row.state === "comped").length,
    failed: searched.filter((row) => ["failed", "refunded", "unknown"].includes(row.state)).length,
  }
  const exportRows = searched.filter((row) => filterMatches(row, filter))
  const limit = Math.max(1, input.page) * PAGE_SIZE

  const realPaid = visibleBase.filter((row) => row.state === "paid" && row.amountCents > 0 && !!row.paidAt)
  const pending = visibleBase.filter((row) => row.state === "requested")
  const comps = visibleBase.filter((row) => row.state === "comped")
  const monthKeys = lastTwelveMonths(now)
  const monthKeySet = new Set(monthKeys.map((month) => month.key))
  const realPaidLastTwelveMonths = realPaid.filter((row) => row.paidAt && monthKeySet.has(etParts(row.paidAt).key))
  const current = etParts(now)
  const monthMap = new Map(monthKeys.map((month) => [month.key, { ...month, collectedCents: 0, compCount: 0 }]))
  for (const row of realPaid) {
    if (!row.paidAt) continue
    const month = monthMap.get(etParts(row.paidAt).key)
    if (month) month.collectedCents += row.amountCents
  }
  for (const row of comps) {
    const month = monthMap.get(etParts(row.paidAt ?? row.createdAt).key)
    if (month) month.compCount++
  }
  const months = [...monthMap.values()].map((month) => ({ ...month, current: month.key === current.key }))
  const highest = [...months].sort((a, b) => b.collectedCents - a.collectedCents)[0]
  const chartSummary = `Collected by month, ${months[0]?.label} ${months[0]?.key.slice(0, 4)} to ${months.at(-1)?.label} ${months.at(-1)?.key.slice(0, 4)}: highest ${highest?.label ?? "month"} ${moneyCompact(highest?.collectedCents ?? 0)}.`
  const pendingSum = pending.reduce((sum, row) => sum + row.amountCents, 0)
  const compedClientIds = new Set(comps.map((row) => row.clientId ?? row.id))

  const paymentCountByClient = new Map<string, number>()
  const realStripeCaseIds = new Set<string>()
  for (const raw of paymentResult.data ?? []) {
    const joinedCase = raw.cases as unknown as { id: string; client_id: string } | null
    const clientId = raw.client_id ?? joinedCase?.client_id ?? null
    if (clientId) paymentCountByClient.set(clientId, (paymentCountByClient.get(clientId) ?? 0) + 1)
    if (raw.case_id && raw.status === "paid" && raw.amount_cents > 0 && (raw.stripe_payment_intent || raw.stripe_invoice_id || raw.stripe_session_id)) {
      realStripeCaseIds.add(raw.case_id)
    }
  }
  const grouped = new Map<string, AdminPaymentTestClient>()
  for (const kase of rawCases) {
    const existing = grouped.get(kase.client_id)
    const value = existing ?? {
      clientId: kase.client_id,
      name: kase.clients.full_name || "Unknown client",
      email: kase.clients.email,
      createdAt: kase.clients.created_at,
      caseIds: [],
      paymentCount: paymentCountByClient.get(kase.client_id) ?? 0,
      hasRealStripePayment: false,
    }
    value.caseIds.push(kase.id)
    value.hasRealStripePayment ||= realStripeCaseIds.has(kase.id)
    grouped.set(kase.client_id, value)
  }
  const markedClientIds = new Set(rawCases.filter((kase) => kase.is_demo).map((kase) => kase.client_id))
  const marked = [...grouped.values()]
    .filter((client) => markedClientIds.has(client.clientId))
    .sort((a, b) => a.name.localeCompare(b.name))
  const suggestions = [...grouped.values()]
    .filter((client) => !markedClientIds.has(client.clientId) && looksLikeTest(client.name, client.email))
    .sort((a, b) => a.name.localeCompare(b.name))
  const markedCaseIds = new Set(rawCases.filter((kase) => kase.is_demo).map((kase) => kase.id))
  const deletableCaseIds = [...markedCaseIds].filter((id) => !realStripeCaseIds.has(id))
  const deletableClients = new Set(rawCases.filter((kase) => deletableCaseIds.includes(kase.id)).map((kase) => kase.client_id))
  const excluded = marked.filter((client) => client.caseIds.some((id) => markedCaseIds.has(id) && realStripeCaseIds.has(id)))

  const hiddenRows = allRows.filter((row) => row.isTest)
  const hiddenTestClientIds = new Set([
    ...hiddenRows.flatMap((row) => row.clientId ? [row.clientId] : []),
    ...rawCases.filter((kase) => kase.is_demo || !nonDemoClients.has(kase.client_id)).map((kase) => kase.client_id),
  ])
  return {
    filter,
    q: input.q,
    showTests,
    isAdmin: input.isAdmin,
    rows: exportRows.slice(0, limit),
    exportRows,
    page: Math.max(1, input.page),
    hasMore: exportRows.length > limit,
    counts,
    stats: {
      collectedCents: realPaidLastTwelveMonths.reduce((sum, row) => sum + row.amountCents, 0),
      requestedCents: pendingSum,
      requestedCount: pending.length,
      oldestRequestedDays: pending.reduce((oldest, row) => Math.max(oldest, row.ageDays), 0),
      compedClients: compedClientIds.size,
      thisMonthCents: realPaid.filter((row) => row.paidAt && etParts(row.paidAt).key === current.key).reduce((sum, row) => sum + row.amountCents, 0),
      thisMonthPayments: realPaid.filter((row) => row.paidAt && etParts(row.paidAt).key === current.key).length,
      thisMonthComps: comps.filter((row) => etParts(row.paidAt ?? row.createdAt).key === current.key).length,
    },
    months,
    aging: {
      under15Cents: pending.filter((row) => row.ageDays <= 14).reduce((sum, row) => sum + row.amountCents, 0),
      days15To30Cents: pending.filter((row) => row.ageDays >= 15 && row.ageDays <= 30).reduce((sum, row) => sum + row.amountCents, 0),
      over30Cents: pending.filter((row) => row.ageDays > 30).reduce((sum, row) => sum + row.amountCents, 0),
      compedThisYear: comps.filter((row) => etParts(row.paidAt ?? row.createdAt).year === current.year).length,
    },
    chartSummary,
    caseOptions: rawCases
      .filter((kase) => !kase.is_demo && kase.status !== "closed")
      .map((kase) => ({ id: kase.id, name: kase.clients.full_name || "Unknown client", serviceMode: kase.service_mode })),
    hiddenTests: {
      clients: hiddenTestClientIds.size,
      payments: hiddenRows.length,
    },
    testReview: input.isAdmin ? { marked, suggestions, deletableCaseIds, deletableClientCount: deletableClients.size, excluded } : null,
  }
}
