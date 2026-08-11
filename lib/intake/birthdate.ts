/**
 * Pure helpers for the intake DateOfBirthField. The canonical stored value is
 * `YYYY-MM-DD` (the zod `isoDay` shape); the field edits it as typed month/day/
 * year parts. Kept out of the "use client" component so the calendar validation
 * (which must reject 02/30, 04/31, etc.) is unit-testable.
 */

export interface DateParts {
  y: string
  m: string
  d: string
}

/** Split a YYYY-MM-DD (or anything else) into typed parts; blanks when unset. */
export function partsFromIsoDay(value: string): DateParts {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return { y: "", m: "", d: "" }
  return { y: m[1], m: m[2], d: m[3] }
}

/**
 * Compose typed parts into YYYY-MM-DD, but ONLY if they form a real calendar
 * date in a sane year range. Returns "" for incomplete or impossible dates
 * (02/30, 04/31, month 13, …) so the wizard's existing "enter your DOB" /
 * under-21 validation fires exactly as before.
 */
export function isoDayFromParts(y: string, m: string, d: string): string {
  if (!/^\d{4}$/.test(y) || !/^\d{1,2}$/.test(m) || !/^\d{1,2}$/.test(d)) return ""
  const yi = Number(y)
  const mi = Number(m)
  const di = Number(d)
  if (yi < 1900 || yi > 2100 || mi < 1 || mi > 12 || di < 1 || di > 31) return ""
  // Round-trip through Date to reject impossible day/month combinations.
  const dt = new Date(Date.UTC(yi, mi - 1, di))
  if (dt.getUTCFullYear() !== yi || dt.getUTCMonth() !== mi - 1 || dt.getUTCDate() !== di) return ""
  return `${y}-${String(mi).padStart(2, "0")}-${String(di).padStart(2, "0")}`
}
