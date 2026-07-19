/**
 * FIELD-BY-FIELD APPLICATION COVERAGE MAP  (MASTER_UPGRADE PART A / Phase 2)
 *
 * Proves we capture every field the OFFICIAL application asks — not just the
 * supporting documents. This is the source of truth for "enough to file": the
 * portal-entry worksheet renders from it, and the admin coverage report reads
 * it to show official-field → captured? → source with GAPs highlighted.
 *
 * ── Source, verbatim, no guessing ───────────────────────────────────────────
 * NYPD PD 643-041 (Rev. 11-10) "Handgun License Application" + instructions
 * PD 643-115 (Rev. 02-15) + addendum PD 643-041A. Read directly from the
 * official packet (17pp), not from memory. Every `formLabel` is the wording on
 * the form. Where the form's own numbering is used it's in `questionNo`.
 *
 * ⚠️ ATTORNEY-REVIEWABLE. A `verify` capture kind means "we believe this is
 * captured but it should be confirmed against the live NYPD online portal,
 * which can differ from the paper form." Do not silently upgrade a `verify` or
 * `gap` to `ok` without checking the actual portal field.
 *
 * ── Deliberate non-storage ──────────────────────────────────────────────────
 * Some required fields are marked `at_filing`: the applicant enters them
 * directly into the NYPD portal and WE NEVER STORE THEM. SSN is the clearest
 * case — storing it would contradict the whole Phase-3 PII-minimisation work
 * and create breach liability for a value the applicant already knows. The
 * worksheet prints a labelled blank, not a stored value.
 */

/** Where an official field's value comes from. */
export type CaptureKind =
  | "intake" //     stored in intake_sessions.answers (a WizardAnswers key)
  | "client" //     a column on the clients row
  | "case" //       a column on the cases row
  | "requirement" // satisfied by a supporting document / requirement code
  | "derived" //    computed from other captured values (e.g. age from dob)
  | "at_filing" //  applicant enters directly at filing; deliberately NOT stored
  | "verify" //     believed captured; confirm against the live portal
  | "gap" //        not captured today — an explicit, flagged hole

/** How complete our capture of a field is, for the report's traffic-light. */
export type CoverageStatus = "ok" | "partial" | "at_filing" | "verify" | "gap"

export interface CoverageField {
  /** Stable id for the worksheet + report. */
  id: string
  /** The section of the paper form this lives in. */
  section:
    | "type" //          license-type selection + renewal
    | "identity" //      Section A fields 1–4
    | "employment" //    Section A fields 5–8 (the business the licence is for)
    | "out_of_city" //   Section A field 9 (special carry)
    | "handguns" //      Section A field 10
    | "questions" //     Section B Q10–28
    | "history" //       Section B Q29 (5-yr residence + employment)
    | "safeguard" //     Section B Q30–31
    | "documents" //     supporting documents named in the instructions/packet
  /** Verbatim label / question text from the form. */
  formLabel: string
  /** The form's own question number, where it has one. */
  questionNo?: string
  capture: { kind: CaptureKind; ref?: string }
  status: CoverageStatus
  /** Criminal-history, health, or identifier data — governs worksheet handling. */
  sensitive?: boolean
  /** Only relevant to some tracks; empty = all applicants. */
  appliesTo?: Array<"carry" | "premises" | "special_carry" | "business" | "renewal">
  notes?: string
}

