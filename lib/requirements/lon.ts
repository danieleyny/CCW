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
