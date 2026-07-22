/**
 * Checklist categories — journey-ordered groupings for the applicant's view.
 *
 * Grouping is presentation, not data: the registry stays flat and this map is
 * the single place a requirement's category lives. A req_code missing from the
 * map falls into "Everything else" at the end rather than disappearing — a new
 * registry row must never silently vanish from the checklist.
 *
 * Categories render as lightweight LABEL ROWS (mono label + hairline rule +
 * count), never as container boxes — the elevated cards do the separating.
 */

export interface RequirementCategory {
  key: string
  label: string
  /** Journey order. */
  order: number
}

export const CATEGORIES: RequirementCategory[] = [
  { key: "eligibility", label: "Eligibility", order: 1 },
  { key: "identity", label: "Identity & residence", order: 2 },
  { key: "household", label: "Household & references", order: 3 },
  { key: "training", label: "Training", order: 4 },
  { key: "record", label: "Your record & history", order: 5 },
  { key: "storage", label: "Safe & storage", order: 6 },
  { key: "fees", label: "Fees & sign-offs", order: 7 },
  { key: "special", label: "Special tracks", order: 8 },
  { key: "other", label: "Everything else", order: 99 },
]

const CATEGORY_BY_REQ: Record<string, string> = {
  // Eligibility (mostly system-verified, so often empty in the customer view)
  "ELG-01": "eligibility",
  "ELG-02": "eligibility",
  "ELG-03": "eligibility",

  // Identity & residence
  "IDN-01": "identity",
  "IDN-02": "identity",
  "IDN-03": "identity",
  "IDN-04": "identity",
  "RES-01": "identity",
  "NAM-01": "identity",

  // Household & references
  "COH-01": "household",
  "REF-01": "household",
  "REF-02": "household",

  // Training
  "TRN-01": "training",
  "RNW-01": "training",

  // Your record & history
  "DSC-01": "record",
  "QUE-01": "record",
  "ARR-01": "record",
  "OOP-01": "record",
  "DIR-01": "record",
  "DMV-01": "record",
  "GMC-01": "record",
  "SOC-01": "record",

  // Safe & storage
  "SAF-01": "storage",

  // Fees & sign-offs
  "FEE-01": "fees",
  "AFF-01": "fees",
  "FMT-01": "fees",

  // Special tracks
  "MIL-01": "special",
  "LEO-01": "special",
  "LEO-02": "special",
  "LEO-03": "special",
  "OOS-01": "special",
  "OOS-02": "special",
  "PRM-01": "special",
  "SPC-01": "special",
}

export function categoryKeyFor(reqCode: string): string {
  return CATEGORY_BY_REQ[reqCode] ?? "other"
}

/** Group items by category, in journey order, skipping empty categories. */
export function groupByCategory<T extends { reqCode: string }>(
  items: T[]
): { category: RequirementCategory; items: T[] }[] {
  const buckets = new Map<string, T[]>()
  for (const item of items) {
    const key = categoryKeyFor(item.reqCode)
    ;(buckets.get(key) ?? buckets.set(key, []).get(key)!).push(item)
  }
  return CATEGORIES.filter((c) => buckets.has(c.key)).map((category) => ({
    category,
    items: buckets.get(category.key)!,
  }))
}
