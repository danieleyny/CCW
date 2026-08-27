/**
 * The NYPD/HRA form template registry. The PDF bytes live in
 * assets/form-templates/ (read like the fonts in lib/pdf/builder.ts); this
 * module maps our questionnaire answers onto each form's REAL AcroForm fields.
 * We fill the official document — never a facsimile.
 *
 * The STATIC descriptors (signatureField, dateField, dateSplit, signable,
 * notarize, fontSize) are plain template properties, NOT returned by build() —
 * so signing can't accidentally depend on data values. `build(v)` returns only
 * the data to write. `ephemeral` names fields collected only to fill the PDF and
 * NEVER persisted (the SSN). `downloadOnly` templates have no build() — we hold
 * them but do not fill them.
 *
 * INVARIANTS (enforced by scripts/verify-form-templates.ts):
 *  - isFillable true ⇒ the PDF actually exposes AcroForm fields to pdf-lib.
 *  - every field build() emits (and every declared signature/date field) exists
 *    on the PDF, across every conditional branch.
 *  - a template never declares both signable and notarize.
 *  - no two templates share a file/sha256.
 */

export interface FormTemplate {
  key: string
  file: string
  officialTitle: string
  formNumber?: string
  revision?: string
  issuingAuthority: string
  /** Where we fetched it. Some forms are served at more than one slug (same file). */
  sourceUrl: string
  sourceUrls?: string[]
  isFillable: boolean
  /** Collected to fill the PDF, never saved to requirement_answers. */
  ephemeral?: string[]
  /** Filled-and-signed sworn document — the APPLICANT adopts (mutually excl. notarize). */
  signable?: boolean
  /** The form's own instructions require a notary — generate filled + UNSIGNED. */
  notarize?: boolean
  /** Held only — no build(), not reachable from a "Complete this form" control. */
  downloadOnly?: boolean
  /** AcroForm signature field the adopted signature is drawn onto (signable forms). */
  signatureField?: string
  /** SIGNING-date field (a single field). Never a data date. */
  dateField?: string
  /** SIGNING-date split fields, by NAME (only where the form splits the signing date). */
  dateSplit?: { mm: string; dd: string; yyyy: string }
  /** Explicit font size so values match the form's own type and don't clip (M4). */
  fontSize?: number
  /** Per-field explicit font sizes (a narrow column the auto-fit floor can't save,
   *  e.g. 6pt occupation / 7pt Q31). The auto-fitter still shrinks further if needed. */
  fieldFontSize?: Record<string, number>
  /** PDF field names that MUST be non-empty for the form to count as complete. */
  requires?: string[]
  /** Fields legitimately blank until signing / assigned by the agency (signature,
   *  signing date, notary blocks, control numbers). Documentation of the third bucket. */
  signatureOnly?: string[]
  /**
   * Data to write onto the real fields. Absent ⇒ download-only.
   *  - `text`    single-value text fields.
   *  - `checks`  single-widget checkboxes (on-value only) — pdf-lib's `.check()`.
   *  - `choices` DUAL-widget NYPD checkboxes (SectionB*, LicenseType, AlienOrCitizen):
   *              value is the on-value NAME to select (`"Yes"`, `"CarryGuardSecurity"`).
   *              Applied via setNypdChoice, which throws on no match — never the
   *              `.check()` trap that always ticks the first widget.
   */
  build?: (v: Record<string, unknown>) => {
    text?: Record<string, string | undefined>
    checks?: Record<string, boolean>
    choices?: Record<string, string | undefined>
  }
}

const s = (v: unknown): string => (v == null ? "" : String(v))
const isYes = (v: unknown): boolean => v === true || v === "yes"

/** PD 643-041 Section B question numbers, in form order (24/25/26 are separate,
 *  20 folds 20a). Mirrors SECTION_B_QUESTIONS in questionnaires.ts — the numbers are
 *  fixed by the form, so kept inline here to avoid a lib/forms → lib/requirements dep. */