// ── The map ─────────────────────────────────────────────────────────────────
// Ordered to mirror the paper form top-to-bottom, so the worksheet reads in the
// same order the applicant fills the portal.
export const APPLICATION_COVERAGE = [
  // ── License type + renewal ────────────────────────────────────────────────
  {
    id: "license_type",
    section: "type",
    formLabel:
      "License type: Carry Business · Carry Guard/Security · Retired Police Officer · Limited Carry · Gun Custodian · Premises (Residence/Business) · Special Carry",
    capture: { kind: "intake", ref: "licenseType" },
    status: "partial",
    notes:
      "We capture carry vs premises + residence/non-resident (→ track). We do NOT distinguish Carry-Business vs Carry-Guard vs Limited Carry vs Gun Custodian sub-types.",
  },
  {
    id: "renewal_license_number",
    section: "type",
    formLabel: "License Number (Renewal Applicant) + Year",
    capture: { kind: "at_filing" },
    status: "at_filing",
    appliesTo: ["renewal"],
    notes: "cases.is_renewal is tracked; the prior licence number itself is entered at filing.",
  },
  {
    id: "other_nyc_handgun_license",
    section: "type",
    formLabel: "Do you possess any other NYC Handgun Lic.? If YES: Type, Lic. No.",
    capture: { kind: "intake", ref: "hasOtherLicense" },
    status: "partial",
    notes: "We capture the yes/no; the type + licence number are not stored.",
  },

  // ── Section A · Field 1 — name ────────────────────────────────────────────
  {
    id: "name_last_first",
    section: "identity",
    formLabel: "Last Name · First Name",
    questionNo: "1",
    capture: { kind: "client", ref: "full_name" },
    status: "ok",
  },
  {
    id: "middle_initial",
    section: "identity",
    formLabel: "M.I.",
    questionNo: "1",
    capture: { kind: "intake", ref: "middleInitial" },
    status: "ok",
  },
  {
    id: "maiden_alias",
    section: "identity",
    formLabel: "Maiden Name / Alias",
    questionNo: "1",
    capture: { kind: "intake", ref: "aliasName" },
    status: "ok",
    notes: "Ties to Q28 (name variations) and NAM-01.",
  },

  // ── Section A · Field 2 — legal address ───────────────────────────────────
  {
    id: "legal_address",
    section: "identity",
    formLabel: "Legal Address (Street No.) · Apt. # · City or Town · State · Zip Code",
    questionNo: "2",
    capture: { kind: "intake", ref: "legalStreet" },
    status: "ok",
    notes:
      "Street/apt/city/state now captured in intake; borough + zip also on the clients row for instructor matching.",
  },

  // ── Section A · Field 3 — citizenship / identifiers ───────────────────────
  {
    id: "citizenship",
    section: "identity",
    formLabel: "Citizen / Alien",
    questionNo: "3",
    capture: { kind: "intake", ref: "citizenship" },
    status: "ok",
  },
  {
    id: "alien_registration_number",
    section: "identity",
    formLabel: "Alien Registration Number",
    questionNo: "3",
    capture: { kind: "intake", ref: "alienRegistrationNumber" },
    status: "ok",
    sensitive: true,
    notes: "Conditional — only for non-citizen applicants.",
  },
  {
    id: "ssn",
    section: "identity",
    formLabel: "Social Security Number",
    questionNo: "3",
    capture: { kind: "at_filing" },
    status: "at_filing",
    sensitive: true,
    notes:
      "DELIBERATELY NOT STORED. Required on the application and the physical card must be brought; the applicant enters it directly at filing. Storing it would contradict the Phase-3 PII-minimisation posture. Worksheet prints a labelled blank.",
  },
  {
    id: "residence_precinct",
    section: "identity",
    formLabel: "Res. Pct.",
    questionNo: "3",
    capture: { kind: "gap" },
    status: "gap",
    notes: "Residence precinct — derivable from the legal address; not yet computed.",
  },
  {
    id: "contact_phone_email",
    section: "identity",
    formLabel: "Home Phone No. · Cell Phone No. · Email Address",
    questionNo: "3",
    capture: { kind: "client", ref: "phone" },
    status: "partial",
    notes: "One phone + email on the clients row; the home/cell distinction isn't stored separately.",
  },

  // ── Section A · Field 4 — birth + physical description ─────────────────────
  {
    id: "place_of_birth",
    section: "identity",
    formLabel: "Place of Birth — City, State, Country",
    questionNo: "4",
    capture: { kind: "intake", ref: "placeOfBirth" },
    status: "ok",
  },
  {
    id: "date_of_birth",
    section: "identity",
    formLabel: "Date of Birth",
    questionNo: "4",
    capture: { kind: "intake", ref: "dob" },
    status: "ok",
  },
  {
    id: "age",
    section: "identity",
    formLabel: "Age",
    questionNo: "4",
    capture: { kind: "derived", ref: "dob" },
    status: "ok",
    notes: "Computed from date of birth (lib/intake/answers.ts ageFromDob).",
  },
  {
    id: "physical_description",
    section: "identity",
    formLabel: "Hgt. (inches) · Wgt. · Sex · Color of Hair · Color of Eyes",
    questionNo: "4",
    capture: { kind: "intake", ref: "heightInches" },
    status: "ok",
  },

  // ── Section A · Fields 5–8 — employment (the business the licence is for) ──
  {
    id: "business_identity",
    section: "employment",
    formLabel: "Name of Business · Type of Business · Bus. Pct.",
    questionNo: "5",
    capture: { kind: "intake", ref: "businessName" },
    status: "partial",
    appliesTo: ["business", "premises"],
    notes: "Business name/type captured; business precinct is derivable and not yet computed.",
  },
  {
    id: "business_address",
    section: "employment",
    formLabel: "Business Address (Street No.) · City or Town · State · Zip Code",
    questionNo: "6",
    capture: { kind: "intake", ref: "businessStreet" },
    status: "partial",
    appliesTo: ["business", "premises"],
  },
  {
    id: "business_occupation",
    section: "employment",
    formLabel:
      "Bus. Telephone No./Day · Occupation (Owner / Employee / Gun Custodian) · How many other persons in this business have N.Y.C. Handgun Licenses?",
    questionNo: "7",
    capture: { kind: "intake", ref: "occupation" },
    status: "partial",
    appliesTo: ["business", "premises"],
  },
  {
    id: "company_gun_custodian",
    section: "employment",
    formLabel: "If applicable, list name, job title and license number of company gun custodian",
    questionNo: "8",
    capture: { kind: "at_filing" },
    status: "at_filing",
    appliesTo: ["business"],
    notes: "Third-party licence detail; entered at filing when applicable.",
  },

  // ── Section A · Field 9 — out-of-city licence (special carry) ─────────────
  {
    id: "out_of_city_license",
    section: "out_of_city",
    formLabel:
      "Basic License Number · Issued By · County · Date Issued · Expiration Date (Special Handgun License ONLY)",
    questionNo: "9",
    capture: { kind: "intake", ref: "outOfCityLicenseNumber" },
    status: "ok",
    appliesTo: ["special_carry"],
    notes: "Underpins SPC-01; front/back of the county licence is a separate document gap (see below).",
  },

  // ── Section A · Field 10 — handguns ───────────────────────────────────────
  {
    id: "handguns_list",
    section: "handguns",
    formLabel: "List Handguns for this Application Only (Make/Model/Serial/Caliber/Type/Owner)",
    questionNo: "10",
    capture: { kind: "at_filing" },
    status: "at_filing",
    notes: 'The form says "ORIGINAL APPLICANT LEAVE BLANK" — not applicable to a first-time applicant.',
  },

  // ── Section B · Q10–28 (the yes/no + explain block) ───────────────────────
  // Q23/24-26/27 are handled by the dedicated disclosure flows; the rest are
  // the official questionnaire (lib/intake/answers.ts APPLICATION_QUESTIONS).
  q("10", "Had or ever applied for a Handgun License issued by any Licensing Authority in N.Y.S.?"),
  q("11", "Been discharged from any employment?"),
  q("12", "Used narcotics or tranquilizers? List doctor's name, address, telephone number, in explanation.", true),
  q("13", "Been subpoenaed to, or testified at, a hearing or inquiry conducted by any executive, legislative or judicial body?"),
  q("14", "Been denied appointment in a civil service system, Federal, State, Local?"),
  q("15", "Served in the armed forces of this or any other country?"),
  q("16", "Received a discharge other than honorable?"),
  q("17", "Been rejected for military service?"),
  q("18", "Are you presently engaged in any other employment, business or profession where a need for a firearm exists?"),
  q("19", "Had or applied for any type of license or permit issued to you by any City, State or Federal agency?"),
  q("20", "Has any corporation or partnership of which you are an officer, director, or partner, ever applied for or been issued a license or permit issued by the Police Department?"),
  {
    id: "q20a",
    section: "questions",
    formLabel: "Has any officer, director or partner ever applied for or been issued a license or permit issued by the Police Department?",
    questionNo: "20a",
    capture: { kind: "intake", ref: "questionnaire" },
    status: "ok",
    notes: "Combined with Q20 in the interview — Q20's wording covers both the applicant's own roles and any officer/director/partner.",
  },
  q("21", "Suffered from mental illness, or due to mental illness received treatment, been admitted to a hospital or institution, or taken medication?", true),
  q("22", "Have you ever suffered from any disability or condition that may affect your ability to safely possess or use a handgun? (Epilepsy, Diabetes, Fainting Spells, Blackouts, Temporary Loss of Memory or any Nervous Disorder must be listed.)", true),
  {
    id: "q23_arrests",
    section: "questions",
    formLabel:
      "Been arrested, indicted, or summonsed for ANY offense other than Parking Violations, in ANY jurisdiction? List date, time, charge(s), disposition, court and police agency.",
    questionNo: "23",
    capture: { kind: "intake", ref: "arrests" },
    status: "ok",
    sensitive: true,
    notes: "Drives ARR-01 (Certificate of Disposition + affirmed statement per arrest).",
  },
  {
    id: "q24_26_orders_of_protection",
    section: "questions",
    formLabel:
      "Order of Protection issued against you (24) / by you against a household or family member (25) / by you against another person (26). List court, date, complainant, relationship, reason.",
    questionNo: "24–26",
    capture: { kind: "intake", ref: "ordersOfProtection" },
    status: "partial",
    sensitive: true,
    notes:
      "Drives OOP-01. We capture orders against the applicant; the 'issued by you' direction (Q25/26) isn't separately structured.",
  },
  {
    id: "q27_domestic_incident",
    section: "questions",
    formLabel: "Have the police ever responded to a domestic incident in which you were involved?",
    questionNo: "27",
    capture: { kind: "intake", ref: "domesticIncidents" },
    status: "ok",
    sensitive: true,
    notes: "Drives DIR-01.",
  },
  {
    id: "q28_alias",
    section: "questions",
    formLabel: "Used any variation in spelling of your name or any other name used? (Alias), explain.",
    questionNo: "28",
    capture: { kind: "intake", ref: "aliasName" },
    status: "ok",
    notes: "Drives NAM-01 when a name change exists.",
  },

  // ── Section B · Q29 — five-year histories ─────────────────────────────────
  {
    id: "residence_history",
    section: "history",
    formLabel: "List all places of residence for past FIVE (5) years — From/To, Residence (State, County, Zip, Apt.), Precinct",
    questionNo: "29",
    capture: { kind: "intake", ref: "residenceHistory" },
    status: "ok",
    notes: "Precinct per address is derivable and not yet computed.",
  },
  {
    id: "employment_history",
    section: "history",
    formLabel: "List all places of employment for past FIVE (5) years — From/To, Business Name & Address, Occupation, Precinct",
    questionNo: "29",
    capture: { kind: "intake", ref: "employmentHistory" },
    status: "ok",
  },

  // ── Section B · Q30–31 — safeguarding ─────────────────────────────────────
  {
    id: "safeguard_method",
    section: "safeguard",
    formLabel:
      "How and where will handgun(s) be safeguarded when not in use? (Location outside of N.Y. State is unacceptable.)",
    questionNo: "30",
    capture: { kind: "intake", ref: "safeguardMethod" },
    status: "ok",
    notes: "Drives SAF-01 (safe-storage evidence + photos).",
  },
  {
    id: "safeguard_person",
    section: "safeguard",
    formLabel:
      "Name, address, relation and telephone number of person who will safeguard handgun(s) in case of applicant's death or disability. Must be a N.Y. State resident.",
    questionNo: "31",
    capture: { kind: "intake", ref: "safeguardName" },
    status: "ok",
    notes:
      "The person's own signed Acknowledgement form + their photo ID is a separate document gap (see safeguard_ack_form).",
  },

  // ── Supporting documents named in the instructions / packet ───────────────
  doc("fees", "Two non-refundable fees ($340.00 + $89.75) — certified check / bank check / money order / credit card", "FEE-01"),
  doc("photographs", "Two recent color photographs, 1½ × 1½ inches, front view, face unobscured", "IDN-04"),
  doc("birth_certificate", "Birth Certificate (or military record / U.S. passport / baptismal certificate)", "IDN-02"),
  doc("citizenship_proof", "Proof of Citizenship / Alien Registration (naturalization papers or Alien Registration Card)", "IDN-03"),
  doc("good_conduct_origin", "Good conduct certificate from country of origin (if U.S. resident < 7 years)", "GMC-01", true, "GMC-01's title is ambiguous between this consular certificate and a NYS DOCCS one — see REGISTRY_COVERAGE.md."),
  doc("military_discharge", "Military Discharge — separation papers (DD-214) and your discharge", "MIL-01"),
  doc("proof_of_residence", "Proof of Residence (tax bill, co-op/condo shares, lease; NYS driver licence, NYS tax return, utility bill)", "RES-01"),
  doc("photo_id", "Valid State or Federal Photo Identification", "IDN-01"),
  doc("dmv_abstract", "DMV Lifetime Driving Abstract (38 RCNY — every state of residence, past 5 years)", "DMV-01"),
  doc("arrest_disposition", "Certificate of Disposition + detailed written statement, for every arrest/summons (even if dismissed/sealed)", "ARR-01", true),
  {
    id: "certificate_of_relief",
    section: "documents",
    formLabel:
      "Original Certificate of Relief from Disabilities (if ever convicted of a felony or a serious offense per P.L. §265.00(17))",
    capture: { kind: "gap" },
    status: "gap",
    sensitive: true,
    appliesTo: ["carry", "premises", "special_carry"],
    notes:
      "Named in the arrest instructions and in ARR-01's help text, but not a tracked requirement with its own document. See REGISTRY_COVERAGE.md §13a.",
  },
  doc("order_of_protection_docs", "Order of Protection: copy + detailed written statement", "OOP-01", true),
  doc("business_ownership", "Proof of Business Ownership (filing receipt, certificate of incorporation, licences/permits, proof of business address)", "PRM-01", false, "Bundled — the form lists these as distinct items.", ["business", "premises"]),
  {
    id: "letter_of_necessity",
    section: "documents",
    formLabel:
      "Letter of Necessity (page 3 of the application) — required for ALL carry applicants and premises-for-employment. NO SUBSTITUTES.",
    capture: { kind: "gap" },
    status: "gap",
    appliesTo: ["carry", "business"],
    notes:
      "A mandatory carry-application component with six specified statements. No requirement code exists for it today — a real coverage gap.",
  },
  {
    id: "social_security_card",
    section: "documents",
    formLabel: "Original Social Security card (bring when you apply)",
    capture: { kind: "at_filing" },
    status: "at_filing",
    sensitive: true,
    notes: "A physical card presented at filing. We neither store the number nor a scan of the card.",
  },
  doc("affirmation_rules", "Affirmation of Familiarity with Rules and Law (38 RCNY 5-33)", "AFF-01"),
  doc("cohabitant_affidavit", "Affidavit of Co-Habitant (notarized), one per adult in the home", "COH-01"),
  {
    id: "safeguard_ack_form",
    section: "documents",
    formLabel:
      "Acknowledgement of Person Agreeing to Safeguard Firearm(s) — completed & witnessed by the safeguard, plus a copy of THEIR photo ID",
    capture: { kind: "gap" },
    status: "gap",
    notes:
      "We capture the applicant's safe-storage plan (SAF-01) but not the safeguard person's own signed acknowledgement. Third-party document — see REGISTRY_COVERAGE.md §3.",
  },
  doc("character_references", "Character reference letters, notarized (carry: 4; premises: 2; renewal: exempt)", "REF-01"),
  doc("training_certificate", "DCJS-approved training — 16-hr classroom + 2-hr live-fire (carry / special carry)", "TRN-01", false, undefined, ["carry", "special_carry"]),
  {
    id: "social_media_list",
    section: "documents",
    formLabel: "Three-year social-media account list (P.L. §400.00(1)(o)(iv))",
    capture: { kind: "requirement", ref: "SOC-01" },
    status: "at_filing",
    notes: "ENJOINED (Antonyuk v. James) — not currently enforced. Optional; never blocks filing. See Phase 1.",
  },
] as const satisfies readonly CoverageField[]

