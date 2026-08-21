import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { type CaseStageKey, stageIndex, isNypdControlled } from "@/config/stages"
import { agreementsCurrentFor } from "@/lib/concierge/onboarding"
import { paidPackageCaseIds } from "@/lib/packages"

type DB = SupabaseClient<Database>

export type QueueTone = "attention" | "progress" | "waiting"

export interface ConciergeQueueRow {
  caseId: string
  clientName: string
  agentName: string | null
  stage: CaseStageKey
  label: string
  tone: QueueTone
  /** Lower sorts first. */
  priority: number
}

/**
 * CONCIERGE Phase 10 — the concierge work-queue. One glance at every done-for-you
 * case and the single next thing it needs, derived from real state with BATCHED
 * queries (no per-case gate calls). Attention items (blocked on us or the
 * applicant) sort to the top; NYPD-clock cases sink to the bottom.
 */
export async function loadConciergeQueue(db: DB): Promise<ConciergeQueueRow[]> {
  const { data: cases } = await db
    .from("cases")
    .select("id, stage, clients(full_name, assigned_staff, lead_source, profile_id)")
    .eq("status", "active")
    .eq("service_mode", "concierge")
    .eq("is_demo", false) // demo cases never appear in the work queue
  if (!cases || cases.length === 0) return []

  const ids = cases.map((c) => c.id)
  const [paidSet, { data: agreements }, { data: intros }, { data: pendingReqs }] =
    await Promise.all([
      paidPackageCaseIds(db, ids, "full_concierge"),
      db.from("case_agreements").select("case_id, kind, version").in("case_id", ids),
      db.from("intro_calls").select("case_id, status, scheduled_at").in("case_id", ids),
      db.from("case_requirements").select("case_id").eq("status", "pending").in("case_id", ids),
    ])

  // Group agreement rows per case → the shared current-version predicate.
  const agRows = new Map<string, { kind: string; version: number }[]>()
  for (const a of agreements ?? []) {
    const list = agRows.get(a.case_id) ?? []
    list.push({ kind: a.kind, version: a.version })
    agRows.set(a.case_id, list)
  }
  const introByCase = new Map((intros ?? []).map((i) => [i.case_id, i]))
  const pendingCount = new Map<string, number>()
  for (const r of pendingReqs ?? []) pendingCount.set(r.case_id, (pendingCount.get(r.case_id) ?? 0) + 1)

  // Resolve assigned-staff names in one batch.
  const staffIds = [
    ...new Set(
      cases
        .map((c) => (c.clients as unknown as { assigned_staff: string | null } | null)?.assigned_staff)
        .filter((x): x is string => !!x)
    ),
  ]
  const { data: staff } = staffIds.length
    ? await db.from("profiles").select("id, full_name").in("id", staffIds)
    : { data: [] as { id: string; full_name: string }[] }
  const staffName = new Map((staff ?? []).map((s) => [s.id, s.full_name]))

  const rows: ConciergeQueueRow[] = cases.map((c) => {
    const client = c.clients as unknown as {
      full_name: string
      assigned_staff: string | null
      lead_source: string | null
      profile_id: string | null
    } | null
    const stage = c.stage as CaseStageKey
    const intro = introByCase.get(c.id)
    const signal = deriveSignal({
      stage,
      paid: paidSet.has(c.id),
      agreementsComplete: agreementsCurrentFor(agRows.get(c.id) ?? []).complete,
      introBooked: !!intro?.scheduled_at,
      introRequested: intro?.status === "requested",
      pending: pendingCount.get(c.id) ?? 0,
      staffCreated: client?.lead_source === "admin_manual",
      hasAccount: !!client?.profile_id,
    })
    return {
      caseId: c.id,
      clientName: client?.full_name ?? "—",
      agentName: client?.assigned_staff ? (staffName.get(client.assigned_staff) ?? null) : null,
      stage,
      ...signal,
    }
  })

  return rows.sort((a, b) => a.priority - b.priority || a.clientName.localeCompare(b.clientName))
}

/** How many concierge cases need a hand right now — for the nav badge. */
export async function conciergeAttentionCount(db: DB): Promise<number> {
  const rows = await loadConciergeQueue(db)
  return rows.filter((r) => r.tone === "attention").length
}

export function deriveSignal(s: {
  stage: CaseStageKey
  paid: boolean
  agreementsComplete: boolean
  introBooked: boolean
  introRequested: boolean
  pending: number
  /** Case was created by staff (lead_source = admin_manual), not self-serve. */
  staffCreated?: boolean
  /** The applicant has claimed a portal account (client.profile_id set). */
  hasAccount?: boolean
}): { label: string; tone: QueueTone; priority: number } {
  // CONCIERGE QA Phase 6 — an unpaid concierge case is the operation's own
  // pipeline, not passive noise. Split it by whose court the ball is in, so
  // staff-created and self-serve unpaid cases surface as ATTENTION, worst first.
  if (!s.paid) {
    if (s.staffCreated && !s.hasAccount)
      return { label: "Invite them", tone: "attention", priority: 12 }
    if (s.staffCreated && s.hasAccount)
      return { label: "Awaiting payment — chase", tone: "attention", priority: 18 }
    return { label: "Chose concierge, hasn't paid", tone: "attention", priority: 19 }
  }
  if (!s.agreementsComplete) return { label: "Needs to sign agreements", tone: "attention", priority: 10 }
  if (s.introRequested) return { label: "Intro call requested — schedule it", tone: "attention", priority: 15 }
  if (!s.introBooked) return { label: "Book the intro call", tone: "attention", priority: 20 }
  if (isNypdControlled(s.stage)) return { label: "With the NYPD — their clock", tone: "waiting", priority: 80 }
  if (s.pending > 0)
    return { label: `${s.pending} document${s.pending === 1 ? "" : "s"} outstanding`, tone: "progress", priority: 30 }
  if (stageIndex(s.stage) >= stageIndex("application_assembled"))
    return { label: "Ready for their review & filing", tone: "attention", priority: 25 }
  return { label: "All documents in — review for QA", tone: "attention", priority: 22 }
}
