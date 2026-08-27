import type { WizardAnswers } from "@/lib/intake/answers"

/**
 * Assemble the fill values for the full NYPD application (PD 643-041) from the ONE
 * fact layer + the intake answers. Pure and testable: `nypd_handgun_application`'s
 * build() maps these clean keys onto the 123 real fields. The SSN is NOT set here —
 * it's ephemeral, merged only at fill time (and never for a sponsor).
 *
 * The applicant reviews and files their OWN application; this only prepares a
 * filled draft. A wrong licence type is consequential, so it's a best-effort tick
 * the applicant confirms — not a claim.
 */

const LICENSE_TYPE_BY_TRACK: Record<string, string> = {
  concealed_carry: "LimitedCarry",
  carry_guard: "CarryGuardSecurity",
  special_carry_guard: "SpecialCarry",
}

export interface ApplicationValues extends Record<string, unknown> {
  residenceOverflow: boolean
  employmentOverflow: boolean
}

export function buildApplicationValues(
  facts: Record<string, string>,
  intake: WizardAnswers,
  opts: { licenseTrack?: string | null } = {}
): ApplicationValues {
  const f = (k: string) => facts[k] ?? ""
  const citizenship = f("applicant.citizenship")
  const premises = intake.licenseType === "premises"

  const residenceHistory = intake.residenceHistory ?? []
  const employmentHistory = intake.employmentHistory ?? []

  const v: ApplicationValues = {
    // Identity (facts)
    lastName: f("applicant.legalLastName"),
    firstName: f("applicant.legalFirstName"),
    mi: f("applicant.legalMiddleInitial"),
    alias: f("applicant.aliasOrMaidenName"),
    street: f("applicant.address.street"),
    apt: f("applicant.address.apt"),
    city: f("applicant.address.city"),
    state: f("applicant.address.state"),
    zip: f("applicant.address.zip"),
    dob: f("applicant.dob"),
    age: f("applicant.age"),
    placeOfBirth: f("applicant.placeOfBirth"),
    height: f("applicant.height"),
    weight: f("applicant.weight"),
    sex: f("applicant.sex"),
    hairColor: f("applicant.hairColor"),
    eyeColor: f("applicant.eyeColor"),
    homePhone: f("applicant.phone.home"),
    cellPhone: f("applicant.phone.cell"),
    email: f("applicant.email"),
    alienReg: f("applicant.alienRegistrationNumber"),
    citizenship: citizenship ? (citizenship === "lpr" ? "Alien" : "Citizen") : "",
    // Employer / business (facts — sponsor-first already resolved)
    businessName: f("employer.name"),
    businessType: f("employer.type"),
    businessStreet: f("employer.address.street"),
    businessCity: f("employer.address.city"),
    businessState: f("employer.address.state"),
    businessZip: f("employer.address.zip"),
    busPhone: f("employer.phone"),
    occupation: f("applicant.jobTitle"),
    // Licence type — best effort, applicant confirms.
    licenseType: premises ? "Premises" : LICENSE_TYPE_BY_TRACK[opts.licenseTrack ?? ""] ?? "",
    premisesType: premises ? "Residence" : "",
    // Out-of-city (Special Handgun only)
    outOfCityLicenseNumber: intake.outOfCityLicenseNumber ?? "",
    outOfCityCounty: intake.outOfCityCounty ?? "",
    outOfCityIssuedOn: intake.outOfCityIssuedOn ?? "",
    outOfCityExpiresOn: intake.outOfCityExpiresOn ?? "",
    // Histories (intake) — the form holds only 4 rows each; flag overflow.
    residenceHistory,
    employmentHistory,
    residenceOverflow: residenceHistory.length > 4,
    employmentOverflow: employmentHistory.length > 4,
    // Q30 / Q31 safeguarding (intake)
    safeguardMethod: intake.safeguardMethod ?? "",
    safeguardName: intake.safeguardName ?? "",
    safeguardRelation: intake.safeguardRelation ?? "",
    safeguardAddress: intake.safeguardAddress ?? "",
    safeguardPhone: intake.safeguardPhone ?? "",
  }

  // Section B 10–28 — Yes/No. 10–22 from the intake questionnaire; 23/24/27/28 from
  // their dedicated flows. 25/26 (an order of protection BY the applicant) have no
  // intake flow, so they're left unanswered for the applicant to tick.
  for (const q of intake.questionnaire ?? []) v[`q${q.no}`] = q.yes ? "Yes" : "No"
  v.q23 = (intake.arrests?.length ?? 0) > 0 ? "Yes" : "No"
  v.q24 = (intake.ordersOfProtection?.length ?? 0) > 0 ? "Yes" : "No"
  v.q27 = (intake.domesticIncidents?.length ?? 0) > 0 ? "Yes" : "No"
  v.q28 = (intake.aliasName ?? "").trim() ? "Yes" : "No"

  return v
}
