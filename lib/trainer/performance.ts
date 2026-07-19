/**
 * PART B / Phase 8 — the trainer's honest performance picture.
 *
 * REAL DATA ONLY. Nothing here is an outcome or approval-rate claim — those
 * belong to the NYPD, not to a trainer, and inventing one would be exactly the
 * overclaim the guardrails forbid. These are throughput facts: how many cases
 * you're carrying, how much you've reviewed, how quickly, and how much of your
 * reviewable work is done.
 *
 * Scoping: getTrainerCases already reads the auth.uid()-guarded trainer views,
 * and RLS on requirement_reviews only returns the trainer's own rows for
 * engagements they own — so a trainer's own client is enough, no new view.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { getTrainerCases, getTrainerRequirements, progressOf } from "@/lib/trainer/queries"

type DB = SupabaseClient<Database>

export interface TrainerPerformance {
  activeCases: number
  /** Reviewable items completed across active cases / total reviewable. */
  completion: { done: number; total: number; percent: number }
  itemsReviewed: number
  approved: number
  changesRequested: number
  /** Median hours from a document arriving to the trainer approving it, when computable. */
  medianHoursToApprove: number | null
  awaitingReview: number
}

export async function getTrainerPerformance(db: DB): Promise<TrainerPerformance> {
  const cases = await getTrainerCases(db)

  // Completion + awaiting-review, aggregated across the active book.
  let done = 0
  let total = 0
  let awaitingReview = 0
  const docCreatedByReq = new Map<string, string>()
  await Promise.all(
    cases.map(async (c) => {
      const reqs = await getTrainerRequirements(db, c.caseId)
      const p = progressOf(reqs)
      done += p.done
      total += p.total
      awaitingReview += reqs.filter((r) => r.scope === "full" && r.documentId && r.status !== "satisfied").length
    })
  )

  // Review log — the trainer's own rows (RLS-scoped). document_id + created_at
  // let us time each approval against when the document arrived.
  const { data: reviews } = await db
    .from("requirement_reviews")
    .select("decision, created_at, document_id, case_requirement_id")
    .eq("reviewer_kind", "trainer")
    .order("created_at", { ascending: true })

  const rows = reviews ?? []
  const approved = rows.filter((r) => r.decision === "approved").length
  const changesRequested = rows.filter((r) => r.decision === "changes_requested").length

  // Time-to-approve: diff each approval against its document's arrival time.
  // Trainers can't read the documents table directly, but the review row can be
  // matched to the document feed per case; to keep this cheap we only compute it
  // when a matching document_id + created_at is available on the case docs.
  const docArrival = await documentArrivalTimes(db, cases.map((c) => c.caseId))
  const hours: number[] = []
  for (const r of rows) {
    if (r.decision !== "approved" || !r.document_id) continue
    const arrived = docArrival.get(r.document_id)
    if (!arrived) continue
    const dh = (new Date(r.created_at).getTime() - new Date(arrived).getTime()) / 3_600_000
    if (dh >= 0) hours.push(dh)
  }
  void docCreatedByReq

  return {
    activeCases: cases.length,
    completion: { done, total, percent: total ? Math.round((done / total) * 100) : 0 },
    itemsReviewed: rows.length,
    approved,
    changesRequested,
    medianHoursToApprove: median(hours),
    awaitingReview,
  }
}

/** Document arrival times, from the trainer document feed (per case, scoped). */
async function documentArrivalTimes(db: DB, caseIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  await Promise.all(
    caseIds.map(async (caseId) => {
      const { data } = await db
        .from("trainer_document_feed")
        .select("document_id, created_at")
        .eq("case_id", caseId)
      for (const d of data ?? []) {
        if (d.document_id && d.created_at) map.set(d.document_id, d.created_at)
      }
    })
  )
  return map
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  const m = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
  return Math.round(m * 10) / 10
}
