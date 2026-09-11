/**
 * ZIP → NYPD precinct derivation (CARRY GUARD task 7 — "derive, never ask").
 *
 * The portal wants a home Precinct (step 1) and a business Precinct (step 3). We NEVER
 * add a precinct question to intake — we derive it from the ZIP the applicant already
 * gave, in the portal's own format exactly: "Borough - 0XX PRECINCT". Staff see that it
 * was derived and can override it; when a ZIP isn't in the table we hand them the portal's
 * Precinct Finder rather than a blank required box (rule 5).
 *
 * Pure and dependency-free, in the shape of lib/references/notary.ts.
 *
 * ⚠ The table below is an intentionally-EMPTY SEED. A NYC ZIP can span more than one
 *   precinct, so a derived value is a STARTING POINT to verify, never an authority — and
 *   a wrong precinct on a sworn filing is worse than none. OPEN: the owner must populate
 *   ZIP_TO_PRECINCT from an authoritative source (NYPD's Precinct Finder, or NYC Open
 *   Data "Police Precincts" intersected with ZIP boundaries). Do NOT guess entries.
 *   Until it is populated, every ZIP falls through to the Precinct Finder link.
 */

export type Borough = "Manhattan" | "Bronx" | "Brooklyn" | "Queens" | "Staten Island"

/** The portal prints precincts as a zero-padded 3-digit number: "Manhattan - 014 PRECINCT". */
export function formatPrecinct(borough: Borough, precinctNumber: number): string {
  return `${borough} - ${String(precinctNumber).padStart(3, "0")} PRECINCT`
}

/** ZIP (5-digit) → { borough, precinct }. SEED ONLY — see the file header; do not guess. */
const ZIP_TO_PRECINCT: Record<string, { borough: Borough; precinct: number }> = {
  // Populate from NYPD's authoritative Precinct Finder before relying on the derivation.
}

/** NYPD's official precinct lookup — the fallback staff use when a ZIP isn't in the table. */
export const PRECINCT_FINDER_URL =
  "https://www.nyc.gov/site/nypd/bureaus/patrol/find-your-precinct.page"

/** The derived precinct string for a ZIP, or null when the ZIP isn't in the table yet. */
export function precinctForZip(zip?: string | null): string | null {
  const z = (zip ?? "").trim().slice(0, 5)
  if (!/^\d{5}$/.test(z)) return null
  const hit = ZIP_TO_PRECINCT[z]
  return hit ? formatPrecinct(hit.borough, hit.precinct) : null
}
