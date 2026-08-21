/**
 * The applicant's consent to a sponsor's access — the gate that must pass before
 * ANY sponsor visibility turns on. Versioned like config/agreements.ts: bumping
 * SPONSOR_CONSENT_VERSION forces re-consent (stored on
 * case_sponsorships.applicant_consent_version), which is exactly what should
 * happen if the scope is ever widened.
 *
 * Consent must be INFORMED for THIS scope: it names the exact sensitive
 * categories the representative can open. Generic wording is not consent.
 */
export const SPONSOR_CONSENT_VERSION = "1"

/** The sensitive categories a full-scope rep can open — spelled out, by name. */
export const SPONSOR_SENSITIVE_CATEGORIES = [
  "Arrest and summons records, and your written statements about them",
  "Orders of protection",
  "Domestic incident records",
  "Mental-health adjudications",
  "Your Social Security number",
] as const

export function sponsorConsentBody(companyName: string, repName: string): string {
  return (
    `I authorize ${repName} of ${companyName} to view the documents and records on my NYPD ` +
    `licence application while they sponsor my licence. I understand this includes sensitive ` +
    `material — arrest and summons records and my statements about them, orders of protection, ` +
    `domestic incident records, mental-health adjudications, and my Social Security number. ` +
    `I understand every time they open a sensitive document it is recorded, and I can see that ` +
    `record. I understand I can withdraw this access at any time, which cuts it off immediately.`
  )
}
