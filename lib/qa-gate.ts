/**
 * V3-P2.4 — the CP-5 pre-filing QA gate. This is the mechanism by which the
 * product actually reduces denials, and the one thing we can honestly market:
 * a case CANNOT enter `application_assembled` or `filed` until every check
 * below passes and a named staff member has signed off.
 *
 * No `server-only` so the reminder engine and verify harness can evaluate it
 * with a service-role client. Enforcement lives in setCaseStage.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { requiredReferences } from "@/lib/intake/schema"
import type { WizardAnswers } from "@/lib/intake/answers"

type DB = SupabaseClient<Database>

export const GATED_STAGES = ["application_assembled", "filed"] as const

export interface GateBlocker {
  kind:
    | "blocking_requirements"
    | "disclosure_narratives"
    | "training_missing"
    | "training_expired"
    | "references_short"
    | "sign_off_missing"
  detail: string
}

export interface GateResult {
  ok: boolean
  blockers: GateBlocker[]
  /** ok ignoring the sign-off — "ready for sign-off". */
  readyForSignOff: boolean
}

/** Evaluate every CP-5 check for a case. Read-only. */
export async function evaluatePreFilingGate(db: DB, caseId: string): Promise<GateResult> {
  const blockers: GateBlocker[] = []

  const [{ data: kase }, { data: reqs }, { data: disclosures }, { data: session }, { data: refs }] =
    await Promise.all([
      db
        .from("cases")
        .select("is_renewal, training_expires_on, qa_signed_off_by, clients(track)")
        .eq("id", caseId)
        .single(),
      db
        .from("case_requirements")
        .select("req_code, status, requirements!inner(blocking, title)")
        .eq("case_id", caseId),
      db.from("disclosures").select("id, type, narrative").eq("case_id", caseId),
      db.from("intake_sessions").select("answers").eq("case_id", caseId).maybeSingle(),
      db.from("character_references").select("id, notarized").eq("case_id", caseId),
    ])
  if (!kase) return { ok: false, blockers: [{ kind: "blocking_requirements", detail: "Case not found." }], readyForSignOff: false }

  // 1. Every BLOCKING requirement satisfied (advisory rows can never block).
  const openBlocking = (reqs ?? []).filter((r) => {
    const req = r.requirements as unknown as { blocking: boolean; title: string } | null
    return req?.blocking && r.status === "pending"
  })
  if (openBlocking.length > 0) {
    const codes = openBlocking.map((r) => r.req_code).sort()
    blockers.push({
      kind: "blocking_requirements",
      detail: `${openBlocking.length} blocking requirement(s) not satisfied: ${codes.slice(0, 8).join(", ")}${codes.length > 8 ? "…" : ""}`,
    })
  }

  // 2. Every disclosure carries a real narrative — candor is the requirement.
  const emptyNarratives = (disclosures ?? []).filter((d) => !d.narrative || d.narrative.trim().length < 20)
  if (emptyNarratives.length > 0) {
    blockers.push({
      kind: "disclosure_narratives",
      detail: `${emptyNarratives.length} disclosure(s) lack a substantive written explanation (min ~20 chars).`,
    })
  }

  // 3. Training current at submission (≤6 months old). Applies when the case
  //    has an applicable training requirement (TRN-01 or RNW-01 not N/A).
  const trainingApplicable = (reqs ?? []).some(
    (r) => ["TRN-01", "RNW-01"].includes(r.req_code) && r.status !== "na"
  )
  if (trainingApplicable) {
    if (!kase.training_expires_on) {
      blockers.push({
        kind: "training_missing",
        detail: "No training completion is recorded — the certificate must be dated within 6 months of submission.",
      })
    } else if (kase.training_expires_on < new Date().toISOString().slice(0, 10)) {
      blockers.push({
        kind: "training_expired",
        detail: `Training expired ${kase.training_expires_on} — it must be ≤6 months old at submission; a refresher is needed.`,
      })
    }
  }

  // 4. Track-aware reference count, notarization met (renewals need none).
  const answers = ((session?.answers ?? {}) as WizardAnswers) || {}
  const needed = requiredReferences(answers, { isRenewal: !!kase.is_renewal })
  const notarized = (refs ?? []).filter((r) => r.notarized).length
  if (notarized < needed) {
    blockers.push({
      kind: "references_short",
      detail: `${notarized}/${needed} notarized character references on file for this track.`,
    })
  }

  const readyForSignOff = blockers.length === 0

  // 5. A named human signed off — recorded, auditable.
  if (!kase.qa_signed_off_by) {
    blockers.push({
      kind: "sign_off_missing",
      detail: "Pre-filing QA has not been signed off by a staff member.",
    })
  }

  return { ok: blockers.length === 0, blockers, readyForSignOff }
}
