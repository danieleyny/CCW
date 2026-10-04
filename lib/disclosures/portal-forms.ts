/**
 * Statutory inline forms the NYPD portal renders as their own screens on the Special
 * Carry flow — the fee-waiver election (step 13) and the required sworn statements
 * (step 14). Modelled as data so the staff Application tab shows exactly what the portal
 * will ask, in the portal's own words. These are legal text: never paraphrase.
 *
 * Referenced from `config/portal-steps.ts` via `PortalStep.form` and rendered by
 * `lib/disclosures/worksheet-portal.ts`.
 */

/**
 * Step 13 — Law Enforcement Application Fee Waiver. A qualifying retired officer is
 * exempt from the $340 application fee, so a case that qualifies should be flagged
 * BEFORE anyone quotes a price (see `lib/fees.ts` + intake `isRetiredLeo`). The portal
 * offers these as radio options; verbatim, with the citation the portal shows.
 */
export interface FeeWaiverCategory {
  value: string
  label: string
  /** The CPL citation the portal prints beside the option. */
  cite: string
}
export const FEE_WAIVER_CATEGORIES: readonly FeeWaiverCategory[] = [
  { value: "police_nys", label: "Retired police officers from NYS agencies", cite: "CPL 1.20(34)" },
  { value: "tbta", label: "Retired NYS TBTA police officers, sergeants, lieutenants", cite: "CPL 2.10(20)" },
  { value: "correction", label: "Retired correction officers (including officers employed by NYC)", cite: "CPL 2.10(25)" },
  { value: "sheriff_nyc", label: "Retired sheriffs, undersheriffs, deputy sheriffs of the City of New York", cite: "CPL 2.10(2)" },
  { value: "court_officer", label: "Retired NYS uniformed court officers", cite: "CPL 2.10(21a)" },
  { value: "court_clerk", label: "Retired NYS court clerks, 1st and 2nd judicial departments", cite: "CPL 2.10(21b)" },
  { value: "none", label: "None of these categories apply to me", cite: "" },
] as const

/**
 * Step 14 — five required statement boxes. The portal renders ALL FIVE with a required
 * marker on a civilian Special Carry application and blocks progress when they are blank.
 * Two are nevertheless addressed only to Carry Guard/Security applicants. That conflict
 * is real and unresolved: surface it, block finalisation, and never invent an answer.
 *
 * `appliesTo` records which licence types each box is addressed to (the portal's own
 * scoping text). `prefillFrom` names the matching ApplicationValues key so information is
 * collected once and reused rather than retyped or improvised.
 */
export interface SwornStatement {
  no: number
  /** The portal's scoping label — who the box is addressed to. Verbatim. */
  appliesTo: string
  /** What the box asks, in the portal's words. */
  text: string
  /** ApplicationValues key to prefill from, when the box duplicates earlier data. */
  prefillFrom?: string
  /** Addressed only to Carry Guard/Security even though Special Carry marks it required. */
  guardOnly?: boolean
}
export const SWORN_STATEMENTS: readonly SwornStatement[] = [
  {
    no: 1,
    appliesTo: "For Carry Guard/Security handgun license applicants",
    text: "Provide a statement acknowledging that the handgun may only be carried during the course of and strictly in connection with the applicant’s job, business or occupational requirements.",
    prefillFrom: "lop2",
    guardOnly: true,
  },
  {
    no: 2,
    appliesTo: "For all handgun license applicants",
    text: "Provide a statement explaining the manner in which the handgun will be secured when not being used.",
    prefillFrom: "lop3",
  },
  {
    no: 3,
    appliesTo: "For Concealed Carry, Special Carry and Carry Guard/Security handgun license applicants",
    text: "Provide a statement indicating that the applicant has been trained or will receive training in the use and safety of a handgun.",
    prefillFrom: "lop4",
  },
  {
    no: 4,
    appliesTo: "For Carry Guard/Security handgun license applicants",
    text: "A statement acknowledging that the applicant’s employer, or, if self-employed, the applicant, is aware of its, or his or her, responsibility to properly dispose of the handgun and return the license to the License Division upon the termination of the applicant’s employment or the cessation of the business.",
    prefillFrom: "lop5",
    guardOnly: true,
  },
  {
    no: 5,
    appliesTo: "For all handgun license applicants",
    text: "A statement indicating that the applicant has read and is familiar with the provisions of Penal Law Articles 35 (use of deadly force), 265 (criminal possession and use of a firearm) and 400 (responsibilities of a handgun licensee)",
    prefillFrom: "lop6",
  },
] as const

