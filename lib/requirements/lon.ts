/**
 * Letter-of-Necessity SCOPING — which of the six statements a given licence track
 * actually asks. ONE source of truth, shared by the intake questionnaire dialog (which
 * hides the inapplicable fields) and the staff portal worksheet (which must not flag an
 * inapplicable statement as a missing answer). A concealed-carry applicant answers
 * three, not six.
 *
 * Statement → scope (mirrors the lonScope tags on the "letter-of-necessity"
 * questionnaire fields; keep the two in step):
 *   lop1 business · lop2 guard · lop3 all · lop4 carry · lop5 guard · lop6 all
 */
export const LON_STATEMENT_SCOPE: Record<number, "all" | "carry" | "guard" | "business"> = {
  1: "business",
  2: "guard",
  3: "all",
  4: "carry",
  5: "guard",
  6: "all",
}

export function lonCategoriesFor(track?: string | null): Set<string> {
  const cats = new Set<string>(["all"])
  if (track === "carry_guard" || track === "special_carry_guard") {
    cats.add("carry").add("guard").add("business")
  } else if (track === "premises") {
    cats.add("business")
  } else {
    cats.add("carry") // concealed_carry / special_carry / default
  }
  return cats
}

/** The statement numbers (1–6) a given track actually asks, in order. */
export function lonStatementsFor(track?: string | null): number[] {
  const cats = lonCategoriesFor(track)
  return [1, 2, 3, 4, 5, 6].filter((n) => cats.has(LON_STATEMENT_SCOPE[n]))
}

/**
 * WHICH STATEMENTS APPEAR ON **PORTAL STEP 12**, as opposed to which we COLLECT.
 *
 * These are two different surfaces and conflating them is the bug this constant exists
 * to prevent. Verified against a live walk of the portal (10 Sep 2026):
 *
 *   Portal step 12 for Carry Guard shows exactly FIVE textareas —
 *     1. carried only in the course of / in connection with the job   → lop2 [guard]
 *     2. the manner in which the handgun will be secured              → lop3 [all]
 *     3. has been trained OR will receive training                    → lop4 [carry]
 *     4. EMPLOYER aware of its duty to dispose of the handgun and
 *        return the licence on termination                            → lop5 [guard]
 *     5. familiar with Penal Law Articles 35, 265 and 400             → lop6 [all]
 *
 * `lop1` ("the employment, and why it requires carrying a concealed handgun") is NOT
 * one of them — but it is still REQUIRED. It is the business-need narrative under
 * 38 RCNY § 5-04 that the sponsor supplies (it is the first substantive item on the
 * sponsor onboarding checklist), and the portal's step-15 review page carries a
 * "Letter of neccessity" heading. So lop1 belongs to the LON DOCUMENT, not to the
 * step-12 boxes. Do not "fix" this by dropping lop1 from lonStatementsFor() — that
 * would silently stop collecting something NYPD requires.
 *
 * OPEN: confirm whether NYPD expects lop1 on a separate LON document for Carry Guard
 * or somewhere else in the portal. Until that is answered, REQUIRED_LON_STATEMENTS is
 * left alone.
 */
export function portalStep12StatementsFor(track?: string | null): number[] {
  return lonStatementsFor(track).filter((n) => n !== 1)
}

/** Statements marked required on the questionnaire (the employment description and the
 *  safeguarding statement). Keep in step with the `required: true` fields. */
export const REQUIRED_LON_STATEMENTS = [1, 3]

/** The official PDF field names (`LetterOfNecessityN`) a track ASKS — build() prints
 *  only these; out-of-scope boxes stay blank (Part F4). */
export function lonFieldsFor(track?: string | null): string[] {
  return lonStatementsFor(track).map((n) => `LetterOfNecessity${n}`)
}

/** The REQUIRED fields for a track — required AND in-scope. A required field the
 *  applicant was never shown is a bug by construction (Part F1). */
export function requiredLonFieldsFor(track?: string | null): string[] {
  const visible = new Set(lonStatementsFor(track))
  return REQUIRED_LON_STATEMENTS.filter((n) => visible.has(n)).map((n) => `LetterOfNecessity${n}`)
}
