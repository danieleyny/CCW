/**
 * V3-P3.2 — post-issuance lifecycle math (38 RCNY §§ 5-24, 5-25). The license
 * runs 3 years; these are the clocks a licensee must never miss:
 *   · a purchase authorization is valid 30 days
 *   · one handgun per 90 days
 *   · a purchased handgun must be presented for inspection within 72 hours
 * No `server-only` — the reminder engine and verify harness compute the same
 * windows.
 */

export const AUTH_VALID_DAYS = 30
export const PURCHASE_INTERVAL_DAYS = 90
export const INSPECTION_WINDOW_HOURS = 72
export const RENEWAL_RUNWAY_DAYS = 270 // start the runway at T-9 months

const DAY = 86400000

export function authExpiresOn(authorizedOn: string): string {
  return new Date(new Date(`${authorizedOn}T00:00:00Z`).getTime() + AUTH_VALID_DAYS * DAY)
    .toISOString()
    .slice(0, 10)
}

export function inspectionDueAt(acquiredOn: string): string {
  return new Date(
    new Date(`${acquiredOn}T12:00:00Z`).getTime() + INSPECTION_WINDOW_HOURS * 3600000
  ).toISOString()
}

export function nextEligiblePurchaseOn(lastAcquiredOn: string): string {
  return new Date(new Date(`${lastAcquiredOn}T00:00:00Z`).getTime() + PURCHASE_INTERVAL_DAYS * DAY)
    .toISOString()
    .slice(0, 10)
}

/** § 5-24 duties, in plain language — the guided-report vocabulary. */
export const REPORT_KINDS: { key: string; label: string; hint: string }[] = [
  { key: "address_change", label: "I moved / my address changed", hint: "Address changes must be reported promptly, and your proof-of-residence documents updated." },
  { key: "email_change", label: "My email changed", hint: "The License Division communicates electronically — a stale email can mean missed deadlines." },
  { key: "arrest_or_summons", label: "I was arrested or received a summons", hint: "Any arrest, indictment, or summons (criminal/OATH/TAB) must be reported — candor here protects your license." },
  { key: "psychiatric_treatment", label: "I began psychiatric treatment", hint: "Inpatient or mandated psychiatric care is reportable under § 5-24." },
  { key: "substance_treatment", label: "I began substance-abuse treatment", hint: "Reportable under § 5-24; report promptly and completely." },
  { key: "order_of_protection", label: "An order of protection was issued involving me", hint: "Becoming subject to an OOP/TOP must be reported immediately." },
  { key: "erpo", label: "An extreme-risk (ERPO) order involves me", hint: "ERPO proceedings are reportable immediately." },
  { key: "other", label: "Something else changed", hint: "When in doubt, report — non-disclosure is the thing that costs licenses." },
]
