/**
 * Intake processing core (no `server-only` so scripts can drive it). Turns the
 * wizard answers into the deterministic side effects:
 *   - household adults  -> cohabitants rows (each needs a notarized affidavit)
 *   - each disclosure   -> a typed disclosures row carrying its required narrative
 *   - then generates case_requirements (conditional rules spawn) and binds each
 *     spawned requirement to its disclosure (the provable audit link)
 * and evaluates the pre-submission guard.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { materializeCaseRequirements } from "@/lib/requirements/materialize"
import { toGeneratorAnswers, type WizardAnswers } from "./answers"

type DB = SupabaseClient<Database>

export interface ProcessIntakeResult {
  cohabitants: number
  disclosures: number
  applicable: number
}

export async function processIntake(
  admin: DB,
  caseId: string,
  jurisdictionKey: string,
  answers: WizardAnswers
): Promise<ProcessIntakeResult> {
  // ── Household: intake owns the cohabitant set; rebuild it idempotently ─────
  await admin.from("cohabitants").delete().eq("case_id", caseId)
  const cohabRows = (answers.cohabitants ?? [])
    .filter((c) => c.name?.trim())
    .map((c) => ({
      case_id: caseId,
      name: c.name.trim(),
      relationship: c.relationship ?? null,
      affidavit_status: "not_started" as const,
    }))
  if (cohabRows.length) await admin.from("cohabitants").insert(cohabRows)

  // ── Disclosures: rebuild idempotently from the interview ───────────────────
  await admin.from("disclosures").delete().eq("case_id", caseId)
  type DiscIns = Database["public"]["Tables"]["disclosures"]["Insert"]
  const discRows: DiscIns[] = []
  for (const a of answers.arrests ?? []) {
    discRows.push({
      case_id: caseId,
      type: "arrest",
      occurred_on: a.occurredOn || null,
      jurisdiction_text: a.jurisdiction || null,
      disposition: a.disposition || null,
      narrative: a.narrative ?? "",
      spawned_req_code: "ARR-01",
    })
  }
  for (const o of answers.ordersOfProtection ?? []) {
    discRows.push({
      case_id: caseId,
      type: "order_of_protection",
      occurred_on: o.occurredOn || null,
      jurisdiction_text: o.jurisdiction || null,
      narrative: o.narrative ?? "",
      spawned_req_code: "OOP-01",
    })
  }
  for (const d of answers.domesticIncidents ?? []) {
    discRows.push({
      case_id: caseId,
      type: "domestic_incident",
      occurred_on: d.occurredOn || null,
      narrative: d.narrative ?? "",
      spawned_req_code: "DIR-01",
    })
  }
  for (const q of answers.questionnaire ?? []) {
    if (q.yes) {
      discRows.push({
        case_id: caseId,
        type: "question_yes",
        question_no: q.no,
        narrative: q.narrative ?? "",
        spawned_req_code: "QUE-01",
      })
    }
  }
  let insertedDisc: { id: string; spawned_req_code: string | null }[] = []
  if (discRows.length) {
    const { data } = await admin.from("disclosures").insert(discRows).select("id, spawned_req_code")
    insertedDisc = data ?? []
  }

  // ── Generate case_requirements (conditional rules fire here) ───────────────
  const result = await materializeCaseRequirements(
    admin,
    caseId,
    jurisdictionKey,
    toGeneratorAnswers(answers)
  )

  // ── Bind each spawned requirement to a representative disclosure ───────────
  const repByCode = new Map<string, string>()
  for (const d of insertedDisc) {
    if (d.spawned_req_code && !repByCode.has(d.spawned_req_code)) {
      repByCode.set(d.spawned_req_code, d.id)
    }
  }
  for (const [reqCode, disclosureId] of repByCode) {
    await admin
      .from("case_requirements")
      .update({ disclosure_id: disclosureId })
      .eq("case_id", caseId)
      .eq("req_code", reqCode)
  }

  return {
    cohabitants: cohabRows.length,
    disclosures: discRows.length,
    applicable: result.applicable,
  }
}

export interface SubmissionGuard {
  ok: boolean
  blockers: { kind: "disclosure_narrative" | "requirements_pending"; detail: string }[]
  emptyNarrativeCount: number
  pendingCount: number
}

/**
 * The CP-5 gate: block advancing to `application_assembled` while any disclosure
 * narrative is empty or any applicable requirement is still pending.
 */
export async function evaluateSubmissionGuard(db: DB, caseId: string): Promise<SubmissionGuard> {
  const { data: disc } = await db
    .from("disclosures")
    .select("id, narrative")
    .eq("case_id", caseId)
  const emptyNarr = (disc ?? []).filter((d) => !d.narrative || d.narrative.trim() === "")

  const { data: reqs } = await db
    .from("case_requirements")
    .select("status")
    .eq("case_id", caseId)
  const pending = (reqs ?? []).filter((r) => r.status === "pending")

  const blockers: SubmissionGuard["blockers"] = []
  if (emptyNarr.length) {
    blockers.push({
      kind: "disclosure_narrative",
      detail: `${emptyNarr.length} disclosure${emptyNarr.length > 1 ? "s" : ""} need a written explanation`,
    })
  }
  if (pending.length) {
    blockers.push({
      kind: "requirements_pending",
      detail: `${pending.length} requirement${pending.length > 1 ? "s" : ""} still pending`,
    })
  }
  return {
    ok: blockers.length === 0,
    blockers,
    emptyNarrativeCount: emptyNarr.length,
    pendingCount: pending.length,
  }
}
