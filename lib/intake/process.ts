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
import { materializeCaseRequirements, materializeSponsorPacket } from "@/lib/requirements/materialize"
import { resolveArmedTrack, type ArmedTrackResult } from "@/lib/requirements/track"
import { backfillCaseFacts } from "@/lib/facts/resolve"
import { syncCohabitants, syncReferences } from "@/lib/requirements/roster"
import { applicablePortalDisclosures } from "./schema"
import { toGeneratorAnswers, type WizardAnswers } from "./answers"

type DB = SupabaseClient<Database>

export interface ProcessIntakeResult {
  cohabitants: number
  references: number
  disclosures: number
  applicable: number
}

/** Translate the intake representation into the canonical DSC-01 answer store.
 * Legacy paper-form sessions are deliberately rejected: Q10 meant something
 * different there, so guessing would create a false sworn answer. */
export function canonicalDisclosureAnswers(answers: WizardAnswers): Record<string, unknown> | null {
  if (answers.questionnaireVersion !== "nypd_portal_v1") return null
  const source = new Map((answers.questionnaire ?? []).map((q) => [q.no, q]))
  const out: Record<string, unknown> = {}
  for (const question of applicablePortalDisclosures(answers)) {
    const answer = source.get(question.no)
    if (!answer) continue // completion validation rejects this; never infer No
    out[`q${question.no}`] = answer.yes ? "yes" : "no"
    if (answer.yes && !question.conditionalOnYesOf && answer.narrative?.trim()) {
      out[`q${question.no}_explain`] = answer.narrative.trim()
    }
  }
  return out
}

