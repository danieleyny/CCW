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
import { runIntakeSystemChecks } from "@/lib/requirements/system-checks"
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
  // V3-P1 — renewal comes from the case, not the wizard.
  const { data: kase } = await admin.from("cases").select("is_renewal, client_id").eq("id", caseId).maybeSingle()
  const isRenewal = !!kase?.is_renewal

  // A4a — record the applicant's track on the client so every admin display and
  // the license-type logic reflects the path they actually chose in intake
  // (previously stuck at the signup default even for premises / retired-LEO).
  if (kase?.client_id) {
    await admin.from("clients").update({ track: trackFromAnswers(answers, jurisdictionKey) }).eq("id", kase.client_id)
  }
  const result = await materializeCaseRequirements(
    admin,
    caseId,
    jurisdictionKey,
    toGeneratorAnswers(answers, { isRenewal })
  )

  // ── V3-P1: training is a decaying asset (≤6 months before submission) ──────
  if (answers.trainingStatus === "completed" && answers.trainingDate) {
    const completed = new Date(`${answers.trainingDate}T00:00:00Z`)
    const expires = new Date(completed)
    expires.setUTCMonth(expires.getUTCMonth() + 6)
    const expiresStr = expires.toISOString().slice(0, 10)
    await admin
      .from("cases")
      .update({ training_completed_on: answers.trainingDate, training_expires_on: expiresStr })
      .eq("id", caseId)
    const expired = expires.getTime() < Date.now()
    await admin
      .from("case_requirements")
      .update({
        notes: expired
          ? `Training completed ${answers.trainingDate} — EXPIRED ${expiresStr}. It must be ≤6 months old at submission; a refresher is needed.`
          : `Training completed ${answers.trainingDate} — valid for submission until ${expiresStr}.`,
      })
      .eq("case_id", caseId)
      .in("req_code", ["TRN-01", "RNW-01"])
  } else {
    await admin
      .from("cases")
      .update({ training_completed_on: null, training_expires_on: null })
      .eq("id", caseId)
  }

  // ── V3-P1: surface the current fee schedule on FEE-01 (config-driven) ──────
  const { data: fees } = await admin.from("fees").select("key, amount_cents").eq("active", true)
  if (fees?.length) {
    const amt = (k: string) => {
      const f = fees.find((x) => x.key === k)
      return f ? `$${(f.amount_cents / 100).toFixed(2).replace(/\.00$/, "")}` : null
    }
    const app = amt("nypd_application")
    const prints = amt("dcjs_fingerprint")
    if (app && prints) {
      await admin
        .from("case_requirements")
        .update({
          notes: answers.isRetiredLeo
            ? `Application fee WAIVED (retired law enforcement); ${prints} DCJS fingerprint fee still owed. Non-refundable; no cash or personal checks.`
            : `Currently ${app} (NYPD application) + ${prints} (DCJS fingerprints, paid separately). Non-refundable; no cash or personal checks.`,
        })
        .eq("case_id", caseId)
        .eq("req_code", "FEE-01")
    }
  }

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

  // ── System-verified controls ──────────────────────────────────────────────
  // The eligibility items were already answered here — asking the applicant to
  // "confirm" them again on the checklist is busywork. Satisfied ONLY where
  // their own answers support it (see lib/requirements/system-checks).
  await runIntakeSystemChecks(admin, caseId, answers)

  return {
    cohabitants: cohabRows.length,
    disclosures: discRows.length,
    applicable: result.applicable,
  }
}

type ClientTrack = Database["public"]["Enums"]["client_track"]

/** Map the interview answers to the applicant's client track (display + logic). */
function trackFromAnswers(a: WizardAnswers, jurisdictionKey: string): ClientTrack {
  if (a.isRetiredLeo) return "retired_leo"
  if (a.licenseType === "premises") return "premises_business"
  if (jurisdictionKey === "special_carry" || a.residence === "non_resident") return "non_resident"
  return "resident"
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
