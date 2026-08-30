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
  opts: {
    licenseTrack?: string | null
    /** The disclosure questionnaire answers (requirement_answers, DSC-01/QUE-01) —
     *  the CANONICAL store for Section B. Keys are `q10`…`q28` (+ `q20a`) with values
     *  "yes"/"no", plus `qN_explain`. This is the ONLY source that sets a sworn
     *  Section B box; an absent answer is "not asked", never "no". */
    disclosures?: Record<string, unknown>
    /** The Letter of Necessity's six statements (LON-01, requirement_answers) —
     *  lop1…lop6. They fill page 4 of the application AND the standalone LON form. */
    letterOfNecessity?: Record<string, unknown>
  } = {}
): ApplicationValues {
  const disclosures = opts.disclosures ?? {}
  const lon = opts.letterOfNecessity ?? {}
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
    mailingDifferent: f("applicant.mailingDifferent") === "Yes",
    mailingStreet: f("applicant.mailing.street"),
    // Building/street are derived at RENDER time (splitStreet) on the worksheet only —
    // the applicant never audits our parser (see ONE_SURFACE_AND_LON_FIXES Part D).
    mailingApt: f("applicant.mailing.apt"),
    mailingCity: f("applicant.mailing.city"),
    mailingState: f("applicant.mailing.state"),
    mailingZip: f("applicant.mailing.zip"),
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
    // Legacy tokens ("citizen"/"lpr") and the readable select values ("U.S. citizen"/
    // "Lawful permanent resident") both resolve correctly.
    citizenship: citizenship ? (/^lpr$/i.test(citizenship) || /permanent resident/i.test(citizenship) ? "Alien" : "Citizen") : "",
    // Employer / business (facts — sponsor-first already resolved)
    businessName: f("employer.name"),
    businessType: f("employer.type"),
    businessStreet: f("employer.address.street"),
    businessCity: f("employer.address.city"),
    businessState: f("employer.address.state"),
    businessZip: f("employer.address.zip"),
    busPhone: f("employer.phone"),
    occupation: f("applicant.jobTitle"),
    employed: f("employer.employed"),
    employmentStartDate: f("employer.startDate"),
    businessUnit: f("employer.unit"),
    priorLicenseNumber: f("applicant.priorLicenseNumber"),
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
    // Q30 / Q31 safeguarding — facts-first (they're now on /portal/details), intake fallback.
    safeguardMethod: f("safeguard.method") || (intake.safeguardMethod ?? ""),
    safeguardName: f("safeguard.name") || (intake.safeguardName ?? ""),
    // The portal has separate first/last name inputs (facts-first; fall back to
    // splitting the legacy combined name).
    safeguardFirstName: f("safeguard.firstName") || (f("safeguard.name") || intake.safeguardName || "").trim().split(/\s+/).filter(Boolean)[0] || "",
    safeguardLastName: f("safeguard.lastName") || (() => { const p = (f("safeguard.name") || intake.safeguardName || "").trim().split(/\s+/).filter(Boolean); return p.length > 1 ? p[p.length - 1] : "" })(),
    safeguardRelation: f("safeguard.relation") || (intake.safeguardRelation ?? ""),
    // Structured address (the portal wants six parts); legacy single line is the fallback.
    safeguardAddress: f("safeguard.street") || f("safeguard.address") || (intake.safeguardAddress ?? ""),
    safeguardApt: f("safeguard.apt"),
    safeguardCity: f("safeguard.city"),
    safeguardState: f("safeguard.state"),
    safeguardZip: f("safeguard.zip"),
    safeguardEmail: f("safeguard.email"),
    safeguardPhone: f("safeguard.phone") || (intake.safeguardPhone ?? ""),
    safeguardIs21: f("safeguard.is21"),
    // The safekeeping LOCATION — a distinct full address (where the handgun is secured).
    safekeepingStreet: f("safekeeping.street"),
    safekeepingApt: f("safekeeping.apt"),
    safekeepingCity: f("safekeeping.city"),
    safekeepingState: f("safekeeping.state"),
    safekeepingZip: f("safekeeping.zip"),
    // Counsel (facts) — most answer No; the name block only applies on Yes.
    counselRepresented: f("counsel.represented"),
    counselFirstName: f("counsel.firstName"),
    counselLastName: f("counsel.lastName"),
    counselFirm: f("counsel.firm"),
    counselEmail: f("counsel.email"),
    counselPhone: f("counsel.phone"),
    // Portal record tables with no scalar home (intake).
    firearms: intake.firearms ?? [],
    otherLicenses: intake.otherLicenses ?? [],
    // Letter of Necessity (page 4) — the six statements, from LON-01.
    lop1: String(lon.lop1 ?? ""),
    lop2: String(lon.lop2 ?? ""),
    lop3: String(lon.lop3 ?? ""),
    lop4: String(lon.lop4 ?? ""),
    lop5: String(lon.lop5 ?? ""),
    lop6: String(lon.lop6 ?? ""),
  }

  // Section B 10–28 — set ONLY from an EXPLICIT recorded answer. Three states matter:
  // answered-yes, answered-no, NOT-ASKED. The disclosure questionnaire (DSC-01/QUE-01,
  // requirement_answers) is canonical; an absent answer means "not asked", NOT "no",
  // and leaves the box /Off. We NEVER infer a sworn "No" from an empty collection — a
  // wrong tick is a false written statement (Penal Law §210.45), sworn by the applicant.
  const isSectionBKey = (k: string) => /^q\d+a?$/.test(k) // q10, q20a, q23 — not qN_explain
  const hasDisclosureStore = Object.keys(disclosures).some(isSectionBKey)
  if (hasDisclosureStore) {
    for (const [k, val] of Object.entries(disclosures)) {
      if (!isSectionBKey(k)) continue
      if (val === "yes" || val === true) v[k] = "Yes"
      else if (val === "no" || val === false) v[k] = "No"
      // anything else → leave unset (not asked)
    }
  } else if ((intake.questionnaire?.length ?? 0) > 0) {
    // LEGACY fallback only: an older case still carrying intake.questionnaire and no
    // disclosure-store answers. Logged so the tail is visible. Keyed by NYPD question
    // number (never array position).
    // eslint-disable-next-line no-console
    console.warn("buildApplicationValues: Section B fell back to legacy intake.questionnaire (no DSC-01/QUE-01 answers)")
    for (const q of intake.questionnaire ?? []) v[`q${q.no}`] = q.yes ? "Yes" : "No"
  }
  // NOTE: q23/q24/q27/q28 are NO LONGER inferred from intake.arrays — an empty array
  // is "not asked". Their explicit yes/no lives in the disclosure store above.

  return v
}
