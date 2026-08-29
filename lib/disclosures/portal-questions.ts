/**
 * THE NYPD ONLINE PORTAL disclosure questions — the real filing surface. Seventeen
 * questions, in the portal's order, in the portal's exact words. These are SWORN
 * answers: never paraphrase the text or the notes. Each carries a Yes/No; a "Yes"
 * asks for a free-text explanation (except Q17, which is an opt-in request, not a
 * disclosure).
 *
 * This REPLACES the old paper-form Section B (PD 643-041 questions 10–28). The portal
 * set is materially different — see the traps in PORTAL_ALIGNMENT_REBUILD:
 *  · drugs are THREE questions (8, 9, 10), not one;
 *  · Q14 asks if the applicant was the PROTECTED person (not orders issued BY them);
 *  · the subpoena/testimony, other-agency-licence, and BOTH corporate-licence
 *    questions are GONE;
 *  · Q6 is conditional on Q5; Q16 is law-enforcement only; Q17 is a confidentiality
 *    opt-in that, when Yes, requires the Public Records Exemption form.
 *
 * Stored under keys q1…q17 in the canonical disclosure store (requirement_answers,
 * DSC-01). An UNANSWERED question is never recorded or rendered as "No".
 */
export interface PortalDisclosure {
  /** Portal question number, 1–17. The answer key is `q${no}`. */
  no: number
  /** Verbatim question text. Never paraphrase. */
  text: string
  /** A verbatim NOTE shown under the question (Q7's arrest instruction). */
  note?: string
  /** Names the sub-facts the explanation should cover (guidance, not the sworn text). */
  explainHelp?: string
  /** Only asked when the referenced question is "Yes" (Q6 depends on Q5). */
  conditionalOnYesOf?: number
  /** Shown only to law-enforcement applicants (Q16). */
  leoOnly?: boolean
  /** An opt-in REQUEST, not a disclosure: no explanation; a "Yes" creates a
   *  requirement (Q17 → the Public Records Exemption form). */
  isConfidentialityRequest?: boolean
}

export const PORTAL_DISCLOSURES: PortalDisclosure[] = [
  { no: 1, text: "Have you ever used any variation in the spelling of your name, or have you ever used any other name (an alias)?", explainHelp: "List each name or spelling you have used, and when." },
  { no: 2, text: "Have you ever been discharged, fired, or terminated from any employment?", explainHelp: "For each: the employer, the date, and the circumstances." },
  { no: 3, text: "Have you ever been denied appointment to a position in a civil service system, federal, state or local?" },
  { no: 4, text: "Have you ever been rejected for military service?" },
  { no: 5, text: "Have you ever served in the armed forces of this or any other country?", explainHelp: "The branch, country, and dates of service." },
  { no: 6, text: 'If you answered "Yes" to Question Number 5, were you dishonorably discharged?', conditionalOnYesOf: 5 },
  {
    no: 7,
    text: "Have you ever been arrested, indicted, or received a criminal court summons or any other summons, for ANY offense other than a parking violation, in ANY jurisdiction - federal, state, local, or foreign?",
    note:
      "You must answer 'Yes' to this question even if the arrest or summons was dismissed, sealed, voided, or nullified by operation of law. The New York State Division of Criminal Justice Services will report to us every instance involving the arrest of an applicant. DO NOT rely on anyone's representation that you need not list a previous arrest or summons because it was dismissed, sealed, voided or nullified by operation of law. If you were ever convicted of, or pleaded guilty to, a felony, or a serious offense as defined in Penal Law Section 265.00(17), an original Certificate of Relief from Disabilities must be submitted.",
    explainHelp: "For each: the date, the charge(s), the jurisdiction and court, and how it was resolved (the disposition).",
  },
  { no: 8, text: "Have you ever used narcotics, controlled substances, or tranquilizers?" },
  { no: 9, text: "Have you ever used illegal drugs?" },
  { no: 10, text: "Have you ever been addicted to any drug, narcotic, or other substance?" },
  { no: 11, text: "Have you ever been diagnosed with mental illness, or due to mental illness received treatment, been admitted to a hospital or institution, or taken medication?" },
  { no: 12, text: "Have you ever had any disability, condition, illness, or impairment that may interfere with your ability to safely possess or use a firearm? Note, you must list any such disability, condition, illness, or impairment, including, but not limited to, epilepsy, diabetes, fainting spells, blackouts, temporary loss of memory or any nervous disorder." },
  { no: 13, text: "Have you ever had, or do you now have, an Order of Protection issued against you?" },
  { no: 14, text: "Have you ever been the protected person on an Order of Protection?" },
  { no: 15, text: "Have you ever been involved in a domestic incident which was reported to police?" },
  { no: 16, text: "Have your Firearm(s) ever been removed from you or surrendered for any reason throughout your career as a law enforcement?", leoOnly: true },
  // Confidentiality (portal step 11) is NOT a sworn disclosure question — it is a
  // separate inline grounds form (the Public Records Exemption), collected as data,
  // never uploaded. See CON-01 / the confidentiality questionnaire.
]

/** The answer key for a portal disclosure question. */
export const disclosureKey = (no: number) => `q${no}`
/** The explanation key for a portal disclosure question. */
export const disclosureExplainKey = (no: number) => `q${no}_explain`