/**
 * A hard process stop, not legal advice: the live civilian Special Carry portal required
 * statements 1 and 4 even though their labels say Carry Guard/Security. Until NYPD or
 * firearms counsel provides a documented instruction, the system may prepare the case
 * but must not declare it ready for irreversible finalisation.
 */
export const SPECIAL_CARRY_GUARD_STATEMENT_CONFLICT = {
  unresolved: true,
  statementNumbers: [1, 4] as const,
  message:
    "NYPD/counsel direction is required for two portal-required statements labelled Carry Guard/Security only. Do not invent wording or finalize until this is resolved.",
} as const

/** Step 18 — five initials fields paired with five required checkboxes. Verbatim from the
 * live Special Carry screen, excluding the UI's trailing required-marker asterisk. */
export interface FinalAcknowledgement {
  no: number
  initialsLabel: string
  text: string
}

export const FINAL_ACKNOWLEDGEMENTS: readonly FinalAcknowledgement[] = [
  {
    no: 1,
    initialsLabel: "Acknowledgement – Compliance – Initials",
    text: "The undersigned affirms and acknowledges that he/she has knowledge of and shall be responsible for compliance with all laws, rules, regulations, standards and procedures, promulgated by federal, state, or local jurisdictions, and by federal, state, or local law enforcement agencies that are applicable to this license.",
  },
  {
    no: 2,
    initialsLabel: "Acknowledgement – Accuracy – Initials",
    text: "The undersigned affirms that the statements made and answers given herein are accurate and complete, and hereby authorizes the New York City Police Department, License Division to make appropriate inquiries in connection with processing this application. False written statements in this document are punishable under Section 210.45 of the New York Penal Law (making a punishable false written statement) and also will be sufficient cause for denial of an application, license or permit by the New York City Police Department, License Division.",
  },
  {
    no: 3,
    initialsLabel: "Acknowledgement – Notarized Release – Initials",
    text: "The undersigned affirms that he/she will provide signed and notarized Release(s) authorizing the License Division to obtain any and all information that the License Division deems relevant to its review of his/her application for a firearm license. A sample Release Form is provided in the Forms section of this website.",
  },
  {
    no: 4,
    initialsLabel: "Acknowledgement – Warning – Initials",
    text: "The undersigned affirms that he/she has read the following warnings: WARNING: THE PRESENCE OF A FIREARM IN THE HOME HAS BEEN ASSOCIATED WITH AN INCREASED RISK OF DEATH TO SELF AND OTHERS, INCLUDING AN INCREASED RISK OF SUICIDE, DEATH DURING DOMESTIC VIOLENCE INCIDENTS, AND UNINTENTIONAL DEATHS TO CHILDREN AND OTHERS. WARNING: RESPONSIBLE FIREARM STORAGE IS THE LAW IN NEW YORK STATE. FIREARMS MUST EITHER BE STORED WITH A GUN LOCKING DEVICE OR IN A SAFE STORAGE DEPOSITORY OR NOT BE LEFT OUTSIDE THE IMMEDIATE POSSESSION AND CONTROL OF THE OWNER OR OTHER LAWFUL POSSESSOR IF A CHILD RESIDES IN THE HOME OR IS PRESENT, OR IF THE OWNER OR POSSESSOR RESIDES WITH A PERSON PROHIBITED FROM POSSESSING A FIREARM UNDER STATE OR FEDERAL LAW. FIREARMS SHOULD BE STORED UNLOADED AND LOCKED IN A LOCATION SEPARATE FROM AMMUNITION. LEAVING FIREARMS ACCESSIBLE TO A CHILD OR OTHER PROHIBITED PERSON MAY SUBJECT YOU TO IMPRISONMENT, FINE, OR BOTH.",
  },
  {
    no: 5,
    initialsLabel: "Acknowledgement – State Mandatory Form – Initials",
    // "from" is the portal's displayed typo; preserve it so staff can match the screen.
    text: "State Mandated warning pursuant to P.L 400.00(18)(b) from must be printed and saved.",
  },
] as const