const SECTION_B_NUMBERS = [
  "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22",
  "23", "24", "25", "26", "27", "28",
]
/** Intake stores DOB as YYYY-MM-DD → the three parts, or "" when absent. */
function dobParts(v: unknown): { mm: string; dd: string; yyyy: string } {
  const [yyyy = "", mm = "", dd = ""] = s(v).split("-")
  return { mm, dd, yyyy }
}

const BASE = "https://licensing.nypdonline.org/additional-forms"

export const FORM_TEMPLATES: Record<string, FormTemplate> = {
  // ── Child Support Certification (HRA M-522) — sworn, NOT notarised ──────────
  // The MM/DD/YYYY fields on THIS form are the DATE OF BIRTH (top identity block);
  // the signing date is the bottom `Date` field. build() writes DOB into MM/DD/YYYY;
  // signing writes only `Date`. They must never share a code path.
  nypd_child_support_cert: {
    key: "nypd_child_support_cert",
    file: "forms-childsupport.pdf",
    officialTitle: "Child Support Certification",
    formNumber: "M-522",
    revision: "Rev 05/10",
    issuingAuthority: "NYC HRA",
    sourceUrl: `${BASE}/forms-childsupport`,
    isFillable: true,
    ephemeral: ["ssn"],
    signable: true,
    signatureField: "Signature",
    dateField: "Date", // the signing date, bottom of the form
    requires: ["First name", "Last name", "MM", "DD", "YYYY", "Street address", "City", "State", "Zip code"],
    signatureOnly: ["Signature", "Date"],
    fontSize: 9,
    build: (v) => {
      const dob = dobParts(v.dob)
      const checks: Record<string, boolean> = {}
      const text: Record<string, string | undefined> = {
        "Last name": s(v.lastName),
        "First name": s(v.firstName),
        "Social Security Number or ITIN": s(v.ssn),
        "Street address": s(v.street),
        "Apt number": s(v.apt),
        City: s(v.city),
        State: s(v.state),
        "Zip code": s(v.zip),
        // Date of birth — application data, into the top MM/DD/YYYY boxes.
        MM: dob.mm,
        DD: dob.dd,
        YYYY: dob.yyyy,
        "Business name": s(v.empName),
        "Street address_2": s(v.empStreet),
        City_2: s(v.empCity),
        State_2: s(v.empState),
        "Zip code_2": s(v.empZip),
      }
      const obligated = v.obligated === "yes" || v.obligated === true
      if (!obligated) {
        checks["am not under a court or administrative order to pay child support OR 2"] = true
      } else {
        checks["under an obligation to pay child support"] = true
        text["My child support account numbers if applicable"] = s(v.acctNumbers)
        if (v.obligBranch === "a") checks["a"] = true
        else if (v.obligBranch === "b") {
          checks["b"] = true
          if (v.bCondition === "income_exec")
            checks["I am making payments by income execution or by court agreed paymentrepayment plan or by a"] = true
          else if (v.bCondition === "pending")
            checks["My child support obligation is the subject of a pending court proceeding"] = true
          else if (v.bCondition === "public_assist")
            checks["I am currently in receipt of Public Assistance or Supplemental Security Income"] = true
          text["My case number is"] = s(v.caseNumber)
        } else if (v.obligBranch === "c") {
          checks[
            "c I have arrears equal to 4 months or more of child support payments and none of the above statements in"
          ] = true
        }
      }
      return { text, checks }
    },
  },

  // ── Cohabitant Affidavit — SOLO-resident section (COH-02) ───────────────────
  nypd_cohabitant_affidavit: {
    key: "nypd_cohabitant_affidavit",
    file: "forms-cohab.pdf",
    officialTitle: "Affidavit of Co-Habitant (solo-resident section)",
    revision: "Rev 11/16/2023",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/forms-cohab`,
    isFillable: true,
    signable: true, // the solo section is signed by the applicant; NOT notarised
    signatureField: "Signature17",
    dateField: "Date18_af_date",
    fontSize: 9,
    requires: ["Text15", "Text16"],
    signatureOnly: ["Signature17", "Date18_af_date"],
    build: (v) => ({ text: { Text15: s(v.fullName), Text16: s(v.address) } }),
  },

  // ── Cohabitant Affidavit — HOUSEHOLD section, one per adult (COH-01) ─────────
  // Its own instructions: a SEPARATE notarised affidavit per adult cohabitant.
  // Generated filled + UNSIGNED; each person signs before a notary (app/c/[token]).
  nypd_cohabitant_affidavit_household: {
    key: "nypd_cohabitant_affidavit_household",
    file: "forms-cohab.pdf",
    officialTitle: "Affidavit of Co-Habitant (household section)",
    revision: "Rev 11/16/2023",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/forms-cohab`,
    isFillable: true,
    notarize: true, // each cohabitant signs before a notary — never digitally signed
    fontSize: 9,
    requires: ["Text2", "Date19_af_date", "Text4", "Text5", "Text6"],
    signatureOnly: ["Signature10", "Signature11", "Text12", "Text13", "Text14"],
    // Field placement verified against the form's own sentence structure:
    //   "I, <Text2 name>, <Date19 DOB>, residing at <Text4 address>, do hereby
    //    affirm that <Text5 applicant> ... My relationship ... is <Text6> ...
    //    (H)<Text7> (C)<Text8> (W)<Text9>". Signature10 is the cohabitant's (notary).
    build: (v) => ({
      text: {
        Text2: s(v.name),
        Date19_af_date: s(v.dob),
        Text4: s(v.address),
        Text5: s(v.applicantName),
        Text6: s(v.relationship),
        Text7: s(v.phoneHome),
        Text8: s(v.phoneCell),
        Text9: s(v.phoneWork),
      },
    }),
  },

  // ── Request for License Pre-Exemption (38 RCNY §5-09) — NOTARISED ───────────
  // The form states "THIS FORM MUST BE TYPED AND NOTARIZED." Generated filled +
  // UNSIGNED; the applicant + instructor sign before a notary. The instructor's
  // section is completed on paper (M1) — we do not present it as finished.
  nypd_prelicense_exemption: {
    key: "nypd_prelicense_exemption",
    file: "request-pre-exemption.pdf",
    officialTitle: "Request for License Pre-Exemption",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/request-pre-exemption`,
    isFillable: true,
    notarize: true,
    fontSize: 9,
    // The applicant identity + the §5-09 instructor block must ALL be filled — the
    // form is blank only at the two signatures (notarised on paper). The instructor
    // fields are collected in-platform (prelicense_instructor_statements) and
    // composed into the four verified-statement lines here.
    requires: [
      "Applicants Name",
      "Applicants Address",
      "Birth Date",
      "Type of License",
      "Name oflnstructor",
      "Name of Range Address Telephone Number",
      "lnstmctors Verified Statement 1",
      "lnstmctors Verified Statement 2",
      "lnstmctors Verified Statement 3",
      "lnstmctors Verified Statement 4",
    ],
    signatureOnly: ["Applicants Signature", "Instructors Signature", "Application Control Number"],
    build: (v) => {
      // §5-09 verified statement, composed from the instructor's structured answers.
      // Each line is asserted only when the instructor actually attested it, so a
      // missing answer leaves the line blank and the completeness gate flags it —
      // we never fabricate the instructor's sworn statement.
      const instrName = s(v.instructorName)
      const met = v.metApplicant === true || v.metApplicant === "yes"
      const noDanger = v.noDanger === true || v.noDanger === "yes"
      const credentials = s(v.instructorCredentials)
      const location = s(v.trainingLocation)
      const phone = s(v.instructorPhone)
      const line1 =
        instrName && met
          ? `I, ${instrName}, have personally met the applicant and am certified and authorized to provide the required firearms instruction${credentials ? ` (${credentials})` : ""}.`
          : ""
      const line2 = noDanger
        ? "In my professional assessment the applicant poses no danger to himself/herself or to others."
        : ""
      const line3 = location ? `The instruction will take place at: ${location}.` : ""
      const line4 = instrName ? `This statement is verified by me as true and correct.${phone ? ` Instructor telephone: ${phone}.` : ""}` : ""
      // "Range name — address — telephone", where training takes place.
      const rangeLine = [s(v.instructorRangeName), s(v.instructorAddress), phone].filter(Boolean).join(" — ")
      return {
        text: {
          "Applicants Name": s(v.fullName),
          "Applicants Address": s(v.address),
          Age: s(v.age),
          "Birth Date": s(v.dob),
          "Type of License": "Carry Guard",
          "Name oflnstructor": instrName,
          "Name of Range Address Telephone Number": rangeLine,
          "lnstmctors Verified Statement 1": line1,
          "lnstmctors Verified Statement 2": line2,
          "lnstmctors Verified Statement 3": line3,
          "lnstmctors Verified Statement 4": line4,
        },
      }
    },
  },

  // ── Affidavit of Familiarity with Rules and Law (38 RCNY 5-33) — NOTARISED ──
  // The whole sworn paragraph is pre-printed; the only blanks are the venue county
  // and the "sworn to before me this __ day of __, 200_" date. The date is the
  // NOTARY's to write — and the pre-printed "200_" cannot express 2026 anyway — so
  // ThisDay/Month/YearDigit are LEFT BLANK. We fill only the venue county.
  nypd_affidavit_familiarity: {
    key: "nypd_affidavit_familiarity",
    file: "affidavit-familiarity-5-33.pdf",
    officialTitle: "Affidavit of Familiarity with Rules and Law (38 RCNY 5-33)",
    formNumber: "38 RCNY 5-33",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/affidavit-familiarity`,
    isFillable: true,
    notarize: true,
    fontSize: 10,
    requires: ["CountyOf"],
    signatureOnly: ["ThisDay", "Month", "YearDigit"],
    build: (v) => ({ text: { CountyOf: s(v.county) } }),
  },

  // ── Acknowledgement of Person Agreeing to Safeguard Firearm(s) — WITNESSED ──
  // Both signatures (the safeguard's and the witness's) are INK — this form is
  // witnessed, not notarised, and has no signature widget. `notarize:true` here is
  // our "never digitally signed; the ink-signed paper is what satisfies" marker. We
  // fill the applicant + the designated safeguard's identity/contact. Three field
  // names are TRAPS — mapped by POSITION, not name: `Print Name`=LAST name, `NY`=ZIP
  // (state is pre-printed NY), `Telephone Numbers`=HOME phone. The safeguard must be
  // a NY-State resident (validated in the questionnaire).
  nypd_safeguard_acknowledgement: {
    key: "nypd_safeguard_acknowledgement",
    file: "safeguard-acknowledgement.pdf",
    officialTitle: "Acknowledgement of Person Agreeing to Safeguard Firearm(s)",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/safeguard-acknowledgement`,
    isFillable: true,
    notarize: true, // witnessed on paper — never digitally signed (see note above)
    fontSize: 9,
    requires: ["Name of Applicant  Licensee", "Print Name", "First", "Address", "City", "NY"],
    signatureOnly: ["Application  License Number", "Witness name printed", "Date"],
    build: (v) => ({
      text: {
        "Name of Applicant  Licensee": s(v.applicantName),
        "Print Name": s(v.safeguardLastName), // trap: this is the LAST-name box
        First: s(v.safeguardFirstName),
        MI: s(v.safeguardMI),
        Address: s(v.safeguardStreet),
        Apt: s(v.safeguardApt),
        City: s(v.safeguardCity),
        NY: s(v.safeguardZip), // trap: this is the ZIP box (state pre-printed NY)
        "Telephone Numbers": s(v.safeguardHomePhone), // trap: this is the HOME-phone box
        Cell: s(v.safeguardCellPhone),
        Business: s(v.safeguardBusinessPhone),
        name_of_person_agreeing_to_safeguard_fireams: [s(v.safeguardFirstName), s(v.safeguardMI), s(v.safeguardLastName)]
          .filter(Boolean)
          .join(" "),
      },
    }),
  },

  // ── Handgun License Application — Addendum (PD 643-041A) — the OFFICIAL form ──
  // A two-column table of 19 ROW SLOTS: qN holds the NYPD QUESTION NUMBER, qNexp the
  // explanation. We list ONLY the "yes" answers, in form order, keyed by their real
  // question number. QUE-01 fires only when ≥1 answer is yes, so an all-"no" case
  // never produces this. >19 "yes" explanations would need a second copy — flagged
  // (astronomically rare; we fill the first 19 rather than silently over-writing).
  nypd_disclosure_addendum: {
    key: "nypd_disclosure_addendum",
    file: "application-addendum-643-041a.pdf",
    officialTitle: "Handgun License Application — Addendum (PD 643-041A)",
    formNumber: "PD 643-041A",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/643-041a`,
    isFillable: true,
    signable: true,
    fontSize: 9,
    signatureField: "Signature",
    dateField: "Date",
    requires: ["q1", "q1exp"],
    signatureOnly: ["Signature", "Date"],
    build: (v) => {
      const rows = SECTION_B_NUMBERS.filter((no) => isYes(v[`q${no}`])).map((no) => ({
        no,
        exp: s(v[`q${no}_explain`]),
      }))
      const text: Record<string, string> = {}
      rows.slice(0, 19).forEach((r, i) => {
        text[`q${i + 1}`] = r.no // the row slot gets the NYPD question number
        text[`q${i + 1}exp`] = r.exp
      })
      return { text }
    },
  },

  // ── Handgun License Application (PD 643-041) — the FULL 123-field application ──
  // We PREPARE it filled from the fact layer + intake; the applicant reviews, signs,
  // and files it themselves at NYPD (we never file). Neither signable-by-us nor
  // notarised — signature/date blocks stay blank. Traps handled: the 20 Section B
  // /Yes/No boxes + LicenseType/LicenseTypePremises/AlienOrCitizen are dual-widget
  // `choices` (setNypdChoice, throws on no match). Q29 has 4 rows each and row 1 has
  // NO "To" field (the form pre-prints PRESENT). Q31 splits across two lines. Narrow
  // columns (occupation, Q31) get explicit small sizes then auto-fit.
  nypd_handgun_application: {
    key: "nypd_handgun_application",
    file: "handgun-license-application-643-041.pdf",
    officialTitle: "Handgun License Application (PD 643-041)",
    formNumber: "PD 643-041",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/643-041`,
    isFillable: true,
    ephemeral: ["ssn"],
    fontSize: 9,
    fieldFontSize: {
      "Occupation Owner  Employee  Gun Custodian": 6,
      "30_Who_will_guns_be_Safeguarded_by": 7,
      "30_b_Who_will_guns_be_Safeguarded_by": 7,
    },
    requires: ["1_LastName", "1_FirstName", "Date of Birth", "2 Legal Address Street No"],
    signatureOnly: ["AffirmedSignatureDate", "LetterOfNecessitySignatureDate", "Social Security Number"],
    build: (v) => {
      const text: Record<string, string> = {
        "1_LastName": s(v.lastName),
        "1_FirstName": s(v.firstName),
        "1_MI": s(v.mi),
        "Maiden NameAlias": s(v.alias),
        "2 Legal Address Street No": s(v.street),
        Apt: s(v.apt),
        "City or Town": s(v.city),
        State: s(v.state),
        "Zip Code": s(v.zip),
        "Res Pct": s(v.resPct),
        "Alien Registration Number": s(v.alienReg),
        "Social Security Number": s(v.ssn),
        "Home Phone No": s(v.homePhone),
        "Cell Phone No": s(v.cellPhone),
        "Email Address": s(v.email),
        "4 Place of Birth  City State Country": s(v.placeOfBirth),
        Age: s(v.age),
        "Date of Birth": s(v.dob),
        "Hgt inches": s(v.height),
        Wgt: s(v.weight),
        Sex: s(v.sex),
        "Color of Hair": s(v.hairColor),
        "Color of Eyes": s(v.eyeColor),
        "5 Name of Business": s(v.businessName),
        "Type of Business": s(v.businessType),
        "6 Business Address Street No": s(v.businessStreet),
        "City or Town_2": s(v.businessCity),
        State_2: s(v.businessState),
        "Zip Code_2": s(v.businessZip),
        "7 Bus Telephone NoDay": s(v.busPhone),
        "Occupation Owner  Employee  Gun Custodian": s(v.occupation),
        "9 Basic License Number": s(v.outOfCityLicenseNumber),
        "Issued By": s(v.outOfCityIssuedBy),
        County: s(v.outOfCityCounty),
        "Date Issued": s(v.outOfCityIssuedOn),
        "Expiration Date": s(v.outOfCityExpiresOn),
        LicenseNumber_renewal_applicant: s(v.renewalLicenseNumber),
        // Q30 safeguarding + Q31 (SPLIT across two lines: name/relation/address, phone).
        "30_How_will_guns_be_Safeguarded": s(v.safeguardMethod),
        "30_Who_will_guns_be_Safeguarded_by": [s(v.safeguardName), s(v.safeguardRelation), s(v.safeguardAddress)]
          .filter(Boolean)
          .join(", "),
        "30_b_Who_will_guns_be_Safeguarded_by": s(v.safeguardPhone),
      }
      // Letter of necessity (page 4) — the six statements, if collected.
      for (const n of [1, 2, 3, 4, 5, 6]) text[`LetterOfNecessity${n}`] = s(v[`lop${n}`])

      // Q29 histories — 4 rows each; ROW 1 has NO "To" field (PRESENT pre-printed).
      const res = Array.isArray(v.residenceHistory) ? (v.residenceHistory as Record<string, unknown>[]) : []
      res.slice(0, 4).forEach((r, i) => {
        const n = i + 1
        text[`ResidenceFrom${n}`] = s(r.fromMonth)
        if (n > 1) text[`ResidenceTo${n}`] = s(r.toMonth) || "PRESENT"
        text[`ResidenceAddress${n}`] = s(r.address)
      })
      const emp = Array.isArray(v.employmentHistory) ? (v.employmentHistory as Record<string, unknown>[]) : []
      emp.slice(0, 4).forEach((r, i) => {
        const n = i + 1
        text[`EmploymentFrom${n}`] = s(r.fromMonth)
        if (n > 1) text[`EmploymentTo${n}`] = s(r.toMonth) || "PRESENT"
        text[`EmploymentAddress${n}`] = [s(r.employerName), s(r.employerAddress)].filter(Boolean).join(", ")
        text[`EmploymentOccupation${n}`] = s(r.occupation)
      })

      // Dual-widget choices — throw on no match, never the .check() trap.
      const choices: Record<string, string | undefined> = {
        LicenseType: s(v.licenseType) || undefined,
        AlienOrCitizen: s(v.citizenship) || undefined,
        LicenseTypePremises: s(v.premisesType) || undefined,
      }
      // Section B 10–28 (incl. 20a; 24/25/26 separate) — Yes / No.
      for (const no of ["10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "20a", "21", "22", "23", "24", "25", "26", "27", "28"]) {
        const ans = s(v[`q${no}`])
        if (ans === "Yes" || ans === "No") choices[`SectionB${no}`] = ans
      }
      return { text, choices }
    },
  },

  // ── Company / Carry Guard application (SPN-01) — sponsor completes ──────────
  nypd_company_application: {
    key: "nypd_company_application",
    file: "forms-company.pdf",
    officialTitle: "Pistol License Application — Company",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/forms-company`,
    isFillable: true,
    ephemeral: ["ssn"],
    fontSize: 9,
    // Applicant identity AND the company blocks the official form can't be filed
    // blank — the readiness guard (prepareSponsorForm) reports any of these back to
    // the rep by name, so no company form ever generates with an empty licence or
    // custodian block.
    requires: [
      "Name of Applicant Last Name First Name MI",
      "Address Street City or Town Slate Zip Code",
      "Date of Birth",
      "Name of Company Seeking Permit for Applicant",
      "Business Address",
      "Business Telephone Number",
      "Type of Business",
      "License Number",
      "License Expiration Date",
      "Gun Custodian",
      "Pistol License No",
    ],
    signatureOnly: ["INVESTIGATING OFFICERS SIGNATURE", "SUPERVISORS SIGNATURE", "CO LICENSE DIVISION SIGNATURE", "Signature4", "Signature5", "Signature6", "Signature7", "Notary Public", "Application No"],
    build: (v) => ({
      text: {
        "Name of Applicant Last Name First Name MI": s(v.applicantName),
        "Address Street City or Town Slate Zip Code": s(v.applicantAddress),
        "Date of Birth": s(v.dob),
        "Social Security No": s(v.ssn),
        "Name of Company Seeking Permit for Applicant": s(v.companyName),
        "Business Address": s(v.businessAddress),
        "Business Telephone Number": s(v.businessPhone),
        "Type of Business": s(v.businessType),
        "License Type": s(v.wgpLicenseType),
        "License Number": s(v.wgpLicenseNumber),
        "License Expiration Date": s(v.wgpExpire),
        "Gun Custodian": s(v.custodian),
        "Pistol License No": s(v.custodianLicenseNo),
        Position: s(v.position),
        "If License Is Granted What Position Will Applicant Hold": s(v.position),
      },
    }),
  },

  // ── Request for Applicant's Employment Record (investigation, Phase 4) ──────
  // NYPD serves the SAME file at /forms-auth-rel and /form-req-app-emp-rec — one
  // template, both URLs. Filled + printed; the applicant signs on paper.
  //
  // ⚠ KNOWN ASSET BUG (TEMPLATES-MANIFEST.md): forms-auth-rel.pdf is BYTE-IDENTICAL
  // to form-req-app-emp-rec.pdf — both are this employment-record request. The real
  // *Authorization for Release* form was never saved under that name, so any path
  // that means to produce an authorization-for-release currently produces an
  // employment-record request instead. There is no separate authorization-for-release
  // template today. OWNER: source the correct form; do NOT add an aliasing template
  // that reuses this file for a release. (Flagged as a follow-up task.)
  nypd_employment_record_request: {
    key: "nypd_employment_record_request",
    file: "forms-auth-rel.pdf",
    officialTitle: "Request for Applicant's Employment Record",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/form-req-app-emp-rec`,
    sourceUrls: [`${BASE}/form-req-app-emp-rec`, `${BASE}/forms-auth-rel`],
    isFillable: true,
    ephemeral: ["ssn"],
    fontSize: 9,
    requires: ["Name", "Address", "Date Of Birth"],
    signatureOnly: ["Applicants Signature"],
    build: (v) => ({
      text: {
        Name: s(v.fullName),
        Address: s(v.address),
        "Date Of Birth": s(v.dob),
        "Social Security No": s(v.ssn),
      },
    }),
  },

  // ── HIPAA medical release — ENCRYPTED, no fields for pdf-lib → download only ─
  nypd_hipaa_release: {
    key: "nypd_hipaa_release",
    file: "hippa-med.pdf",
    officialTitle: "H.I.P.P.A. Medical Release",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/hippa-med`,
    isFillable: false,
    downloadOnly: true,
  },

  // ── Post-issuance / payment forms — held only (download-only) ────────────────
  nypd_change_address: {
    key: "nypd_change_address",
    file: "change-addr-employ.pdf",
    officialTitle: "Change of Address / Employment",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/change-addr-employ`,
    isFillable: false,
    downloadOnly: true,
  },
  nypd_request_to_sell: {
    key: "nypd_request_to_sell",
    file: "forms-requesttosell.pdf",
    officialTitle: "Request to Sell",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/forms-requesttosell`,
    isFillable: true,
    downloadOnly: true,
  },
  nypd_credit_card_auth: {
    key: "nypd_credit_card_auth",
    file: "credit-card-auth.pdf",
    officialTitle: "Credit Card Authorization",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/credit-card-auth`,
    isFillable: true,
    downloadOnly: true,
  },
  nypd_purchase_auth: {
    key: "nypd_purchase_auth",
    file: "purchase-auth.pdf",
    officialTitle: "Purchase Authorization",
    issuingAuthority: "NYPD License Division",
    sourceUrl: `${BASE}/purchase-auth`,
    isFillable: false,
    downloadOnly: true,
  },
}

export function formTemplate(key: string): FormTemplate | null {
  return FORM_TEMPLATES[key] ?? null
}
