/**
 * The 62 counties of New York State. A county on a Special Carry case must match the
 * physical county licence exactly, so it is chosen from this list rather than free-typed
 * (a typo silently produces a wrong county on a sworn document). A value outside the list
 * is allowed — an applicant may have lived out of state — but flagged for confirmation,
 * never blocked. ONE list, one component (components/portal/county-input).
 */
export const NY_COUNTIES: readonly string[] = [
  "Albany", "Allegany", "Bronx", "Broome", "Cattaraugus", "Cayuga", "Chautauqua", "Chemung",
  "Chenango", "Clinton", "Columbia", "Cortland", "Delaware", "Dutchess", "Erie", "Essex",
  "Franklin", "Fulton", "Genesee", "Greene", "Hamilton", "Herkimer", "Jefferson", "Kings",
  "Lewis", "Livingston", "Madison", "Monroe", "Montgomery", "Nassau", "New York", "Niagara",
  "Oneida", "Onondaga", "Ontario", "Orange", "Orleans", "Oswego", "Otsego", "Putnam",
  "Queens", "Rensselaer", "Richmond", "Rockland", "Saratoga", "Schenectady", "Schoharie",
  "Schuyler", "Seneca", "Steuben", "St. Lawrence", "Suffolk", "Sullivan", "Tioga", "Tompkins",
  "Ulster", "Warren", "Washington", "Wayne", "Westchester", "Wyoming", "Yates",
]

const NORMALIZED = new Set(NY_COUNTIES.map((c) => c.toLowerCase()))

/** True when the value names a real NY county (case-insensitive). Blank ⇒ true (nothing to flag). */
export function isKnownNyCounty(value: string | null | undefined): boolean {
  const v = (value ?? "").trim().toLowerCase()
  return v === "" || NORMALIZED.has(v)
}
