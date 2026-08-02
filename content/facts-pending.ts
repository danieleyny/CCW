/**
 * PENDING LEGAL REVIEW — draft fact base for the not-yet-built content cluster.
 *
 * ⚠️  NOTHING IN THIS FILE IS PUBLISHED. It is a STAGING area for NEW legal
 * claims the SEO audit wants (premises-vs-carry, disqualifiers, reciprocity,
 * retired-LEO, license-type comparison). The live rule (content/facts.ts) is
 * "assert nothing new without a primary source AND sign-off." These entries each
 * carry a real primary-source citation, but they have NOT been verified by an
 * attorney, so they must not appear on any client-facing page yet.
 *
 * SAFETY: `tests/facts-pending-not-live.test.ts` fails if anything under app/ or
 * components/ imports this module — a draft physically cannot render live.
 *
 * WORKFLOW:
 *   1. Attorney reviews docs/LEGAL_REVIEW_PENDING_FACTS.md (human-readable
 *      version of everything below, with the exact thing to verify per item).
 *   2. For each APPROVED item, move it into content/facts.ts's FACTS with a
 *      fresh `verifiedOn` date, then the page that uses it can be built.
 *   3. REJECTED / edited items stay here (or are deleted) — never published.
 *
 * Sources are primary where possible. The NYPD's own rules site (38 RCNY Ch. 5)
 * blocks automated fetching, and no NY government page states the reciprocity
 * position in one place, so those items are flagged priority: "high" — the
 * attorney must pin the exact citation before publish.
 */

export interface PendingFact {
  /** Stable key; becomes the FACTS key on promotion. */
  key: string
  /** The claim in plain English — kept GENERAL/statutory, never case-specific. */
  claim: string
  /** Who sets the rule — never "us". */
  authority: string
  /** Primary source (statute/rule text). */
  href: string
  /** Which not-yet-built page(s) this supports. */
  supports: string[]
  /** "high" = I could not reach a primary source; attorney must pin the citation. */
  reviewPriority: "standard" | "high"
  /** The specific thing the attorney must verify / the legal nuance to weigh. */
  reviewNote: string
  status: "pending_legal_review"
}

const p = (f: Omit<PendingFact, "status">): PendingFact => ({ ...f, status: "pending_legal_review" })

// Primary-source URLs (statute/rule text).
const SRC = {
  pen40000: "https://www.nysenate.gov/legislation/laws/PEN/400.00",
  pen26500: "https://www.nysenate.gov/legislation/laws/PEN/265.00",
  pen26520: "https://www.nysenate.gov/legislation/laws/PEN/265.20",
  leosa926c: "https://www.law.cornell.edu/uscode/text/18/926C",
  rcny5: "https://www.nyc.gov/site/nypd/about/about-nypd/rules.page",
} as const