// ── Small builders keep the big literal readable ─────────────────────────────
function q(no: string, formLabel: string, sensitive = false): CoverageField {
  return {
    id: `q${no.replace(/[^0-9a-z]/gi, "")}`,
    section: "questions",
    formLabel,
    questionNo: no,
    // The yes/no + explanation lives in the official questionnaire answer set
    // (lib/intake/answers.ts QUESTIONNAIRE — the existing storage key, now
    // carrying the real form wording instead of the old paraphrase).
    capture: { kind: "intake", ref: "questionnaire" },
    status: "ok",
    sensitive,
  }
}

function doc(
  id: string,
  formLabel: string,
  reqCode: string,
  sensitive = false,
  notes?: string,
  appliesTo?: CoverageField["appliesTo"]
): CoverageField {
  return {
    id,
    section: "documents",
    formLabel,
    capture: { kind: "requirement", ref: reqCode },
    status: "ok",
    ...(sensitive ? { sensitive } : {}),
    ...(notes ? { notes } : {}),
    ...(appliesTo ? { appliesTo } : {}),
  }
}

// ── Derived lookups (the config/stages.ts idiom) ─────────────────────────────
export type CoverageId = (typeof APPLICATION_COVERAGE)[number]["id"]

export const COVERAGE_SECTIONS = [
  { key: "type", label: "License type" },
  { key: "identity", label: "Applicant identity (Section A)" },
  { key: "employment", label: "Employment / business (Section A)" },
  { key: "out_of_city", label: "Out-of-city license (Special Carry)" },
  { key: "handguns", label: "Handguns" },
  { key: "questions", label: "Questions 10–28 (Section B)" },
  { key: "history", label: "Five-year histories (Q29)" },
  { key: "safeguard", label: "Safeguarding (Q30–31)" },
  { key: "documents", label: "Supporting documents" },
] as const

export function coverageBySection(section: CoverageField["section"]): CoverageField[] {
  return APPLICATION_COVERAGE.filter((f) => f.section === section)
}

/** The honest gap list — anything not fully captured and not deliberate. */
export function coverageGaps(): CoverageField[] {
  return APPLICATION_COVERAGE.filter((f) => f.status === "gap" || f.status === "verify")
}

/** Roll-up for the report header. */
export function coverageSummary() {
  const by = (s: CoverageStatus) => APPLICATION_COVERAGE.filter((f) => f.status === s).length
  return {
    total: APPLICATION_COVERAGE.length,
    ok: by("ok"),
    partial: by("partial"),
    atFiling: by("at_filing"),
    verify: by("verify"),
    gap: by("gap"),
  }
}
