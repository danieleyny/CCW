/**
 * The home-county carry licence's expiry is the single highest-consequence date on a
 * Special Carry case (civilian SPC-01 or sponsored SCG-01): when it passes, the NYC
 * licence voids automatically (38 RCNY §5-25). One helper computes the flag so every
 * surface — the employer board, the staff worksheet, reminders — agrees on the window.
 */

const DAY = 86_400_000

export interface CountyExpiryStatus {
  /** The ISO date as given, or null when unknown. */
  expiry: string | null
  /** Already lapsed — the NYC licence is void until the county licence is renewed. */
  expired: boolean
  /** Within 90 days (and not yet lapsed) — flag it before it becomes a void. */
  expiringSoon: boolean
}

/** Flag a county-licence expiry: expired, or within 90 days. `now` is injectable for tests. */
export function countyExpiryStatus(expiresOn: string | null | undefined, now: number = Date.now()): CountyExpiryStatus {
  const expiry = expiresOn ?? null
  const ms = expiry ? Date.parse(expiry) : NaN
  const expired = Number.isFinite(ms) && ms < now
  const expiringSoon = Number.isFinite(ms) && ms >= now && ms <= now + 90 * DAY
  return { expiry, expired, expiringSoon }
}