export const PENDING_FACTS: PendingFact[] = [
  // ── License types (premises-vs-carry, license-type comparison) ────────────
  p({
    key: "licenseTypesPremisesVsCarry",
    claim:
      "New York issues distinct handgun license types. A premises license authorizes possessing a handgun only at a specified location — your dwelling or your place of business — while a carry license authorizes carrying a handgun concealed. The unrestricted carry license permits concealed carry without regard to employment or a particular place of possession.",
    authority: "NY Penal Law §400.00(2)",
    href: SRC.pen40000,
    supports: ["/premises-vs-carry", "/license-types"],
    reviewPriority: "high",
    reviewNote:
      "PEN §400.00(2) is the STATE-law backbone (dwelling §(2)(a), business §(2)(b), unrestricted concealed carry §(2)(f)). Before naming types on-page, confirm the NYC License Division's own nomenclature under 38 RCNY Chapter 5 (commonly: Premises Residence, Premises Business, Carry Business, Limited Carry Business, Special Carry Business, Carry Guard) — the NYC rules site blocks automated fetch, so this could not be machine-verified.",
  }),
  p({
    key: "premisesScope",
    claim:
      "A premises license does not authorize carrying the handgun around in public. It covers possession at the licensed location, with limited lawful transport (for example, directly to and from an authorized range) under New York law.",
    authority: "NY Penal Law §400.00; §265.20",
    href: SRC.pen40000,
    supports: ["/premises-vs-carry"],
    reviewPriority: "high",
    reviewNote:
      "Verify the exact transport allowances and citations (PEN §400.00(6) and the §265.20 exemptions) before publishing — transport rules are nuanced and easy to overstate.",
  }),

  // ── Eligibility / disqualifiers (statutory criteria ONLY) ─────────────────
  p({
    key: "eligibilityGoodCharacter",
    claim:
      "New York requires a handgun-license applicant to be of good moral character — defined as having the essential character, temperament, and judgment necessary to be entrusted with a firearm.",
    authority: "NY Penal Law §400.00(1)(b)",
    href: SRC.pen40000,
    supports: ["/disqualifiers", "/eligibility"],
    reviewPriority: "standard",
    reviewNote: "Verbatim-adjacent to §400.00(1)(b). Confirm current statutory wording.",
  }),
  p({
    key: "eligibilityFelonySerious",
    claim:
      "An applicant must not have been convicted anywhere of a felony or a 'serious offense' as defined by New York law, and must not be the subject of an outstanding arrest warrant.",
    authority: "NY Penal Law §400.00(1)(c); §265.00(17)",
    href: SRC.pen40000,
    supports: ["/disqualifiers"],
    reviewPriority: "high",
    reviewNote:
      "'Serious offense' is a defined term (PEN §265.00(17)). DO NOT enumerate specific crimes on-page; state the standard generally and route any specific-conviction question to the attorney-referral seam (Judiciary Law §§478/484). Confirm the §265.00(17) list is current.",
  }),
  p({
    key: "eligibilityControlledSubstance",
    claim:
      "An applicant must not be an unlawful user of, or addicted to, any controlled substance.",
    authority: "NY Penal Law §400.00(1)(e)",
    href: SRC.pen40000,
    supports: ["/disqualifiers"],
    reviewPriority: "standard",
    reviewNote: "Confirm current wording; note the federal parallel (18 U.S.C. §922(g)(3)) if the attorney wants it cited.",
  }),
  p({
    key: "eligibilityMentalHealth",
    claim:
      "An applicant must not have been involuntarily committed to a mental-health facility, and must disclose any history of mental illness on the application.",
    authority: "NY Penal Law §400.00(1)(i)–(j)",
    href: SRC.pen40000,
    supports: ["/disqualifiers"],
    reviewPriority: "standard",
    reviewNote: "Frame carefully and non-stigmatizing; confirm the §400.00(1)(i)/(j) wording and any SAFE Act interplay.",
  }),
  p({
    key: "eligibilityCarryFiveYear",
    claim:
      "For an unrestricted carry license, an applicant must not have been convicted within the preceding five years of certain offenses, including specified assault, misdemeanor driving-while-intoxicated, or menacing offenses.",
    authority: "NY Penal Law §400.00(1)(n)",
    href: SRC.pen40000,
    supports: ["/disqualifiers"],
    reviewPriority: "high",
    reviewNote:
      "Verify the EXACT enumerated offenses and the five-year window against current §400.00(1)(n) before publishing — this is the item most likely to be misstated.",
  }),

  // ── Reciprocity ───────────────────────────────────────────────────────────
  p({
    key: "reciprocityNone",
    claim:
      "New York does not participate in concealed-carry reciprocity. It does not recognize handgun-carry permits issued by other states, and a person generally must hold a valid New York license to carry a handgun in New York.",
    authority: "NY Penal Law §265.01; §265.20; §400.00",
    href: SRC.pen26520,
    supports: ["/reciprocity"],
    reviewPriority: "high",
    reviewNote:
      "Could NOT be confirmed from a single NY government primary source (only secondary legal-info sites). The legal basis is the ABSENCE of an out-of-state-permit exemption in PEN §265.20; the attorney must confirm the precise citation and that the position is current. Do NOT publish a state-by-state 'who honors NY' matrix — frame outbound reciprocity as 'decided by the destination state's law; check that state.'",
  }),

  // ── Retired law enforcement (LEOSA) ───────────────────────────────────────
  p({
    key: "leosaRetired",
    claim:
      "Under the federal Law Enforcement Officers Safety Act (LEOSA), a 'qualified retired law enforcement officer' who meets the statute's conditions — including an aggregate of 10 or more years of service (or separation due to a service-connected disability), separation in good standing, and current annual firearms qualification, plus the required photo identification — may carry a concealed firearm, subject to the statute's limits and to state laws that prohibit carry in specified places.",
    authority: "18 U.S.C. §926C (LEOSA)",
    href: SRC.leosa926c,
    supports: ["/retired-leo"],
    reviewPriority: "standard",
    reviewNote:
      "LEOSA is FEDERAL and separate from a NYC/NY license. Confirm §926C conditions are current, and clarify on-page how the NYPD License Division treats retired-LEO applicants (retired-LEO endorsement) and how LEOSA interacts with New York's sensitive-location restrictions. Keep it informational, not advice.",
  }),
]

/** For docs/tooling: nothing consumes this to render — see the guard test. */
export const PENDING_FACTS_COUNT = PENDING_FACTS.length
