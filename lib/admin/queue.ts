/**
 * PART B / Phase 6 — the QA-gate cockpit data layer.
 *
 * A VIEW over evaluatePreFilingGate() across cases — no gate logic lives here,
 * so the queue can never disagree with what setCaseStage actually enforces. It
 * buckets each pre-filing case by exactly what's standing between it and filing.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { evaluatePreFilingGate, type GateBlocker } from "@/lib/qa-gate"
import { stageIndex, type CaseStageKey } from "@/config/stages"

type DB = SupabaseClient<Database>

export type QueueBucket = "ready" | "near" | "waiting" | "signed" | "filed"

export interface QueueRow {
  caseId: string
  applicant: string
  stage: CaseStageKey
  bucket: QueueBucket
  blockers: GateBlocker[]
  /** Open blocking requirements + other distinct gate blockers — the sort key. */
  distance: number
  signedOff: boolean
}

/** Everything a case can be, and how it's shown, in queue order. */
export const QUEUE_TABS: { key: QueueBucket; label: string; hint: string }[] = [
  { key: "ready", label: "Ready for final QA", hint: "Every check passes — a named sign-off is the last step." },
  { key: "signed", label: "Signed — ready to assemble", hint: "QA signed off; move to Application Assembled / Filed." },
  { key: "near", label: "Near ready", hint: "One to three checks away, fewest first." },
  { key: "waiting", label: "Awaiting applicant", hint: "Several items still outstanding." },
  { key: "filed", label: "Filed / awaiting decision", hint: "Submitted — now with the License Division." },
]

const PREFILE_MIN = stageIndex("training_complete") // requirements exist by here
const FILED = stageIndex("filed")
const APP_ASSEMBLED = stageIndex("application_assembled")
const DECISION = stageIndex("decision") // decision + licensed are terminal — out of the queue

export async function buildQaQueue(db: DB): Promise<QueueRow[]> {
  const { data: cases } = await db
    .from("cases")
    .select("id, stage, status, qa_signed_off_by, clients(full_name)")
    .eq("status", "active")
    .neq("stage", "lead")

  // One pass for the true distance metric: how many BLOCKING requirements are
  // still open per case. Counting blocker *kinds* would call a case with 14
  // unsatisfied documents "near ready" — the summary blocker collapses them all
  // into one line.
  const { data: openReqs } = await db
    .from("case_requirements")
    .select("case_id, requirements!inner(blocking)")
    .in("status", ["pending", "rejected"])
  const openBlockingByCase = new Map<string, number>()
  for (const r of openReqs ?? []) {
    if ((r.requirements as unknown as { blocking: boolean } | null)?.blocking) {
      openBlockingByCase.set(r.case_id, (openBlockingByCase.get(r.case_id) ?? 0) + 1)
    }
  }

  const rows = await Promise.all(
    (cases ?? []).map(async (c) => {
      const stage = c.stage as CaseStageKey
      const idx = stageIndex(stage)
      const applicant = (c.clients as unknown as { full_name: string } | null)?.full_name ?? "Applicant"
      const signedOff = !!c.qa_signed_off_by

      // Decision and licensed are terminal — nothing to work, out of the queue.
      if (idx >= DECISION) return null
      // Filed through investigation: no gate to run, they're with NYPD now.
      if (idx >= FILED) {
        return row(c.id, applicant, stage, "filed", [], signedOff, 0)
      }
      // Too early to have a meaningful gate — skip (leads/training).
      if (idx < PREFILE_MIN) return null

      const gate = await evaluatePreFilingGate(db, c.id)
      const blockers = gate.blockers.filter((b) => b.kind !== "sign_off_missing")

      // Distance = open blocking requirements + the OTHER distinct gate blockers
      // (narratives, training, references, photo) that aren't the requirement roll-up.
      const openBlocking = openBlockingByCase.get(c.id) ?? 0
      const otherBlockers = blockers.filter((b) => b.kind !== "blocking_requirements").length
      const distance = openBlocking + otherBlockers

      let bucket: QueueBucket
      if (signedOff && idx < APP_ASSEMBLED) bucket = "signed"
      else if (gate.readyForSignOff && !signedOff) bucket = "ready"
      else if (distance <= 3) bucket = "near"
      else bucket = "waiting"

      return row(c.id, applicant, stage, bucket, blockers, signedOff, distance)
    })
  )

  return rows.filter((r): r is QueueRow => r !== null)
}

function row(
  caseId: string,
  applicant: string,
  stage: CaseStageKey,
  bucket: QueueBucket,
  blockers: GateBlocker[],
  signedOff: boolean,
  distance: number
): QueueRow {
  return { caseId, applicant, stage, bucket, blockers, distance, signedOff }
}

/** Sort within a bucket: closest to filing first, else by name. */
export function sortQueue(rows: QueueRow[]): QueueRow[] {
  return [...rows].sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance
    return a.applicant.localeCompare(b.applicant)
  })
}
