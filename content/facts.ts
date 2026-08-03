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
/**
 * The content-cluster facts (license types, disqualifiers, reciprocity,
 * retired-LEO) were drafted with primary-source citations, reviewed, and
 * APPROVED through the legal-review pipeline on this date
 * (docs/LEGAL_REVIEW_PENDING_FACTS.md). They carry their own date so provenance
 * stays honest about when each set was verified.
 */
export const FACTS_VERIFIED_LEGAL = "2026-08-02"

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

/** Same, but stamped with the legal-review approval date. */
const fL = (claim: string, authority: string, href: string): Fact => ({
  claim,
  authority,
  href,
  verifiedOn: FACTS_VERIFIED_LEGAL,
})

// Primary-source URLs used by the attorney-approved cluster facts below.
const PEN_40000 = "https://www.nysenate.gov/legislation/laws/PEN/400.00"
const PEN_26520 = "https://www.nysenate.gov/legislation/laws/PEN/265.20"
const LEOSA_926C = "https://www.law.cornell.edu/uscode/text/18/926C"

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
    "How the application is filed depends on your plan: on Self-Guided you file it yourself, and with Full Concierge Gun License NYC files it for you. Either way, a document-preparation service cannot represent you before the License Division — only a New York-licensed attorney may represent an applicant.",
    "NYPD License Division",
    "https://www.nyc.gov/site/nypd/services/law-enforcement/pistol-license.page"
  ),
  discretion: f(
    "The NYPD retains full investigative discretion over the decision.",
    "NYPD License Division",
    "https://www.nyc.gov/site/nypd/services/law-enforcement/pistol-license.page"
  ),

  // ── Attorney-approved content-cluster facts (2026-08-02) ───────────────────
  // License types
  licenseTypes: fL(
    "New York issues distinct handgun license types: a premises license authorizes possessing a handgun at a specified location — a dwelling or a place of business — while a carry license authorizes carrying a handgun concealed. The unrestricted carry license permits concealed carry without regard to employment or a particular place of possession.",
    "NY Penal Law §400.00(2)",
    PEN_40000
  ),
  premisesScope: fL(
    "A premises license does not authorize carrying a handgun in public. It covers possession at the licensed location, with only limited lawful transport — for example, directly to and from an authorized range — under New York law.",
    "NY Penal Law §400.00",
    PEN_40000
  ),
  // Eligibility / disqualifiers (general statutory criteria — never case-specific)
  characterStandard: fL(
    "A handgun-license applicant must be of good moral character — the essential character, temperament, and judgment necessary to be entrusted with a firearm.",
    "NY Penal Law §400.00(1)(b)",
    PEN_40000
  ),
  disqualifyingConvictions: fL(
    "An applicant must not have been convicted anywhere of a felony or a “serious offense” as defined by New York law, and must not be the subject of an outstanding arrest warrant.",
    "NY Penal Law §400.00(1)(c)",
    PEN_40000
  ),
  controlledSubstance: fL(
    "An applicant must not be an unlawful user of, or addicted to, any controlled substance.",
    "NY Penal Law §400.00(1)(e)",
    PEN_40000
  ),
  mentalHealthCriteria: fL(
    "An applicant must not have been involuntarily committed to a mental-health facility, and must disclose any history of mental illness on the application.",
    "NY Penal Law §400.00(1)(i)–(j)",
    PEN_40000
  ),
  carryFiveYearBar: fL(
    "For an unrestricted carry license, an applicant must not have been convicted within the preceding five years of certain offenses, including specified assault, misdemeanor driving-while-intoxicated, or menacing offenses.",
    "NY Penal Law §400.00(1)(n)",
    PEN_40000
  ),
  // Reciprocity
  noReciprocity: fL(
    "New York does not recognize handgun-carry permits issued by other states, and a person generally must hold a valid New York license to carry a handgun in New York.",
    "NY Penal Law §265.20; §400.00",
    PEN_26520
  ),
  // Retired law enforcement (federal LEOSA)
  leosaRetired: fL(
    "Under the federal Law Enforcement Officers Safety Act (18 U.S.C. §926C), a qualified retired law enforcement officer who meets the statute’s conditions — including at least 10 years of service (or separation due to a service-connected disability), separation in good standing, and current annual firearms qualification — may carry a concealed firearm, subject to the statute’s limits and to state laws on where carry is prohibited.",
    "18 U.S.C. §926C (LEOSA)",
    LEOSA_926C
  ),
} as const

export type FactKey = keyof typeof FACTS

/**
 * NEW claims for the not-yet-built content cluster (premises-vs-carry,
 * disqualifiers, reciprocity, retired-LEO, license-type comparison) are drafted
 * in `content/facts-pending.ts` and reviewed in `docs/LEGAL_REVIEW_PENDING_FACTS.md`.
 * On attorney sign-off, move an approved entry HERE (with a fresh verifiedOn date)
 * — that is the only path a new claim becomes publishable.
 */
