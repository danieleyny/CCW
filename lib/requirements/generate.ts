/**
 * Pure requirements generator — no DB, no IO. Given the active registry rows for
 * a jurisdiction and an applicant's intake answers, decide which requirements
 * apply. This is the deterministic core the architecture calls
 * `generateCaseRequirements(profile, answers)`: a rule change is a dated DB edit
 * (the rows fed in here), never a change to this logic.
 */

export type TriggerCond =
  | "always"
  | "carry_only"
  | "if_cohabitants"
  | "if_arrest_hx"
  | "if_oop_hx"
  | "if_dir_hx"
  | "if_lpr_under_7yr"
  | "if_veteran"
  | "if_name_change"
  | "if_any_q_yes"

/**
 * Minimum truthful answer set that drives generation. Disclosures default to
 * false (a conditional requirement only spawns on an explicit "yes"); `isCarry`
 * defaults to true since the product is a carry-license assistant. Populated by
 * the intake wizard in Phase 2; Phase 1 uses sensible defaults.
 */
export interface IntakeAnswers {
  isCarry?: boolean
  hasCohabitants?: boolean
  hasArrestHistory?: boolean
  hasOopHistory?: boolean
  hasDomesticIncident?: boolean
  lprUnder7yr?: boolean
  isVeteran?: boolean
  hasNameChange?: boolean
  anyQuestionYes?: boolean
}

/** Does a requirement's trigger condition fire for these answers? */
export function requirementApplies(trigger: string, a: IntakeAnswers): boolean {
  switch (trigger) {
    case "always":
      return true
    case "carry_only":
      return a.isCarry !== false // default: carry
    case "if_cohabitants":
      return !!a.hasCohabitants
    case "if_arrest_hx":
      return !!a.hasArrestHistory
    case "if_oop_hx":
      return !!a.hasOopHistory
    case "if_dir_hx":
      return !!a.hasDomesticIncident
    case "if_lpr_under_7yr":
      return !!a.lprUnder7yr
    case "if_veteran":
      return !!a.isVeteran
    case "if_name_change":
      return !!a.hasNameChange
    case "if_any_q_yes":
      return !!a.anyQuestionYes
    default:
      return false // unknown trigger → conservative: do not apply
  }
}

export interface ActiveRequirementRow {
  id: string
  req_code: string
  trigger_cond: string
}

export interface GeneratedRequirement {
  requirementId: string
  reqCode: string
  applies: boolean
}

/**
 * Map each active registry row to an applies/N-A decision for this applicant.
 * Returns ALL rows (not just the applicable ones) so the caller can record
 * N/A instances too — that's what makes "exactly what is satisfied / pending /
 * N/A" provable per case.
 */
export function generateCaseRequirements(
  activeRequirements: ActiveRequirementRow[],
  answers: IntakeAnswers
): GeneratedRequirement[] {
  return activeRequirements.map((r) => ({
    requirementId: r.id,
    reqCode: r.req_code,
    applies: requirementApplies(r.trigger_cond, answers),
  }))
}
