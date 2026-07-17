/**
 * THE CITABLE FACT BASE — the only legal claims the marketing pages may assert.
 *
 * WHY THIS EXISTS. The SEO/GEO pages are built to be quoted verbatim by AI, which
 * is the highest-amplification way to publish a wrong legal claim: a bad number
 * doesn't just sit there, it gets repeated at scale and attributed to us. Meanwhile
 * the requirements registry is NOT attorney-verified — `needs_legal_review`
 * defaults true on every row and registry_corrections.sql keeps it true.
 *
 * So the rule (agreed with the owner): assert NOTHING new. Every entry below was
 * already published on this site before this pass — on /resources, /faq, or the
 * checklist HowTo — and every one carries the agency that sets it, a link to the
 * primary source, and the date we last checked. Pages render from this module
 * instead of typing claims freehand, so a page physically cannot invent a fact,
 * and correcting one here corrects it everywhere.
 *
 * DO NOT add an entry without a real primary source. If we can't source it, the
 * page says less. Money amounts are NOT here — fees come from the `fees` table
 * via getFees() so they can never go stale.
 */

/** The day each fact below was last checked against its primary source. */
export const FACTS_VERIFIED = "2026-07-14"

export interface Fact {
  /** The claim, in plain English. */
  claim: string
  /** Who actually sets this rule — never "us". */
  authority: string
  /** Primary source. */
  href: string
  verifiedOn: string
}

const f = (claim: string, authority: string, href: string): Fact => ({
  claim,
  authority,
  href,
  verifiedOn: FACTS_VERIFIED,
})

export const FACTS = {
  training: f(
    "New York's Concealed Carry Improvement Act requires 18 hours of training — 16 hours of classroom instruction plus 2 hours of live-fire — with a state-approved instructor, and a written test passed at 80% or higher.",
    "New York State (CCIA) · DCJS",
    "https://www.criminaljustice.ny.gov/"
  ),
  trainingClock: f(
    "Your training certificate must be dated within 6 months of when you file.",
    "New York State (CCIA)",
    "https://www.criminaljustice.ny.gov/"
  ),
  age: f(
    "You must be at least 21 years old to apply.",
    "NYPD License Division",
    "https://www.nyc.gov/site/nypd/services/law-enforcement/pistol-license.page"
  ),
  timeline: f(
    "Roughly six months is typical from a complete submission to the decision letter, covering the interview, fingerprinting, the FBI background check, and the character investigation.",
    "NYPD License Division",
    "https://www.nyc.gov/site/nypd/services/law-enforcement/pistol-license.page"
  ),
  applicationFee: f(
    "The handgun license application fee is paid directly to the NYPD and is not refundable.",
    "NYPD License Division",
    "https://www.nyc.gov/site/nypd/services/law-enforcement/pistol-license.page"
  ),
  fingerprintFee: f(
    "The fingerprint fee is paid to New York State and is not refundable.",
    "NYS DCJS",
    "https://www.criminaljustice.ny.gov/ojis/fingerprinting.htm"
  ),
  references: f(
    "Four character references are required, and they must be notarized.",
    "38 RCNY Chapter 5",
    "https://www.nyc.gov/site/nypd/about/about-nypd/rules.page"
  ),
  cohabitants: f(
    "A notarized affidavit is required from every adult living in your home.",
    "38 RCNY Chapter 5",
    "https://www.nyc.gov/site/nypd/about/about-nypd/rules.page"
  ),
  socialMedia: f(
    "A three-year list of your social media accounts is part of the application.",
    "New York State (CCIA)",
    "https://www.criminaljustice.ny.gov/"
  ),
  safe: f(
    "Photographs of your gun safe — door open and door closed — are part of the application.",
    "NYPD License Division",
    "https://www.nyc.gov/site/nypd/services/law-enforcement/pistol-license.page"
  ),
  storage: f(
    "New York sets safe-storage rules you must follow once licensed.",
    "NY Penal Law §265.45",
    "https://www.nysenate.gov/legislation/laws/PEN/265.45"
  ),
  disclosure: f(
    "Sealed and dismissed arrests are still disclosed on a New York firearms application.",
    "CPL Article 160",
    "https://www.nyc.gov/site/nypd/about/about-nypd/rules.page"
  ),
  term: f(
    "A NYC carry license is issued for a three-year term.",
    "NYPD License Division",
    "https://www.nyc.gov/site/nypd/services/law-enforcement/pistol-license.page"
  ),
  recertification: f(
    "New York requires firearms recertification on the State's schedule to keep your license from lapsing.",
    "NY State Police",
    "https://firearms.troopers.ny.gov/"
  ),
  youFile: f(
    "You submit your own application. A consulting firm cannot file for you or represent you before the License Division — only a New York-licensed attorney may represent an applicant.",
    "NYPD License Division",
    "https://www.nyc.gov/site/nypd/services/law-enforcement/pistol-license.page"
  ),
  discretion: f(
    "The NYPD retains full investigative discretion over the decision.",
    "NYPD License Division",
    "https://www.nyc.gov/site/nypd/services/law-enforcement/pistol-license.page"
  ),
} as const

export type FactKey = keyof typeof FACTS