export async function processIntake(
  admin: DB,
  caseId: string,
  jurisdictionKey: "nyc" | "special_carry",
  answers: WizardAnswers
): Promise<ProcessIntakeResult> {
  // ── People rosters: sync by name and NEVER delete returned evidence ────────
  // Editing intake used to delete/recreate both rosters, which lost accepted
  // affidavits and left the admin portal showing stale references. The shared
  // roster synchronizer preserves received/notarized rows and updates the real
  // operational tables used by both applicant and admin.
  const cohabPeople = (answers.cohabitants ?? [])
    .filter((c) => c.name?.trim())
    .map((c) => ({
      name: c.name.trim(),
      relationship: c.relationship?.trim() || undefined,
    }))
  await syncCohabitants(admin, caseId, cohabPeople)

  const referencePeople = (answers.references ?? [])
    .filter((r) => r.name?.trim())
    .map((r) => ({ name: r.name.trim(), email: r.email?.trim() || undefined }))
  await syncReferences(admin, caseId, referencePeople)

  // ── Canonical portal disclosures (DSC-01) ─────────────────────────────────
  const canonical = canonicalDisclosureAnswers(answers)
  if (canonical) {
    const { data: prior, error: priorError } = await admin
      .from("requirement_answers")
      .select("answers")
      .eq("case_id", caseId)
      .eq("req_code", "DSC-01")
      .maybeSingle()
    if (priorError) throw priorError
    const old = (prior?.answers ?? {}) as Record<string, unknown>
    // Preserve portal-only subanswers the compact intake does not collect (for
    // example q7_felony). Replace only Q1–16 and their explanation keys.
    const preserved = Object.fromEntries(
      Object.entries(old).filter(([key]) => !/^q(?:[1-9]|1[0-6])(?:_explain)?$/.test(key))
    )
    const { error } = await admin.from("requirement_answers").upsert(
      {
        case_id: caseId,
        req_code: "DSC-01",
        answers: { ...preserved, ...canonical } as never,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "case_id,req_code" }
    )
    if (error) throw error
  }

  // ── Disclosures: rebuild idempotently from the interview ───────────────────
  const { error: deleteDisclosureError } = await admin.from("disclosures").delete().eq("case_id", caseId)
  if (deleteDisclosureError) throw deleteDisclosureError
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
  for (const q of answers.questionnaireVersion === "nypd_portal_v1" ? answers.questionnaire ?? [] : []) {
    if (q.yes && q.no !== 6) {
      // Where a structured row exists it carries better dates/court detail; do
      // not duplicate the same matter as a generic Yes row.
      if (q.no === 7 && (answers.arrests?.length ?? 0) > 0) continue
      if (q.no === 13 && (answers.ordersOfProtection?.length ?? 0) > 0) continue
      if (q.no === 15 && (answers.domesticIncidents?.length ?? 0) > 0) continue
      const spawned = q.no === 7 ? "ARR-01" : q.no === 13 ? "OOP-01" : q.no === 15 ? "DIR-01" : null
      discRows.push({
        case_id: caseId,
        type: "question_yes",
        question_no: q.no,
        narrative: q.narrative ?? "",
        spawned_req_code: spawned,
      })
    }
  }
  let insertedDisc: { id: string; spawned_req_code: string | null }[] = []
  if (discRows.length) {
    const { data, error } = await admin.from("disclosures").insert(discRows).select("id, spawned_req_code")
    if (error) throw error
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

  // ── Sponsored armed-guard (Carry Guard) track — DERIVED, never typed ───────
  // A case with a sponsorship gets its licence category from resolveArmedTrack();
  // everyone else stays concealed_carry. The sponsor packet proceeds regardless,
  // but the applicant's NYPD set is seeded only once the track has RESOLVED — an
  // 'sponsored_unresolved' case must not work a checklist we're not sure about.
  const { data: sponsorship } = await admin
    .from("case_sponsorships")
    .select("id")
    .eq("case_id", caseId)
    .limit(1)
    .maybeSingle()
  const isSponsored = !!sponsorship
  let armed: ArmedTrackResult | null = null
  if (isSponsored) {
    armed = resolveArmedTrack(answers)
    await admin.from("cases").update({ license_track: armed.track }).eq("id", caseId)
  }

  let result: { applicable: number }
  if (isSponsored && !armed!.isArmedGuard) {
    // Unresolved — seed only the company packet, hold the applicant NYPD set.
    result = { applicable: 0 }
  } else {
    result = await materializeCaseRequirements(
      admin,
      caseId,
      jurisdictionKey,
      toGeneratorAnswers(answers, {
        isRenewal,
        jurisdictionKey,
        armed: armed ?? undefined,
      })
    )
  }
  if (isSponsored) {
    await materializeSponsorPacket(admin, caseId)
  }

  // ── Intended-use routing (Special Carry vs Special Carry Guard) ────────────
  // Recorded APPEND-ONLY: intake re-runs on every save, so we log only on an actual
  // CHANGE — and a change between personal and duty carry is a legal-category change, so
  // it raises a staff task and keeps both values (the history). Referral source never
  // enters this; the resolver doesn't take it (lib/requirements/carry-intent).
  if (answers.nycCarryIntent === "personal" || answers.nycCarryIntent === "armed_assignment") {
    const { data: last } = await admin
      .from("case_intent_log")
      .select("intent")
      .eq("case_id", caseId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (last?.intent !== answers.nycCarryIntent) {
      await admin.from("case_intent_log").insert({ case_id: caseId, intent: answers.nycCarryIntent })
      if (last?.intent) {
        // A switch between personal and duty carry — never silent.
        await admin.from("tasks").insert({
          case_id: caseId,
          title: "Carry intent changed — review licence category",
          description: `Intended NYC carry use changed from "${last.intent}" to "${answers.nycCarryIntent}". Personal Special Carry and Special Carry Guard are different legal categories; confirm the case is on the right track.`,
          priority: 1,
          status: "open",
        })
      }
    }
  }

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

  // Seed the canonical fact layer from the interview record (idempotent). Facts
  // resolve from intake as a fallback anyway, but backfilling gives them a home
  // so the "Your details" screen and propagation work from the start.
  await backfillCaseFacts(admin, caseId)

  // ── System-verified controls ──────────────────────────────────────────────
  // The eligibility items were already answered here — asking the applicant to
  // "confirm" them again on the checklist is busywork. Satisfied ONLY where
  // their own answers support it (see lib/requirements/system-checks).
  await runIntakeSystemChecks(admin, caseId, answers)

  return {
    cohabitants: cohabPeople.length,
    references: referencePeople.length,
    disclosures: discRows.length,
    applicable: result.applicable,
  }
}

type ClientTrack = Database["public"]["Enums"]["client_track"]

/** Map the interview answers to the applicant's client track (display + logic). */
function trackFromAnswers(a: WizardAnswers, jurisdictionKey: "nyc" | "special_carry"): ClientTrack {
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
