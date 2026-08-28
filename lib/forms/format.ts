/**
 * Date formatting at the FORM boundary. We store ISO (YYYY-MM-DD, YYYY-MM) and the
 * NYPD forms want US (MM/DD/YYYY) — and the Q29 history columns literally read
 * "MONTH AND YEAR", i.e. MM/YYYY. Format once, here, applied in build() and the
 * worksheet so the stored value and the rendered value never have to match.
 *
 * Non-ISO input is passed through untouched — a value a human already typed as
 * "04/12/1990" or "March 2021" is left as-is rather than mangled.
 */

/** ISO date (YYYY-MM-DD, optionally with time) → MM/DD/YYYY. */
export function usDate(iso: string | null | undefined): string {
  const v = (iso ?? "").trim()
  if (!v) return ""
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return v
  const [, y, mo, d] = m
  return `${mo}/${d}/${y}`
}

/** ISO month (YYYY-MM) or full ISO date → MM/YYYY. */
export function usMonthYear(iso: string | null | undefined): string {
  const v = (iso ?? "").trim()
  if (!v) return ""
  const m = v.match(/^(\d{4})-(\d{2})/)
  if (!m) return v
  const [, y, mo] = m
  return `${mo}/${y}`
}

// ── The NYPD ONLINE PORTAL's own field formats (PORTAL_ALIGNMENT_REBUILD Part 3).
//    Store canonically; render in the portal's shape on the staff worksheet + the
//    signed record.

/** ISO date → M/D/YYYY, NOT zero-padded (the portal shows 8/23/2002, not 08/23/2002). */
export function portalDate(iso: string | null | undefined): string {
  const v = (iso ?? "").trim()
  if (!v) return ""
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return v
  const [, y, mo, d] = m
  return `${Number(mo)}/${Number(d)}/${y}`
}

/** Total inches → feet-inches with zero-padded inches (70 → 5'10", 65 → 5'05"). */
export function portalHeight(inches: string | number | null | undefined): string {
  const n = typeof inches === "number" ? inches : parseInt(String(inches ?? "").trim(), 10)
  if (!Number.isFinite(n) || n <= 0) return ""
  const ft = Math.floor(n / 12)
  const inch = n % 12
  return `${ft}'${String(inch).padStart(2, "0")}"`
}

/** Pounds → two decimals (180 → 130.00-style: "180.00"). */
export function portalWeight(pounds: string | number | null | undefined): string {
  const n = typeof pounds === "number" ? pounds : parseFloat(String(pounds ?? "").trim())
  if (!Number.isFinite(n) || n <= 0) return ""
  return n.toFixed(2)
}

/** Split a single-line street ("123 Test St") into { buildingNumber, streetName }.
 *  The portal wants them apart; a heuristic split on the leading number keeps the
 *  stored fact single-line while rendering split. A street with no leading number
 *  returns an empty building number and the whole string as the street name. */
export function splitStreet(street: string | null | undefined): { buildingNumber: string; streetName: string } {
  const v = (street ?? "").trim()
  const m = v.match(/^(\d+[A-Za-z]?)\s+(.*)$/)
  if (m) return { buildingNumber: m[1], streetName: m[2] }
  return { buildingNumber: "", streetName: v }
}
