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
