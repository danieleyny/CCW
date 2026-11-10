import type { IntakeAnswers as GeneratorAnswers } from "@/lib/requirements/generate"

/**
 * The NYPD licence/application category the applicant is preparing.
 *
 * This is deliberately separate from:
 *  - clients.track (legacy audience/reporting classification), and
 *  - cases.license_track (the sponsored armed-guard routing state).
 *
 * Keeping the legal category explicit prevents "premises" from silently
 * meaning Premise Business when the applicant actually wants a handgun at home.
 */
export const APPLICATION_TYPES = [
  "concealed_carry",
  "premise_residence",
  "premise_business",
  "special_carry",
  "carry_guard",
  "special_carry_guard",
  "retired_leo",
] as const

export type ApplicationType = (typeof APPLICATION_TYPES)[number]

export type ApplicantSelectableApplicationType =
  | "concealed_carry"
  | "premise_residence"
  | "special_carry"

export const APPLICANT_SELECTABLE_APPLICATION_TYPES = [
  "concealed_carry",
  "premise_residence",
  "special_carry",
] as const satisfies readonly ApplicantSelectableApplicationType[]

export const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
  concealed_carry: "Concealed Carry",
  premise_residence: "Premise Residence",
  premise_business: "Premise Business",
  special_carry: "Special Carry",
  carry_guard: "Carry Guard",
  special_carry_guard: "Special Carry Guard",
  retired_leo: "Retired law enforcement",
}

export function isApplicationType(value: unknown): value is ApplicationType {
  return typeof value === "string" && APPLICATION_TYPES.includes(value as ApplicationType)
}

export function isPremiseResidence(type: ApplicationType | null | undefined): boolean {
  return type === "premise_residence"
}

export function isPremisesApplication(type: ApplicationType | null | undefined): boolean {
  return type === "premise_residence" || type === "premise_business"
}

export function applicationTypeNeedsCarryTraining(type: ApplicationType | null | undefined): boolean {
  // Legacy unclassified cases historically behaved as carry. Preserve their
  // interface until staff classifies them; only an explicit premises category
  // may remove carry training from the workflow.
  if (!type) return true
  return !isPremisesApplication(type) && type !== "retired_leo"
}

/** Compatibility value for historical intake sessions. `premises` remains
 * Premise Business; the new home category gets an unambiguous value. */
export function applicationTypeToLegacyLicenseType(
  type: ApplicationType
): "carry" | "premises" | "premise_residence" {
  if (type === "premise_business") return "premises"
  if (type === "premise_residence") return "premise_residence"
  return "carry"
}

export function applicationTypeFromLegacy(input: {
  applicationType?: unknown
  licenseType?: unknown
  residence?: unknown
}): ApplicationType | null {
  if (isApplicationType(input.applicationType)) return input.applicationType
  if (input.licenseType === "premise_residence") return "premise_residence"
  if (input.licenseType === "premises") return "premise_business"
  if (input.licenseType === "carry") {
    return input.residence === "non_resident" ? "special_carry" : "concealed_carry"
  }
  return null
}

/** Minimum licence-category flags for the deterministic requirements engine. */
export function applicationTypeToGeneratorAnswers(type: ApplicationType): GeneratorAnswers {
  const premiseResidence = type === "premise_residence"
  const premiseBusiness = type === "premise_business"
  const premises = premiseResidence || premiseBusiness
  return {
    isCarry: !premises,
    isPremises: premises,
    isPremiseResidence: premiseResidence,
    isPremisesBusiness: premiseBusiness,
    isRetiredLeo: type === "retired_leo",
    isSpecialCarry: type === "special_carry" || type === "special_carry_guard",
    isArmedGuard: type === "carry_guard" || type === "special_carry_guard",
  }
}
