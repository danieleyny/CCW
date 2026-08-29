import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import type { WizardAnswers, ConditionFlags } from "@/lib/intake/answers"

type DB = SupabaseClient<Database>

/**
 * The requirement generator's conditional flags — derived from the CANONICAL stores,
 * not WizardAnswers. A concierge case never fills the wizard, so a Section B "yes"
 * (arrest, order of protection, name change…) lives only in the disclosure store
 * (DSC-01/QUE-01, requirement_answers), the cohabitant roster, and the fact layer.
 * Reading conditions from the wizard left every conditional requirement — the
 * PD 643-041A addendum above all — permanently unspawned for concierge applicants.
 *
 * WizardAnswers stays a fallback for legacy cases; deriveConditionFlags logs which
 * source won, the same way buildApplicationValues does for Section B.
 */
export interface ConditionSources {
  /** Section B answers (q10…q28), DSC-01 preferred, QUE-01 fallback. Null if neither exists. */
  disclosures: Record<string, unknown> | null
  /** Rows in the cohabitant roster — the canonical household list. */
  cohabitantCount: number
  /** A recorded alias / maiden name in the fact layer (a name change by another route). */
  nameChangeFact: boolean
}

const isSectionBKey = (k: string) => /^q\d+a?$/.test(k)
const yes = (v: unknown) => v === "yes" || v === true

/** Load the canonical backing for a case's conditional flags. */
export async function loadConditionSources(admin: DB, caseId: string): Promise<ConditionSources> {
  const [{ data: disc }, { data: cohabs }, { data: nameFact }] = await Promise.all([
    admin.from("requirement_answers").select("req_code, answers").eq("case_id", caseId).in("req_code", ["DSC-01", "QUE-01"]),
    admin.from("cohabitants").select("id").eq("case_id", caseId),
    admin.from("case_facts").select("value").eq("case_id", caseId).eq("key", "applicant.aliasOrMaidenName").is("override_req_code", null).maybeSingle(),
  ])
  const byCode = new Map((disc ?? []).map((r) => [r.req_code, (r.answers ?? {}) as Record<string, unknown>]))
  return {
    disclosures: byCode.get("DSC-01") ?? byCode.get("QUE-01") ?? null,
    cohabitantCount: cohabs?.length ?? 0,
    nameChangeFact: !!(nameFact?.value && String(nameFact.value).trim()),
  }
}

/**
 * Derive the conditional flags, canonical store first and the wizard only as a
 * legacy fallback. Returns the source that won for each family of flags so the
 * caller can log it — a silent store swap is how "the addendum stopped appearing"
 * goes unnoticed.
 */
export function deriveConditionFlags(
  wizard: WizardAnswers | null,
  sources: ConditionSources
): { flags: ConditionFlags; source: Record<string, string> } {
  const d = sources.disclosures
  const hasStore = !!d && Object.keys(d).some(isSectionBKey)
  const source: Record<string, string> = {}

  let anyQuestionYes: boolean
  let hasArrestHistory: boolean
  let hasOopHistory: boolean
  let hasDomesticIncident: boolean
  let hasNameChange: boolean
  let isVeteran: boolean
  // New portal-only flags — no wizard equivalent, so false unless the disclosure store
  // says otherwise.
  let hasFelonyConviction = false
  let wantsConfidentiality = false

  if (hasStore) {
    source.sectionB = "disclosure-store"
    // NYPD ONLINE PORTAL question numbers (lib/disclosures/portal-questions):
    //   q1 alias · q5 armed forces · q7 arrest · q13 OOP against you · q15 domestic
    //   q7_felony felony/serious-offense conviction · q17 confidentiality request.
    anyQuestionYes = Object.entries(d!).some(([k, v]) => isSectionBKey(k) && yes(v))
    hasArrestHistory = yes(d!.q7)
    hasOopHistory = yes(d!.q13)
    hasDomesticIncident = yes(d!.q15)
    hasNameChange = yes(d!.q1)
    isVeteran = yes(d!.q5)
    hasFelonyConviction = yes(d!.q7_felony)
    // Confidentiality is now a separate inline collection (CON-01), not a Section B
    // answer and not a spawned upload — so it no longer drives a condition here.
  } else {
    source.sectionB = "wizard"
    anyQuestionYes =
      (wizard?.questionnaire ?? []).some((q) => q.yes) ||
      (wizard?.arrests?.length ?? 0) > 0 ||
      (wizard?.ordersOfProtection?.length ?? 0) > 0 ||
      (wizard?.domesticIncidents?.length ?? 0) > 0
    hasArrestHistory = (wizard?.arrests?.length ?? 0) > 0
    hasOopHistory = (wizard?.ordersOfProtection?.length ?? 0) > 0
    hasDomesticIncident = (wizard?.domesticIncidents?.length ?? 0) > 0
    hasNameChange = !!wizard?.hasNameChange
    isVeteran = !!wizard?.isVeteran
  }

  // A recorded alias/maiden name is a name change regardless of Q28.
  if (sources.nameChangeFact) hasNameChange = true

  // Household from the roster (canonical), wizard as fallback.
  const hasCohabitants = sources.cohabitantCount > 0 || (wizard?.cohabitants?.length ?? 0) > 0
  source.cohabitants = sources.cohabitantCount > 0 ? "roster" : "wizard"

  return {
    flags: { hasArrestHistory, hasOopHistory, hasDomesticIncident, hasNameChange, isVeteran, anyQuestionYes, hasCohabitants, hasFelonyConviction, wantsConfidentiality },
    source,
  }
}
