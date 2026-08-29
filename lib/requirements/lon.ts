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
