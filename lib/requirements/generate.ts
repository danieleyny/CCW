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
  | "carry_not_renewal"
  | "premises_only"
  | "premises_not_renewal"
  | "if_renewal"
  | "if_retired_leo"
  | "if_cohabitants"
  | "unless_cohabitants"
  | "if_arrest_hx"
  | "if_oop_hx"
  | "if_dir_hx"
  | "if_lpr_under_7yr"
  | "if_veteran"
  | "if_name_change"
  | "if_any_q_yes"
  | "if_felony_conviction" // COR-01: portal Q7 felony/serious-offense conviction
  | "if_confidentiality_request" // PBR-01: portal Q17 confidentiality opt-in
  // ── Sponsored armed-guard (Carry Guard) track ──
  // `sponsor_packet` never fires in the generic generator — sponsor-owned rows
  // are seeded by materializeSponsorPacket(), and party='sponsor' rows are
  // filtered out of the generic active set entirely (see materialize.ts).
  | "sponsor_packet"
  | "carry_guard_only"
  | "carry_not_renewal_not_armed" // REF-01 / TRN-01: carry, non-renewal, NOT armed
  | "two_refs_not_renewal" // REF-02: premises OR armed guard, non-renewal
  | "unless_armed" // SOC-01: everyone except an armed guard
  | "if_pre_license_exemption" // PLE-01
  | "if_county_license_doc" // SCG-01 (Branch B)

/**
 * Minimum truthful answer set that drives generation. Disclosures default to
 * false (a conditional requirement only spawns on an explicit "yes"); `isCarry`
 * defaults to true since the product is a carry-license assistant.
 *
 * V3-P1 — track- and renewal-awareness: `isPremises` (premises-business
 * license), `isRenewal` (from cases.is_renewal — references exempt, training
 * becomes a 2-hr refresher), `isRetiredLeo` (separate docs, fee waived).
 */
export interface IntakeAnswers {
  isCarry?: boolean
  isPremises?: boolean
  isRenewal?: boolean
  isRetiredLeo?: boolean
  hasCohabitants?: boolean
  hasArrestHistory?: boolean
  hasOopHistory?: boolean
  hasDomesticIncident?: boolean
  lprUnder7yr?: boolean
  isVeteran?: boolean
  hasNameChange?: boolean
  anyQuestionYes?: boolean
  hasFelonyConviction?: boolean // portal Q7 conviction → Certificate of Relief
  wantsConfidentiality?: boolean // portal Q17 → Public Records Exemption
  // Sponsored armed-guard track — derived by resolveArmedTrack(), never typed in.
  // isArmedGuard is only ever true once the track has RESOLVED to carry_guard or
  // special_carry_guard; an unresolved case seeds only the sponsor packet.
  isArmedGuard?: boolean
  needsPreLicenseExemption?: boolean // PLE-01: armed AND holds no other pistol licence
  needsCountyLicenseDoc?: boolean // SCG-01: Branch B AND holds a county licence
}

/** Does a requirement's trigger condition fire for these answers? */
export function requirementApplies(trigger: string, a: IntakeAnswers): boolean {
  switch (trigger) {
    case "always":
      return true
    case "carry_only":
      return a.isCarry !== false && !a.isPremises // default: carry
    case "carry_not_renewal":
      return a.isCarry !== false && !a.isPremises && !a.isRenewal
    case "premises_only":
      return !!a.isPremises
    case "premises_not_renewal":
      return !!a.isPremises && !a.isRenewal
    case "if_renewal":
      return !!a.isRenewal
    case "if_retired_leo":
      return !!a.isRetiredLeo
    case "if_cohabitants":
      return !!a.hasCohabitants
    case "unless_cohabitants":
      return !a.hasCohabitants
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
    case "if_felony_conviction":
      return !!a.hasFelonyConviction
    case "if_confidentiality_request":
      return !!a.wantsConfidentiality
    // ── Sponsored armed-guard track ──
    case "sponsor_packet":
      return false // never generic — seeded by materializeSponsorPacket()
    case "carry_guard_only":
      return !!a.isArmedGuard
    case "carry_not_renewal_not_armed":
      return a.isCarry !== false && !a.isPremises && !a.isRenewal && !a.isArmedGuard
    case "two_refs_not_renewal":
      return (!!a.isPremises || !!a.isArmedGuard) && !a.isRenewal
    case "unless_armed":
      return !a.isArmedGuard
    case "if_pre_license_exemption":
      return !!a.needsPreLicenseExemption
    case "if_county_license_doc":
      return !!a.needsCountyLicenseDoc
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
