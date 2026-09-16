/**
 * The applicant's consent to a sponsor's access — the gate that must pass before
 * ANY sponsor visibility turns on. Versioned like config/agreements.ts: bumping
 * SPONSOR_CONSENT_VERSION forces re-consent (stored on
 * case_sponsorships.applicant_consent_version), which is exactly what happens when
 * the scope changes.
 *
 * ⚠️ P0.1 — version 2 affirmatively promised the representative could open the
 * applicant's arrest/summons records, orders of protection, domestic-incident
 * records, mental-health adjudications, and Social Security number. That was the
 * bug written into the contract. A sponsoring employer needs exactly three things,
 * all their own: the company's licensing data, the gun custodian, and the sponsored
 * position. The applicant's own file — identity, history, disclosures, SSN — is
 * NEVER the employer's to see (enforced server-side in party_scope(), migration
 * 20260915000100). Version 3 says only that; anyone who consented to v2 must
 * re-consent, and their v2 history is preserved on the row.
 */
export const SPONSOR_CONSENT_VERSION = "3"

/** What the representative CAN do — strictly the company's side of the case. */
export const SPONSOR_CAN_DO = [
  "Complete the company's part of your application — the agency licence, the gun custodian, and the business details",
  "Prepare and upload the company's own forms",
  "See your application's overall progress",
] as const

/** What the representative can NEVER see — your own file stays private to you and
 *  the NYPD License Division. Shown so consent is informed about the LIMIT, not a leak. */
export const SPONSOR_CANNOT_SEE = [
  "Your arrest or summons records, or anything you wrote about them",
  "Orders of protection or domestic-incident records",
  "Mental-health information",
  "Your Social Security number",
  "Your identity documents and other personal details",
] as const

export function sponsorConsentBody(companyName: string, repName: string): string {
  return (
    `I authorize ${repName} of ${companyName} to complete the COMPANY's part of my NYPD ` +
    `armed-guard licence application while they sponsor my licence — the agency licence, the gun ` +
    `custodian, the business details, and the company's own forms — and to see my application's ` +
    `overall progress. I understand ${repName} CANNOT see my own file: not my arrest or summons ` +
    `records or my statements about them, not orders of protection or domestic-incident records, ` +
    `not mental-health information, not my Social Security number, and not my identity documents — ` +
    `those stay private to me and the NYPD License Division. I understand ${repName} can never sign, ` +
    `swear, adopt, or submit anything for me; I file my own application. I can withdraw this access ` +
    `at any time, which cuts it off immediately.`
  )
}
