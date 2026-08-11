/**
 * THE NYC GUN LAWS FACT BASE — the entire content spine of nycgunlaws.com.
 *
 * WHY THIS FILE EXISTS. This site is a legal-information publication: almost
 * every sentence on it is a claim about what the law says. That is the highest-
 * amplification way to publish something wrong — AI answer engines quote pages
 * like this verbatim and attribute the error to us. So the same rule the main
 * site follows in content/facts.ts applies here, harder:
 *
 *   A page may not assert a legal claim that is not an entry in this file,
 *   and no entry may exist without a citation to a PRIMARY source.
 *
 * Secondary sources (Giffords, USCCA, law-firm blogs) may be used to FIND the
 * statute. They are never the citation. Three widely-repeated citation errors
 * were caught while building this file and are documented in `KNOWN_ERRORS`
 * below so nobody reintroduces them.
 *
 * REVIEW STATUS. Every claim carries `status`:
 *   "verified" — statutory text read directly against the primary source.
 *   "review"   — drafted with a citation but NOT yet attorney-approved, or the
 *                underlying law is contested//in active litigation. Renders with
 *                a visible caution and is listed in docs/NYCGUNLAWS_LEGAL_REVIEW.md.
 *
 * Renderers must surface `note` wherever it exists. A litigation note is not
 * optional garnish — for §265.01-d and §400.00(1)(o)(iv) it IS the current law.
 *
 * MONEY. No dollar amounts live here. Fees come from the `fees` table via
 * getPublicFees() so they cannot go stale, exactly as on the main site.
 */

/** The day this file was last checked against primary sources. */
export const LAWS_VERIFIED = "2026-08-10"

/** Errors that circulate in published secondary sources. Do not reintroduce. */
export const KNOWN_ERRORS = [
  {
    error: "Citing Penal Law §265.50 as a safe-storage provision.",
    truth: "§265.50 is criminal manufacture, sale or transport of an UNDETECTABLE firearm — a class D felony. The state safe-storage offense is §265.45.",
    seenIn: "Giffords Law Center, New York safe-storage page",
  },
  {
    error: "Citing Penal Law §400.00(16-a) as the semiautomatic rifle license.",
    truth: "§400.00(16-a) is SAFE Act assault-weapon REGISTRATION. The semiautomatic rifle license is in the unlettered paragraph of §400.00(2).",
    seenIn: "Widely repeated across firearm-law summaries",
  },
  {
    error: "Describing §400.00(2)(f) as a 'special carry license'.",
    truth: "§400.00(2)(f) is the ordinary unrestricted concealed carry license. The Special Carry License is a New York City category under 38 RCNY §5-23, implementing the §400.00(6) requirement that a license issued elsewhere in the state is not valid in NYC without an NYPD special permit.",
    seenIn: "Common conflation in out-of-state guidance",
  },
  {
    error: "Stating that §265.01-d (the private-property rule) was struck down entirely.",
    truth: "It is permanently enjoined only as applied to private property held OPEN TO THE PUBLIC (Christian v. James, 2d Cir. May 18, 2026). It remains enforceable as to genuinely private, non-public property.",
    seenIn: "Post-decision coverage in gun-rights media",
  },
] as const

export type ClaimStatus = "verified" | "review"

export interface LawClaim {
  /** The claim in careful plain English. Renderable verbatim; assume it will be quoted. */
  text: string
  /** The statute, rule, or case. Never "us". */
  citation: string
  /** Primary source. */
  href: string
  status: ClaimStatus
  /** Litigation status, scope limits, or a confidence caveat. Renderers MUST show this. */
  note?: string
}

export interface LawSection {
  heading: string
  /** Narrative paragraphs. These may explain and organize, but may not assert new law. */
  body?: string[]
  claims?: LawClaim[]
  /** A definitional or enumerated list — e.g. the sensitive-location categories. */
  list?: { term: string; detail: string }[]
  /** A compact two-column comparison. */
  table?: { head: string[]; rows: string[][] }
}

export interface LawTopic {
  slug: string
  /** Nav / card label. Short. */
  label: string
  /** The H1. */
  title: string
  metaTitle: string
  metaDescription: string
  eyebrow: string
  /**
   * The direct-answer block. Two or three sentences that fully answer the page's
   * query on their own — this is the block written to be lifted by an AI answer
   * engine, so it must be self-contained and correct out of context.
   */
  answer: string
  /** Statutes this page is about, shown as a citation rail. */
  authorities: { citation: string; href: string }[]
  sections: LawSection[]
  faqs: { q: string; a: string }[]
  related: string[]
  updated: string
  /** True if any claim on the page is status:"review" — drives the page-level banner. */
  contested?: boolean
}

// ── Primary-source URLs, named once ─────────────────────────────────────────
const PEN = (s: string) => `https://www.nysenate.gov/legislation/laws/PEN/${s}`
const CPLR_63A = "https://www.nysenate.gov/legislation/laws/CVP/A63-A"
const GBS_898 = "https://www.nysenate.gov/legislation/laws/GBS/898"
const RCNY_5_03 = "https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCrules/0-0-0-135544"
const RCNY_5_23 = "https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCrules/0-0-0-135625"
const RCNY_5_25 = "https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCrules/0-0-0-135651"
const ADMIN_10_131 = "https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCadmin/0-0-0-6218"
const ADMIN_10_303 = "https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCadmin/0-0-0-208353"
const NYPD_PERMITS = "https://www.nyc.gov/site/nypd/services/law-enforcement/permits-licenses-firearms.page"
const DCJS_STANDARDS =
  "https://www.criminaljustice.ny.gov/FINAL%20NYSP-DCJS%20Minimum%20Standards%20for%20Firearm%20Safety%20Training%208-23-22.pdf"
const GUNSAFETY_RECERT = "https://gunsafety.ny.gov/pistol-permit-recertification/"
const GUNSAFETY_FAQ = "https://gunsafety.ny.gov/frequently-asked-questions-new-concealed-carry-law"
const ANTONYUK_2D_CIR = "https://ag.ny.gov/sites/default/files/decisions/antonyuk-2d-cir-post-gvr-op.pdf"
const CHRISTIAN_2D_CIR = "https://ww3.ca2.uscourts.gov/decisions/OPN/24-2847;%2025-384_complete_opn.pdf"
const FREY_2D_CIR = "https://law.justia.com/cases/federal/appellate-courts/ca2/23-365/23-365-2025-09-19.html"
const LEOSA = "https://www.law.cornell.edu/uscode/text/18/926C"
const FOPA = "https://www.law.cornell.edu/uscode/text/18/926A"

const V = (text: string, citation: string, href: string, note?: string): LawClaim => ({
  text,
  citation,
  href,
  status: "verified",
  ...(note ? { note } : {}),
})

const R = (text: string, citation: string, href: string, note?: string): LawClaim => ({
  text,
  citation,
  href,
  status: "review",
  ...(note ? { note } : {}),
})

// ── The topics ──────────────────────────────────────────────────────────────

const sensitiveLocations: LawTopic = {
  slug: "sensitive-locations",
  label: "Where you cannot carry",
  title: "Where you cannot carry a firearm in New York City",
  metaTitle: "Sensitive Locations in NYC — Where You Cannot Carry (2026)",
  metaDescription:
    "The full list of New York sensitive locations under Penal Law §265.01-e, what is currently enforceable after Antonyuk, Frey and Christian, and what a carry license does not let you do.",
  eyebrow: "Penal Law §265.01-e",
  answer:
    "New York bars carrying a firearm in twenty categories of 'sensitive location' — including government buildings, health care facilities, places of worship, schools, parks, libraries, public transit and the subway, bars, theaters and stadiums, polling places, protests, and Times Square. A valid New York carry license is not a defense. Violating the rule is a class E felony under Penal Law §265.01-e, and as of August 2026 no paragraph of the list is enjoined.",
  authorities: [
    { citation: "N.Y. Penal Law §265.01-e", href: PEN("265.01-E") },
    { citation: "Antonyuk v. James, 120 F.4th 941 (2d Cir. 2024)", href: ANTONYUK_2D_CIR },
    { citation: "Frey v. City of New York (2d Cir. 2025)", href: FREY_2D_CIR },
    { citation: "Christian v. James (2d Cir. 2026)", href: CHRISTIAN_2D_CIR },
  ],
  sections: [
    {
      heading: "What the offense actually is",
      claims: [
        V(
          "A person commits criminal possession of a firearm, rifle or shotgun in a sensitive location when they possess such a weapon in or upon a listed sensitive location, and they know or reasonably should know that the location is a sensitive location. The offense is a class E felony.",
          "N.Y. Penal Law §265.01-e",
          PEN("265.01-E")
        ),
        V(
          "Holding a valid New York carry license is not a defense to the sensitive-location offense. The license authorizes concealed carry generally; it does not authorize carry in a listed location.",
          "N.Y. Penal Law §265.01-e",
          PEN("265.01-E")
        ),
      ],
      body: [
        "This is the single most consequential thing a new licensee misunderstands. The license and the location rules are two separate systems. Passing the first does not exempt you from the second, and the list is long enough that an ordinary day in New York City routinely crosses it — a subway ride, a doctor's appointment, a drink after work, a museum, a school pickup.",
      ],
    },
    {
      heading: "The twenty categories",
      body: [
        "Penal Law §265.01-e(2) enumerates the categories below. They are paraphrased for readability; the statute controls, and several carry internal definitions and carve-outs worth reading in full.",
      ],
      list: [
        { term: "(a) Government property", detail: "Any place owned or under the control of federal, state or local government for the purpose of government administration, including courts." },
        { term: "(b) Health care", detail: "Any location providing health, behavioral health, or chemical dependency care or services." },
        { term: "(c) Places of worship", detail: "Any place of worship, except for those persons responsible for security at the place of worship." },
        { term: "(d) Libraries, playgrounds, parks, zoos", detail: "Public playgrounds, public parks, libraries and zoos. 'Public park' excludes privately held land within a public park not dedicated to public use, and the forest preserve." },
        { term: "(e) Children's programs", detail: "Programs licensed, regulated, certified, funded or approved by the Office of Children and Family Services that provide services to children, youth or young adults; legally exempt childcare providers; and childcare programs permitted by the NYC Department of Health and Mental Hygiene." },
        { term: "(f) Nursery schools, preschools, summer camps", detail: "With a carve-out preserving certain lawful activity at summer camps under §§265.20(7-c), (7-d) and (7-e)." },
        { term: "(g) OPWDD programs", detail: "Programs licensed, regulated, certified, operated or funded by the Office for People With Developmental Disabilities." },
        { term: "(h) OASAS programs", detail: "Programs licensed, regulated, certified, operated or funded by the Office of Addiction Services and Supports." },
        { term: "(i) OMH programs", detail: "Programs licensed, regulated, certified, operated or funded by the Office of Mental Health." },
        { term: "(j) OTDA programs", detail: "Programs licensed, regulated, certified, operated or funded by the Office of Temporary and Disability Assistance." },
        { term: "(k) Shelters", detail: "Homeless shelters, runaway and homeless youth shelters, family shelters, shelters for adults, domestic violence shelters, emergency shelters, and residential domestic violence programs." },
        { term: "(l) DOH residential settings", detail: "Residential settings licensed, certified, regulated, funded or operated by the Department of Health." },
        { term: "(m) Educational institutions", detail: "Buildings or grounds, owned or leased, of educational institutions, colleges and universities, licensed private career schools, school districts, public schools, private schools, charter schools, BOCES, special act school districts, preschool special education programs, schools for students with disabilities, and state-operated or state-supported schools." },
        { term: "(n) Public transit", detail: "Subway cars, train cars, buses, ferries, railroad, omnibus, marine or aviation transportation, and any facility used in connection with passenger transportation — airports, train stations, subway and rail stations, and bus terminals." },
        { term: "(o) Bars and on-premises cannabis", detail: "Establishments holding an active on-premises license under Alcoholic Beverage Control Law articles 4, 4-A, 5 or 6 where alcohol is consumed, and Cannabis Law article 4 on-premises consumption licensees." },
        { term: "(p) Entertainment and sport", detail: "Places used for performance, art, entertainment, gaming or sporting events — theaters, stadiums, racetracks, museums, amusement parks, performance venues, concerts, exhibits, conference centers, banquet halls, gaming facilities and video lottery terminal facilities." },
        { term: "(q) Polling places", detail: "Any location being used as a polling place." },
        { term: "(r) Permitted or protected public areas", detail: "Any public sidewalk or public area restricted from general public access for a limited time or special event under a government permit, or subject to specific heightened law-enforcement protection — provided the area is identified by clear and conspicuous signage." },
        { term: "(s) Protests and assemblies", detail: "Any gathering of individuals to collectively express their constitutional rights to protest or assemble." },
        { term: "(t) Times Square", detail: "The area commonly known as Times Square, as determined and identified by the City of New York, provided the area is clearly and conspicuously identified with signage." },
      ],
    },
    {
      heading: "Who is exempt",
      claims: [
        V(
          "Section 265.01-e(3) exempts, among others, police officers, qualified retired law enforcement officers, active-duty military personnel, certain licensed security guards, and persons lawfully engaged in hunting.",
          "N.Y. Penal Law §265.01-e(3)",
          PEN("265.01-E")
        ),
      ],
    },
    {
      heading: "What the courts have done to this list",
      body: [
        "The sensitive-location scheme has been litigated continuously since it was enacted in 2022, and much of what is published about it online describes injunctions that no longer exist. As of August 2026 the position is straightforward: the list stands.",
      ],
      claims: [
        V(
          "The Second Circuit vacated the district court's preliminary injunctions against the sensitive-location provisions, leaving the list — including treatment centers, parks and zoos, on-premises alcohol establishments, theaters, conference centers, banquet halls, and First Amendment gatherings — in effect.",
          "Antonyuk v. James, 120 F.4th 941 (2d Cir. Oct. 24, 2024), cert. denied Apr. 7, 2025",
          ANTONYUK_2D_CIR
        ),
        V(
          "The Times Square provision and the public transit and subway provision were both upheld.",
          "Frey v. City of New York, No. 23-365 (2d Cir. Sept. 19, 2025)",
          FREY_2D_CIR
        ),
        V(
          "The facial challenge to the public parks provision was rejected.",
          "Christian v. James, Nos. 24-2847, 25-384 (2d Cir. May 18, 2026)",
          CHRISTIAN_2D_CIR,
          "The Second Circuit expressly declined to reach an as-applied challenge to the parks provision for rural and wilderness parks, because it was not preserved below. That question remains open and could produce a future carve-out — one with little practical effect inside New York City."
        ),
      ],
    },
  ],
  faqs: [
    {
      q: "Can I carry on the subway with a New York City carry license?",
      a: "No. Subway cars, rail cars, buses, ferries and the stations and terminals serving them are sensitive locations under Penal Law §265.01-e(2)(n), and a carry license is not a defense. The Second Circuit upheld the transit provision in Frey v. City of New York in September 2025.",
    },
    {
      q: "Is Times Square really a sensitive location?",
      a: "Yes. Penal Law §265.01-e(2)(t) covers the area commonly known as Times Square as determined and identified by the City of New York, provided the area is clearly and conspicuously identified with signage. The Second Circuit upheld it in Frey v. City of New York.",
    },
    {
      q: "What is the penalty for carrying in a sensitive location?",
      a: "Criminal possession of a firearm, rifle or shotgun in a sensitive location is a class E felony under Penal Law §265.01-e. It is not classified as a violent felony, so it does not carry a mandatory determinate sentence, but it is a felony conviction and it ends firearm eligibility.",
    },
    {
      q: "Can I carry in a restaurant that serves alcohol?",
      a: "Penal Law §265.01-e(2)(o) covers establishments holding an active on-premises license under the Alcoholic Beverage Control Law where alcohol is consumed. A restaurant with an on-premises liquor license falls within that category. This is a question worth putting to a New York attorney for a specific venue.",
    },
  ],
  related: ["private-property", "penalties", "license-types"],
  updated: LAWS_VERIFIED,
}

const privateProperty: LawTopic = {
  slug: "private-property",
  label: "Private property",
  title: "Carrying on private property in New York",
  metaTitle: "NY Private Property Gun Law §265.01-d — What Survived Christian v. James",
  metaDescription:
    "New York's restricted-locations rule reversed the default on private property. A 2026 Second Circuit decision permanently enjoined it as to property open to the public. What that actually means.",
  eyebrow: "Penal Law §265.01-d",
  answer:
    "New York's 'restricted locations' rule made it a class E felony to carry a firearm onto private property unless the owner affirmatively permitted it by signage or express consent — reversing the ordinary default. In Christian v. James (May 18, 2026) the Second Circuit affirmed a permanent injunction against that rule as applied to private property held open to the public, such as shops and restaurants. The provision remains on the books and enforceable as to genuinely private, non-public property, and every property owner retains an independent right to exclude armed visitors under trespass law.",
  contested: true,
  authorities: [
    { citation: "N.Y. Penal Law §265.01-d", href: PEN("265.01-D") },
    { citation: "Christian v. James (2d Cir. 2026)", href: CHRISTIAN_2D_CIR },
    { citation: "Antonyuk v. James (2d Cir. 2024)", href: ANTONYUK_2D_CIR },
  ],
  sections: [
    {
      heading: "The rule as written",
      claims: [
        V(
          "Section 265.01-d makes it a class E felony to possess a firearm, rifle or shotgun while entering or remaining on private property where the owner or lessee has not permitted such possession. Permission is shown by clear and conspicuous signage or by express consent.",
          "N.Y. Penal Law §265.01-d",
          PEN("265.01-D")
        ),
        V(
          "Section 265.01-d(2) exempts police and designated peace officers, qualified current and retired federal law enforcement officers under 18 U.S.C. §§926B–926C, armed security guards at their place of employment, active-duty military personnel, licensed dealers and gunsmiths acting in an official capacity, persons lawfully hunting with a permit, and authorized MTA and New York City Transit security personnel.",
          "N.Y. Penal Law §265.01-d(2)",
          PEN("265.01-D")
        ),
      ],
      body: [
        "The significance is the direction of the default. Ordinarily a licensed carrier may enter a business unless the owner objects. Section 265.01-d inverted that: absent an affirmative posting or consent, carry was barred — which in practice meant barred nearly everywhere, since almost no New York business posts a sign inviting firearms.",
      ],
    },
    {
      heading: "What the courts did",
      claims: [
        V(
          "The Second Circuit affirmed a preliminary injunction against the private-property provision as applied to private property open to the general public.",
          "Antonyuk v. James, 120 F.4th 941 (2d Cir. Oct. 24, 2024)",
          ANTONYUK_2D_CIR
        ),
        V(
          "The Second Circuit affirmed a permanent injunction, holding that the private-property provision, as applied to private property open to the public, is unconstitutional because the State did not carry its burden of demonstrating that the restriction falls within the nation's historical tradition of firearm regulation.",
          "Christian v. James, Nos. 24-2847, 25-384 (2d Cir. May 18, 2026)",
          CHRISTIAN_2D_CIR
        ),
      ],
    },
    {
      heading: "What this means in practice",
      body: [
        "Two errors are common here, in opposite directions. The first is to say §265.01-d was struck down — it was not, and it continues to apply to genuinely private, non-public property. The second is to treat the injunction as permission: it removes a criminal statute from the picture for public-facing businesses, but it does nothing to the property owner's own right to ask an armed person to leave, which is enforced through trespass law, not the Penal Law.",
        "The Second Circuit also did not exhaustively define what counts as 'open to the public.' The clear cases — a supermarket, a gas station, a restaurant dining room — are clear. The edges are not.",
      ],
      claims: [
        R(
          "Because the injunction is drawn along the public/non-public line rather than repealing the section, the safest reading for an individual licensee is that the criminal prohibition no longer reaches ordinary retail and hospitality premises, while private homes and closed workplaces are unaffected by the injunction.",
          "Christian v. James (2d Cir. 2026), construing N.Y. Penal Law §265.01-d",
          CHRISTIAN_2D_CIR,
          "This is a characterization of an appellate holding, not statutory text, and the boundary of 'open to the public' has not been fully defined. Confirm with a New York attorney before relying on it in a specific setting."
        ),
      ],
    },
  ],
  faqs: [
    {
      q: "Can a store in New York still stop me from carrying?",
      a: "Yes. The Christian v. James injunction removes the criminal penalty under §265.01-d for property open to the public; it does not affect a property owner's independent right to exclude. If you are asked to leave and you do not, that is a trespass issue.",
    },
    {
      q: "Was §265.01-d repealed?",
      a: "No. It remains in the Penal Law. It is permanently enjoined only as applied to private property held open to the public. Coverage describing it as struck down in its entirety is inaccurate.",
    },
    {
      q: "Do I need to look for a sign before entering a business?",
      a: "Following the 2026 injunction, the absence of a permissive sign no longer creates criminal liability at a public-facing business. Posted prohibitions still matter, and they are enforced through trespass law.",
    },
  ],
  related: ["sensitive-locations", "penalties", "license-types"],
  updated: LAWS_VERIFIED,
}

const penalties: LawTopic = {
  slug: "penalties",
  label: "Penalties",
  title: "Penalties for unlicensed gun possession in New York City",
  metaTitle: "NYC Unlicensed Gun Possession Penalties — Charges & Sentences",
  metaDescription:
    "What unlicensed handgun possession actually carries in New York City: the misdemeanor, the class E felony, and the class C violent felony with a three-and-a-half-year mandatory minimum.",
  eyebrow: "Penal Law Article 265",
  answer:
    "Carrying a loaded, unlicensed handgun on a New York City street is criminal possession of a weapon in the second degree under Penal Law §265.03(3) — a class C violent felony carrying a determinate sentence with a three-and-a-half year mandatory minimum and a fifteen-year maximum. Possessing an unlicensed handgun unloaded is criminal possession of a firearm under §265.01-b, a non-violent class E felony. The loaded/unloaded line is what separates them.",
  authorities: [
    { citation: "N.Y. Penal Law §265.01", href: PEN("265.01") },
    { citation: "N.Y. Penal Law §265.01-b", href: PEN("265.01-B") },
    { citation: "N.Y. Penal Law §265.03", href: PEN("265.03") },
    { citation: "N.Y. Penal Law §70.02", href: PEN("70.02") },
  ],
  sections: [
    {
      heading: "The three charges",
      table: {
        head: ["Statute", "Offense", "Class", "Exposure"],
        rows: [
          ["§265.01", "Criminal possession of a weapon, 4th degree", "Class A misdemeanor", "Up to 364 days; probation and conditional discharge available"],
          ["§265.01-b(1)", "Criminal possession of a firearm — an unlicensed handgun, unloaded", "Class E felony, not violent", "Up to 1⅓–4 years indeterminate; non-jail dispositions available"],
          ["§265.03(3)", "Criminal possession of a weapon, 2nd degree — any loaded firearm outside the home or place of business", "Class C VIOLENT felony", "Determinate, 3½-year mandatory minimum, 15-year maximum, plus 2½–5 years post-release supervision"],
        ],
      },
      claims: [
        V(
          "Criminal possession of a weapon in the fourth degree under §265.01 is a class A misdemeanor.",
          "N.Y. Penal Law §265.01; §70.15(1)",
          PEN("265.01")
        ),
        V(
          "Criminal possession of a firearm under §265.01-b(1) — possessing any firearm without a license — is a class E felony, and it is not on the violent felony list, so no mandatory determinate sentence attaches.",
          "N.Y. Penal Law §265.01-b; §70.02(1)(d)",
          PEN("265.01-B")
        ),
        V(
          "Criminal possession of a weapon in the second degree under §265.03(3) — possession of any loaded firearm outside the person's home or place of business — is a class C violent felony carrying a determinate sentence of at least three and a half years and no more than fifteen years, followed by two and a half to five years of post-release supervision.",
          "N.Y. Penal Law §265.03(3); §70.02(1)(b), (3)(b); §70.45(2)(f)",
          PEN("265.03")
        ),
        V(
          "Section 265.03 also reaches possession of a loaded firearm with intent to use it unlawfully against another, and possession of five or more firearms. Both are class C violent felonies.",
          "N.Y. Penal Law §265.03(1)–(2)",
          PEN("265.03")
        ),
      ],
    },
    {
      heading: "Why 'home or place of business' is narrower than it sounds",
      body: [
        "The §265.03(3) exception is the hinge of the whole statute, and it is construed narrowly. It does not mean anywhere you are lawfully present, anywhere you are staying, or a car you own. Carrying a loaded, unlicensed handgun on a New York City street is the paradigm §265.03(3) case, and it carries a three-and-a-half-year mandatory minimum before any aggravating facts are considered.",
      ],
      claims: [
        R(
          "Prior felony convictions can raise the sentencing floor substantially through New York's predicate and persistent felony offender provisions.",
          "N.Y. Penal Law §§70.04, 70.06, 70.08",
          PEN("70.04"),
          "The predicate and persistent offender provisions were not verified line by line for this page. Sentencing exposure for anyone with a prior felony is a question for a criminal defense attorney, not a website."
        ),
      ],
    },
    {
      heading: "The collateral consequence people miss",
      body: [
        "Sentencing is not the end of it. A felony conviction — and a range of misdemeanors New York classifies as 'serious offenses' — permanently disqualifies you from a New York handgun license under Penal Law §400.00(1)(c). An arrest that resolves without a conviction still has to be disclosed on any future application, including sealed and dismissed matters.",
      ],
    },
  ],
  faqs: [
    {
      q: "What happens if I am caught with an unlicensed loaded gun in NYC?",
      a: "The likely charge is criminal possession of a weapon in the second degree under Penal Law §265.03(3), a class C violent felony with a mandatory minimum of three and a half years and a maximum of fifteen, plus post-release supervision. This is one of the most severely punished possessory offenses in New York.",
    },
    {
      q: "Is it different if the gun is unloaded?",
      a: "Yes, substantially. An unlicensed handgun possessed unloaded is charged under §265.01-b as a class E felony, which is not a violent felony and carries no mandatory determinate sentence. It is still a felony.",
    },
    {
      q: "Does an out-of-state permit protect me?",
      a: "No. New York does not recognize out-of-state carry permits, so possessing a handgun in New York City on another state's permit is unlicensed possession for charging purposes.",
    },
  ],
  related: ["out-of-state-permits", "sensitive-locations", "eligibility"],
  updated: LAWS_VERIFIED,
}

const licenseTypes: LawTopic = {
  slug: "license-types",
  label: "License types",
  title: "New York handgun license types, explained",
  metaTitle: "NYC Handgun License Types — Premises vs. Carry vs. Special Carry",
  metaDescription:
    "Premises-residence, premises-business, unrestricted concealed carry, and the New York City Special Carry License — what each authorizes under Penal Law §400.00(2) and 38 RCNY §5-23.",
  eyebrow: "Penal Law §400.00(2) · 38 RCNY §5-23",
  answer:
    "New York issues distinct handgun licenses. A premises license authorizes possession at one specified place — a dwelling or a business — and does not authorize carrying in public. The unrestricted concealed carry license under Penal Law §400.00(2)(f) authorizes concealed carry without regard to employment or place of possession, and is the license the Concealed Carry Improvement Act's extra requirements attach to. A license issued elsewhere in New York State is not valid inside New York City without a Special Carry License from the NYPD.",
  authorities: [
    { citation: "N.Y. Penal Law §400.00(2)", href: PEN("400.00") },
    { citation: "N.Y. Penal Law §400.00(6)", href: PEN("400.00") },
    { citation: "38 RCNY §5-23", href: RCNY_5_23 },
  ],
  sections: [
    {
      heading: "The state categories",
      claims: [
        V(
          "Penal Law §400.00(2)(a) authorizes a premises-residence license — to have and possess a handgun in the licensee's dwelling. Possession is confined to the licensed address.",
          "N.Y. Penal Law §400.00(2)(a)",
          PEN("400.00")
        ),
        V(
          "Penal Law §400.00(2)(b) authorizes a premises-business license — to have and possess a handgun in the licensee's place of business, as a merchant or storekeeper.",
          "N.Y. Penal Law §400.00(2)(b)",
          PEN("400.00")
        ),
        V(
          "Penal Law §400.00(2)(f) authorizes an unrestricted license to have and carry a handgun concealed, without regard to employment or place of possession, subject to the restrictions of state and federal law. This is the concealed carry license.",
          "N.Y. Penal Law §400.00(2)(f)",
          PEN("400.00")
        ),
        V(
          "Penal Law §400.00(2) also provides narrower carry categories for messengers employed by banking institutions or express companies, for specified judges, and for certain correction employees, plus antique-pistol, gunsmith and firearms dealer licenses.",
          "N.Y. Penal Law §400.00(2)(c)–(e), (g)",
          PEN("400.00")
        ),
        V(
          "A separate semiautomatic rifle license is required to purchase or take possession of a semiautomatic rifle, other than an assault weapon or disguised gun, where the transfer of ownership occurs on or after the effective date of chapter 212 of the laws of 2022.",
          "N.Y. Penal Law §400.00(2), unlettered paragraph",
          PEN("400.00"),
          "This is frequently miscited as §400.00(16-a). Subdivision 16-a is SAFE Act assault-weapon registration, a different thing entirely."
        ),
      ],
    },
    {
      heading: "Why a premises license is not a carry license",
      claims: [
        V(
          "A premises license does not authorize carrying a handgun in public. It authorizes possession at the licensed location, together with the limited lawful transport New York law permits.",
          "N.Y. Penal Law §400.00",
          PEN("400.00")
        ),
      ],
      body: [
        "This distinction produces more accidental felonies than any other in New York firearm law. A premises licensee who puts a handgun in a bag and takes it somewhere other than an authorized destination is not a licensee with a paperwork problem; they are, on the statute's terms, in unlicensed possession outside the licensed premises.",
      ],
    },
    {
      heading: "The New York City layer",
      claims: [
        V(
          "A license not otherwise limited as to place or time of possession is effective throughout the state, except that it is not valid within the City of New York unless a special permit granting validity is issued by the New York City police commissioner.",
          "N.Y. Penal Law §400.00(6)",
          PEN("400.00")
        ),
        V(
          "38 RCNY §5-23 implements that requirement. A Special Carry License is issued to the holder of a valid county carry license under Penal Law §400.00 and permits concealed carry while in New York City. The rule also provides for Premises Licenses (Residence or Business), Carry Licenses, and Carry Guard or Gun Custodian licenses, including a Special Carry Guard license valid only during an active work assignment.",
          "38 RCNY §5-23",
          RCNY_5_23
        ),
      ],
      body: [
        "The naming here is a persistent source of confusion. 'Special Carry' is a New York City category — it is what lets a license issued by another New York county function inside the five boroughs. It is not the state's §400.00(2)(f) license, and out-of-state guidance that equates the two is wrong.",
      ],
    },
  ],
  faqs: [
    {
      q: "What is the difference between a premises license and a carry license in NYC?",
      a: "A premises license authorizes possession of a handgun at one specified location — your home or your business — plus limited lawful transport. A carry license under Penal Law §400.00(2)(f) authorizes carrying concealed without regard to place of possession, subject to the sensitive-location and private-property rules.",
    },
    {
      q: "I have a carry license from another New York county. Can I carry in NYC?",
      a: "Not on that license alone. Penal Law §400.00(6) provides that a license is not valid within New York City without a special permit from the NYC police commissioner, and 38 RCNY §5-23 implements that as the Special Carry License.",
    },
    {
      q: "Can I upgrade a premises license to a carry license?",
      a: "You apply to the NYPD License Division for the carry license, which is a separate license type with its own requirements — including the eighteen-hour training course, four character references, and an in-person interview.",
    },
  ],
  related: ["eligibility", "transport", "getting-licensed"],
  updated: LAWS_VERIFIED,
}

const eligibility: LawTopic = {
  slug: "eligibility",
  label: "Who qualifies",
  title: "Who can get a handgun license in New York City",
  metaTitle: "NYC Handgun License Eligibility & Disqualifiers (Penal Law §400.00)",
  metaDescription:
    "The statutory eligibility criteria and disqualifiers for a New York handgun license, the extra requirements the CCIA added for concealed carry, and what the courts have done to them.",
  eyebrow: "Penal Law §400.00(1)",
  answer:
    "New York requires a handgun license applicant to be at least twenty-one, to be of good moral character, and to be free of a range of statutory disqualifiers — including any felony or 'serious offense' conviction, unlawful controlled substance use, certain involuntary commitments, and a prior license revocation. Concealed carry applicants face additional requirements: an in-person interview, four character references, eighteen hours of training, and a five-year bar for certain misdemeanor convictions.",
  contested: true,
  authorities: [
    { citation: "N.Y. Penal Law §400.00(1)", href: PEN("400.00") },
    { citation: "38 RCNY §5-03", href: RCNY_5_03 },
    { citation: "Antonyuk v. James (2d Cir. 2024)", href: ANTONYUK_2D_CIR },
  ],
  sections: [
    {
      heading: "The baseline criteria",
      claims: [
        V(
          "An applicant must be twenty-one years of age or older, unless honorably discharged from the United States Army, Navy, Marine Corps, Air Force or Coast Guard, or from the National Guard of the State of New York, in which case the age restriction does not apply.",
          "N.Y. Penal Law §400.00(1)(a)",
          PEN("400.00")
        ),
        V(
          "An applicant must be of good moral character, which the statute defines as having the essential character, temperament and judgment necessary to be entrusted with a weapon and to use it only in a manner that does not endanger oneself or others.",
          "N.Y. Penal Law §400.00(1)(b)",
          PEN("400.00")
        ),
        V(
          "An applicant must not have been convicted anywhere of a felony or a serious offense, and must not be the subject of an outstanding warrant of arrest for a felony or serious offense.",
          "N.Y. Penal Law §400.00(1)(c)",
          PEN("400.00")
        ),
        V(
          "An applicant must not be a fugitive from justice.",
          "N.Y. Penal Law §400.00(1)(d)",
          PEN("400.00")
        ),
        V(
          "An applicant must not be an unlawful user of, or addicted to, any controlled substance as defined in 21 U.S.C. §802.",
          "N.Y. Penal Law §400.00(1)(e)",
          PEN("400.00")
        ),
        V(
          "A non-citizen applicant must not be unlawfully in the United States and must not have been admitted under a nonimmigrant visa, subject to the exception at 18 U.S.C. §922(y)(2).",
          "N.Y. Penal Law §400.00(1)(f)",
          PEN("400.00")
        ),
        V(
          "An applicant must not have been discharged from the Armed Forces under dishonorable conditions, and must not have renounced United States citizenship.",
          "N.Y. Penal Law §400.00(1)(g)–(h)",
          PEN("400.00")
        ),
        V(
          "An applicant must state whether he or she has ever suffered any mental illness.",
          "N.Y. Penal Law §400.00(1)(i)",
          PEN("400.00")
        ),
        V(
          "An applicant must not have been involuntarily committed under the Mental Hygiene Law articles 9 or 15, the Criminal Procedure Law article 730 or §330.20, Correction Law §402 or §508, or Family Court Act §322.2 or §353.4; must not be civilly confined under Mental Hygiene Law article 10; and must not be the subject of a report under Mental Hygiene Law §9.46.",
          "N.Y. Penal Law §400.00(1)(j)",
          PEN("400.00")
        ),
        V(
          "An applicant must not have had a license revoked, and must not be under a suspension or ineligibility order issued under Criminal Procedure Law §530.14 or Family Court Act §842-a.",
          "N.Y. Penal Law §400.00(1)(k)",
          PEN("400.00")
        ),
        V(
          "An applicant must not have had a guardian appointed based on a determination that the applicant lacks the mental capacity to manage his or her own affairs.",
          "N.Y. Penal Law §400.00(1)(m)",
          PEN("400.00")
        ),
      ],
    },
    {
      heading: "What the CCIA added for concealed carry",
      body: [
        "The requirements below apply only to the §400.00(2)(f) concealed carry license. A premises applicant does not face them.",
      ],
      claims: [
        V(
          "For a concealed carry license, an applicant must not have been convicted within five years before the application of assault in the third degree, misdemeanor driving while intoxicated, or menacing in the third degree.",
          "N.Y. Penal Law §400.00(1)(n)",
          PEN("400.00")
        ),
        V(
          "For a concealed carry license, an applicant must meet in person with the licensing officer for an interview and must submit: contact information for a spouse or domestic partner and other adults residing in the home, including adult children, and whether any minors reside there; the names and contact information of no fewer than four character references who can attest to the applicant's good moral character and that the applicant has not engaged in acts or made statements suggesting a likelihood of harm to self or others; certification of completion of the required training; and other information reasonably necessary to review the application.",
          "N.Y. Penal Law §400.00(1)(o)",
          PEN("400.00")
        ),
        V(
          "New York City requires a minimum of four character references, of whom at least two must be non-family members — a stricter rule than the bare statute.",
          "38 RCNY §5-03",
          RCNY_5_03
        ),
        V(
          "The good-moral-character standard, the four-character-reference requirement, the in-person interview and the training requirement were all upheld when the Second Circuit vacated the injunctions against them.",
          "Antonyuk v. James, 120 F.4th 941 (2d Cir. 2024), cert. denied Apr. 2025",
          ANTONYUK_2D_CIR
        ),
      ],
    },
    {
      heading: "The social media requirement is not being enforced",
      claims: [
        R(
          "The statutory requirement that a concealed carry applicant disclose a list of former and current social media accounts from the past three years is subject to a March 17, 2026 consent injunction in Antonyuk v. James, and New York agreed that the State Police application form would not include social media language. The requirement was enjoined, not repealed.",
          "N.Y. Penal Law §400.00(1)(o)(iv); consent injunction, Antonyuk v. James (N.D.N.Y. Mar. 17, 2026)",
          PEN("400.00"),
          "Sources conflict on the scope of this injunction — some report it runs only to the named plaintiffs and carries no precedential effect, others describe it as ending the requirement generally. What is jointly confirmed is that the State agreed to strip the item from the application form. Verify the signed order before relying on the broader reading."
        ),
      ],
    },
    {
      heading: "Disclosure is broader than most applicants expect",
      claims: [
        V(
          "Sealed and dismissed arrests are still disclosed on a New York firearms application.",
          "Criminal Procedure Law article 160",
          "https://www.nyc.gov/site/nypd/about/about-nypd/rules.page"
        ),
      ],
      body: [
        "Non-disclosure is treated far more seriously than the underlying matter usually is. A twenty-year-old dismissed arrest is rarely fatal to an application. Failing to disclose it, and having the background investigation surface it, goes directly to the good-moral-character finding.",
      ],
    },
  ],
  faqs: [
    {
      q: "Does a misdemeanor disqualify me from a NYC gun license?",
      a: "Some do. Penal Law §400.00(1)(c) bars anyone convicted of a felony or a 'serious offense,' a defined category that includes a number of misdemeanors. Separately, §400.00(1)(n) imposes a five-year bar on concealed carry applicants convicted of third-degree assault, misdemeanor DWI, or third-degree menacing.",
    },
    {
      q: "Do I have to disclose a sealed or dismissed arrest?",
      a: "Yes. Sealed and dismissed matters are disclosed on a New York firearms application. Failure to disclose is generally treated as more damaging than the underlying incident.",
    },
    {
      q: "Do I still have to hand over my social media accounts?",
      a: "As a practical matter, no. New York agreed in March 2026 to remove the social media disclosure item from the State Police application form under a consent injunction in Antonyuk v. James. The statutory provision was enjoined rather than repealed.",
    },
    {
      q: "Can a non-citizen apply?",
      a: "Penal Law §400.00(1)(f) bars applicants unlawfully in the United States and those admitted under a nonimmigrant visa, subject to the exception at 18 U.S.C. §922(y)(2). Lawful permanent residents are not barred by that paragraph.",
    },
  ],
  related: ["license-types", "training", "getting-licensed"],
  updated: LAWS_VERIFIED,
}

const training: LawTopic = {
  slug: "training",
  label: "Training",
  title: "The eighteen-hour training requirement",
  metaTitle: "NY 18-Hour Concealed Carry Training Requirement Explained",
  metaDescription:
    "Sixteen classroom hours, two hours of live fire, an 80% written test and a live-fire qualification with a DCJS-approved instructor — what Penal Law §400.00(19) actually requires.",
  eyebrow: "Penal Law §400.00(19)",
  answer:
    "Before New York issues or renews a concealed carry license, the applicant must complete an eighteen-hour course approved by the Division of Criminal Justice Services: at least sixteen hours of in-person classroom instruction and at least two hours of live-fire range training. The applicant must score at least eighty percent on a written test and demonstrate live-fire proficiency. In New York City, the training certificate must be dated no more than six months before the application is submitted.",
  authorities: [
    { citation: "N.Y. Penal Law §400.00(19)", href: PEN("400.00") },
    { citation: "NYSP–DCJS Minimum Standards (Aug. 23, 2022)", href: DCJS_STANDARDS },
    { citation: "38 RCNY §5-03", href: RCNY_5_03 },
  ],
  sections: [
    {
      heading: "The requirement",
      claims: [
        V(
          "An applicant for a concealed carry license must complete an in-person live curriculum of at least sixteen hours plus at least two hours of live-fire range training, given by a duly authorized instructor approved by the Division of Criminal Justice Services.",
          "N.Y. Penal Law §400.00(19); §265.00(19)",
          PEN("400.00")
        ),
        V(
          "The applicant must demonstrate proficiency by scoring at least eighty percent on a written test and by satisfying the live-fire standard.",
          "N.Y. Penal Law §400.00(19)",
          PEN("400.00")
        ),
        V(
          "The live-fire standard requires firing five rounds from a standing position at four yards, with at least four of five rounds on target.",
          "NYSP–DCJS Minimum Standards for Firearm Safety Training, issued Aug. 23, 2022",
          DCJS_STANDARDS
        ),
        V(
          "Proof of training is required for concealed carry licenses issued on or after September 1, 2022.",
          "New York State Police, CCIA guidance",
          "https://troopers.ny.gov/system/files/documents/2022/08/new-gun-law-faq-8-27-22-final-1.pdf"
        ),
      ],
    },
    {
      heading: "What the curriculum must cover",
      claims: [
        V(
          "The statute prescribes the curriculum: general firearm safety; safe storage requirements and general secure storage best practices; state and federal gun laws; situational awareness; conflict de-escalation; best practices when encountering law enforcement; the statutory and case law relating to the use of deadly force; suicide prevention; and the basic principles of marksmanship.",
          "N.Y. Penal Law §400.00(19)",
          PEN("400.00")
        ),
      ],
    },
    {
      heading: "How long the certificate is good for",
      claims: [
        V(
          "New York City requires that the training certificate have been obtained no more than six months before the application is submitted.",
          "38 RCNY §5-03",
          RCNY_5_03,
          "This is a New York City rule, not a statewide one. Neither §400.00(19) nor the NYSP–DCJS Minimum Standards sets a statewide expiration for the certificate; other counties may apply their own recency expectations administratively."
        ),
      ],
      body: [
        "The six-month clock is the most common scheduling mistake in a New York City application. Training early feels productive, but a certificate that ages out while the rest of the packet is being assembled has to be redone at full cost. The course belongs in the middle of the sequence, not at the start.",
      ],
    },
  ],
  faqs: [
    {
      q: "How many hours of training does New York require for concealed carry?",
      a: "Eighteen — at least sixteen hours of in-person classroom instruction and at least two hours of live-fire range training, with a DCJS-approved instructor, under Penal Law §400.00(19).",
    },
    {
      q: "What score do I need to pass?",
      a: "At least eighty percent on the written test, plus the live-fire qualification: five rounds from a standing position at four yards, with at least four on target.",
    },
    {
      q: "How long is the training certificate valid in NYC?",
      a: "Under 38 RCNY §5-03 the certificate must be dated no more than six months before you submit your application. That is a New York City rule; the state statute sets no expiration.",
    },
    {
      q: "Is training required for a premises license?",
      a: "The §400.00(19) requirement is written for concealed carry licenses. Requirements for premises licenses differ, and New York City sets its own application rules in 38 RCNY chapter 5.",
    },
  ],
  related: ["eligibility", "getting-licensed", "renewal"],
  updated: LAWS_VERIFIED,
}

const transport: LawTopic = {
  slug: "transport",
  label: "Transport",
  title: "Transporting a handgun in New York",
  metaTitle: "Transporting a Handgun in NY — Rules for Premises & Carry Licensees",
  metaDescription:
    "There is no general 'unloaded and locked' exemption for handguns in New York. What a premises licensee may lawfully do, the vehicle storage rule, and why federal FOPA is thinner protection than travelers assume.",
  eyebrow: "Penal Law §400.00(6) · §265.45",
  answer:
    "New York has no general 'unloaded and locked' transport exemption for handguns — handgun possession requires a New York license. A premises licensee may transport the licensed handgun to another of the licensee's dwellings or places of business, to a shooting range or competition, or to an area where the licensee may lawfully possess it, provided the handgun is unloaded and carried in a locked container with the ammunition carried separately. A handgun left unattended in a vehicle must be unloaded and locked in a fire-, impact- and tamper-resistant depository, hidden from view; a glove compartment does not qualify.",
  contested: true,
  authorities: [
    { citation: "N.Y. Penal Law §400.00(6)", href: PEN("400.00") },
    { citation: "N.Y. Penal Law §265.20", href: PEN("265.20") },
    { citation: "N.Y. Penal Law §265.45", href: PEN("265.45") },
    { citation: "18 U.S.C. §926A", href: FOPA },
  ],
  sections: [
    {
      heading: "There is no general transport exemption",
      claims: [
        V(
          "New York's exemption for handgun possession runs only to a person to whom a license has been issued under Penal Law §400.00. There is no general exemption for transporting an unloaded handgun in a locked container without a New York license.",
          "N.Y. Penal Law §265.20(a)(3)",
          PEN("265.20")
        ),
      ],
      body: [
        "Most states have a transport provision that lets an unlicensed person move a handgun lawfully if it is unloaded and cased. New York does not. This is the assumption that produces arrests of otherwise law-abiding out-of-state visitors more than any other.",
      ],
    },
    {
      heading: "What a premises licensee may do",
      claims: [
        V(
          "Section 400.00(6) permits a premises licensee to transport the licensed handgun to another dwelling or place of business of the licensee, to a shooting range or competition, or to an area where the licensee may lawfully possess the handgun, provided the handgun is unloaded and carried in a locked container and the ammunition is carried separately.",
          "N.Y. Penal Law §400.00(6)",
          PEN("400.00")
        ),
        V(
          "In New York City, 38 RCNY §5-23 confines a premises licensee's handgun to the licensed address except for authorized transport to another residence or business, a shooting range or competition, an authorized hunting area, or a License Division office.",
          "38 RCNY §5-23",
          RCNY_5_23
        ),
      ],
    },
    {
      heading: "Vehicles",
      claims: [
        V(
          "A firearm left unattended in a vehicle must be unloaded and locked in an appropriate safe storage depository that is fire-, impact- and tamper-resistant, and hidden from view. A glove compartment does not qualify as a safe storage depository.",
          "N.Y. Penal Law §265.45(2)–(3)",
          PEN("265.45")
        ),
      ],
    },
    {
      heading: "Federal FOPA is thinner protection than travelers assume",
      claims: [
        V(
          "The federal peaceable journey provision protects a person transporting a lawfully possessed firearm from a place where possession is lawful to another such place, if the firearm is unloaded and neither the firearm nor the ammunition is readily accessible from the passenger compartment. In a vehicle without a separate compartment, both must be in a locked container other than the glove compartment or console.",
          "18 U.S.C. §926A",
          FOPA
        ),
        R(
          "In practice §926A functions as an affirmative defense rather than a bar to arrest, and it does not protect a journey broken by an overnight stay or other stop. New York and New York City do arrest travelers in these circumstances.",
          "18 U.S.C. §926A, as applied",
          FOPA,
          "This characterization reflects prevailing practice rather than a controlling Second Circuit holding verified for this page. A New York attorney should be consulted before any interstate transport through New York City is planned in reliance on §926A."
        ),
      ],
    },
    {
      heading: "A narrow exception for competitive shooters",
      claims: [
        V(
          "Penal Law §265.20(a)(13) provides a narrow exemption for non-residents attending or traveling to or from an organized competitive pistol match, with the handgun unloaded in a locked container, within a forty-eight-hour window and subject to conditions.",
          "N.Y. Penal Law §265.20(a)(13)",
          PEN("265.20")
        ),
      ],
    },
  ],
  faqs: [
    {
      q: "Can I drive through New York City with a handgun from another state?",
      a: "Not on another state's permit. New York does not recognize out-of-state licenses, and there is no general unloaded-and-locked exemption. Federal 18 U.S.C. §926A offers limited peaceable-journey protection for a continuous trip between two places where possession is lawful, but it is treated as a defense rather than a shield against arrest, and it does not cover stopovers.",
    },
    {
      q: "Can a premises licensee take the handgun to the range?",
      a: "Yes. Penal Law §400.00(6) permits transport to a shooting range or competition provided the handgun is unloaded, carried in a locked container, and the ammunition is carried separately. In New York City, 38 RCNY §5-23 sets the authorized destinations.",
    },
    {
      q: "Can I leave a handgun in my car?",
      a: "Only if it is unloaded and locked in a fire-, impact- and tamper-resistant storage depository, hidden from view. Penal Law §265.45(3) expressly excludes glove compartments.",
    },
  ],
  related: ["safe-storage", "license-types", "out-of-state-permits"],
  updated: LAWS_VERIFIED,
}

const safeStorage: LawTopic = {
  slug: "safe-storage",
  label: "Safe storage",
  title: "Safe storage law in New York City",
  metaTitle: "NY & NYC Safe Storage Law — §265.45 and Admin. Code §10-312",
  metaDescription:
    "New York's conditional safe-storage duty under Penal Law §265.45 and New York City's broader, unconditional locking-device rule under Administrative Code §10-312.",
  eyebrow: "Penal Law §265.45 · NYC Admin. Code §10-312",
  answer:
    "Two rules stack in New York City. Under Penal Law §265.45, anyone who owns or lawfully keeps a firearm and lives with a person under eighteen, a person subject to an extreme risk protection order, or a person prohibited from possessing a firearm must keep it locked in a safe storage depository or disabled by a gun locking device when it is not in their immediate possession or control. New York City Administrative Code §10-312 goes further: it requires a safety locking device whenever a weapon is out of the owner's immediate possession or control, regardless of who else lives there.",
  authorities: [
    { citation: "N.Y. Penal Law §265.45", href: PEN("265.45") },
    { citation: "N.Y.C. Admin. Code §10-312", href: "https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCadmin/0-0-0-208353" },
  ],
  sections: [
    {
      heading: "The state duty is conditional",
      claims: [
        V(
          "A person who owns or is the lawful custodian of a rifle, shotgun or firearm and who resides with a person under eighteen, a person subject to an extreme risk protection order, or a person who has been convicted of a felony or serious offense or is otherwise prohibited from possessing a firearm under state or federal law, must not leave the weapon out of their immediate possession or control without having it securely locked in an appropriate safe storage depository or rendered incapable of being fired by a gun locking device. The offense is a class A misdemeanor.",
          "N.Y. Penal Law §265.45(1)",
          PEN("265.45")
        ),
        V(
          "Section 265.45(3) defines 'safe storage depository' and expressly excludes glove compartments.",
          "N.Y. Penal Law §265.45(3)",
          PEN("265.45")
        ),
        V(
          "Section 265.45(4) provides an exception for a person under eighteen lawfully hunting or using a firearm under Environmental Conservation Law authority.",
          "N.Y. Penal Law §265.45(4)",
          PEN("265.45")
        ),
      ],
    },
    {
      heading: "The New York City duty is not",
      claims: [
        V(
          "New York City makes it unlawful for the lawful owner or custodian of a weapon to store, place or leave the weapon out of their immediate possession or control without having rendered it inoperable by employing a safety locking device. Unlike the state provision, this duty does not depend on who else lives in the home.",
          "N.Y.C. Admin. Code §10-312",
          "https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCadmin/0-0-0-208353"
        ),
      ],
      body: [
        "A licensee living alone in Manhattan is subject to the City rule even though the state rule's trigger conditions are not met. This is the practical baseline for anyone licensed in the five boroughs.",
      ],
    },
    {
      heading: "A citation error worth knowing",
      body: [
        "Published sources — including Giffords' New York safe-storage page — cite Penal Law §265.50 alongside §265.45 for safe-storage penalties. That is wrong. Section 265.50 is criminal manufacture, sale or transport of an undetectable firearm, a class D felony with nothing to do with storage. Section 265.45 is the state safe-storage offense.",
        "One further oddity: §265.45 is titled 'failure to safely store... in the first degree,' which implies a second degree that does not appear to exist in the Penal Law. Treat §265.45 as the sole state safe-storage offense.",
      ],
      claims: [
        V(
          "Penal Law §265.50 is criminal manufacture, sale or transport of an undetectable firearm, rifle or shotgun — a class D felony. It is not a safe-storage provision.",
          "N.Y. Penal Law §265.50",
          PEN("265.50")
        ),
      ],
    },
    {
      heading: "Related obligations",
      claims: [
        R(
          "New York requires a firearms dealer to transfer a locking device with each firearm and imposes related warning-label and notice duties, and the State Police maintain standards for effective locking devices.",
          "N.Y. Gen. Bus. Law §396-ee(1)–(2); 9 NYCRR §471.1 et seq.",
          "https://www.nysenate.gov/legislation/laws/GBS/396-EE",
          "Cited from a secondary index rather than read in full for this page; confirm the current text before relying on the specifics."
        ),
      ],
    },
  ],
  faqs: [
    {
      q: "Do I have to lock up my gun in New York City if I live alone?",
      a: "Yes. New York City Administrative Code §10-312 requires a safety locking device whenever the weapon is out of your immediate possession or control, regardless of who else lives in the home. The state rule at Penal Law §265.45 is narrower and applies only when you reside with a minor, a person subject to an ERPO, or a prohibited person.",
    },
    {
      q: "Is a glove compartment a legal place to store a handgun?",
      a: "No. Penal Law §265.45(3) expressly excludes glove compartments from the definition of a safe storage depository.",
    },
    {
      q: "What is the penalty for failing to store a firearm safely?",
      a: "Failure to safely store under Penal Law §265.45 is a class A misdemeanor.",
    },
  ],
  related: ["transport", "getting-licensed", "red-flag-orders"],
  updated: LAWS_VERIFIED,
}

const outOfState: LawTopic = {
  slug: "out-of-state-permits",
  label: "Out-of-state permits",
  title: "Out-of-state permits and New York reciprocity",
  metaTitle: "Does NY Recognize Out-of-State Gun Permits? (No — Here's What To Do)",
  metaDescription:
    "New York recognizes no out-of-state carry permit. What the statute actually says, why a license from another New York county still is not valid in NYC, and how a non-resident applies.",
  eyebrow: "Penal Law §265.20 · §400.00",
  answer:
    "New York recognizes no out-of-state pistol permit or concealed carry license — there is no reciprocity statute. A handgun may be possessed in New York only under a license issued under Penal Law §400.00, and a license issued elsewhere in New York State is still not valid inside New York City without a special permit from the NYC police commissioner. Non-residents are not barred from applying: both the State and the NYPD accept non-resident applications.",
  contested: true,
  authorities: [
    { citation: "N.Y. Penal Law §265.20(a)(3)", href: PEN("265.20") },
    { citation: "N.Y. Penal Law §400.00(3)(a), (6)", href: PEN("400.00") },
    { citation: "38 RCNY §5-03", href: RCNY_5_03 },
  ],
  sections: [
    {
      heading: "There is no reciprocity",
      claims: [
        V(
          "New York's exemption from the weapons article for handgun possession runs only to a person to whom a license has been issued as provided under Penal Law §400.00. It does not extend to licenses issued by other states.",
          "N.Y. Penal Law §265.20(a)(3)",
          PEN("265.20")
        ),
        V(
          "A license not otherwise limited as to place or time of possession is effective throughout the state, except that it is not valid within the City of New York unless a special permit granting validity is issued by the New York City police commissioner.",
          "N.Y. Penal Law §400.00(6)",
          PEN("400.00")
        ),
      ],
      body: [
        "Two separate walls, and visitors usually only know about the first. An Ohio permit does nothing in New York. A Suffolk County carry license does nothing in Manhattan without a Special Carry License. Possession without the right license is charged as unlicensed possession, which in New York City means the Article 265 exposure set out on the penalties page.",
      ],
    },
    {
      heading: "Non-residents can apply",
      claims: [
        V(
          "Applications are made to the licensing officer in the city or county where the applicant resides, is principally employed, or has a principal place of business as a merchant or storekeeper.",
          "N.Y. Penal Law §400.00(3)(a)",
          PEN("400.00")
        ),
        V(
          "New York State's official guidance states that New York law does not require residency or in-state employment to apply for a firearm license, and that licensing officers may accept applications from non-residents.",
          "New York State, official concealed carry guidance",
          GUNSAFETY_FAQ
        ),
        V(
          "New York City accepts applications from persons residing outside New York State, but requires background-investigation forms from the local law enforcement agency in each jurisdiction of residence in the preceding five years, plus disclosure of firearms licenses held elsewhere.",
          "38 RCNY §5-03",
          RCNY_5_03
        ),
        V(
          "For non-resident carry licensees, New York City does not approve requests for multiple handguns.",
          "38 RCNY §5-25",
          RCNY_5_25
        ),
        R(
          "The statute channels applications by residence, employment or business location, while the State and the NYPD both accept non-resident applications in practice.",
          "N.Y. Penal Law §400.00(3)(a); NY State guidance; 38 RCNY §5-03",
          GUNSAFETY_FAQ,
          "There is genuine tension between the statutory text and current administrative practice in the post-Bruen landscape. Do not read this as a guarantee that any particular non-resident application will be accepted."
        ),
      ],
    },
    {
      heading: "The competitive shooting exception",
      claims: [
        V(
          "Penal Law §265.20(a)(13) provides a narrow exemption for non-residents attending or traveling to or from an organized competitive pistol match, with the handgun unloaded in a locked container, within a forty-eight-hour window and subject to conditions.",
          "N.Y. Penal Law §265.20(a)(13)",
          PEN("265.20")
        ),
      ],
    },
  ],
  faqs: [
    {
      q: "Does New York recognize my out-of-state concealed carry permit?",
      a: "No. New York has no reciprocity statute and recognizes no out-of-state pistol permit. Penal Law §265.20(a)(3) exempts only holders of a license issued under §400.00.",
    },
    {
      q: "I have a New York carry license from upstate. Can I carry in NYC?",
      a: "Not without a Special Carry License. Penal Law §400.00(6) provides that a license is not valid within New York City absent a special permit from the NYC police commissioner, and 38 RCNY §5-23 implements it.",
    },
    {
      q: "Can I apply for a New York City license if I live in another state?",
      a: "Yes. 38 RCNY §5-03 provides for applicants residing outside New York State, with additional background-investigation forms from each jurisdiction of residence over the previous five years. New York State's official guidance confirms that residency is not required to apply.",
    },
  ],
  related: ["penalties", "transport", "license-types"],
  updated: LAWS_VERIFIED,
}

const renewal: LawTopic = {
  slug: "renewal",
  label: "Renewal & recertification",
  title: "Renewal and recertification",
  metaTitle: "NY Gun License Recertification — 3 Years or 5? (Both, Here's Why)",
  metaDescription:
    "Concealed carry licenses recertify every three years, other licenses every five — and NYC licensees do not recertify with the State Police at all. Untangling the most confused rule in New York firearm law.",
  eyebrow: "Penal Law §400.00(10)",
  answer:
    "Both the three-year and five-year figures are correct, for different licenses. Concealed carry licenses issued under Penal Law §400.00(2)(f) recertify every three years; all other licenses recertify every five. Separately, licensees in New York City, Nassau, Suffolk and Westchester do not recertify with the State Police at all — a New York City license is renewed with the NYPD every three years, on the licensee's birthday.",
  authorities: [
    { citation: "N.Y. Penal Law §400.00(10)", href: PEN("400.00") },
    { citation: "N.Y.C. Admin. Code §10-131(a)", href: ADMIN_10_131 },
    { citation: "NY State recertification guidance", href: GUNSAFETY_RECERT },
  ],
  sections: [
    {
      heading: "Why the three-versus-five confusion exists",
      body: [
        "Two different things get called the same word. Recertification is a State Police process. Renewal is what your licensing officer — in the five boroughs, the NYPD — requires to keep the license alive. They have different clocks, and New York City licensees are carved out of the first one entirely.",
      ],
      claims: [
        V(
          "The general rule is that all licensees are recertified to the Division of State Police every five years, except as otherwise provided.",
          "N.Y. Penal Law §400.00(10)(b)",
          PEN("400.00")
        ),
        R(
          "Licenses issued under Penal Law §400.00(2)(f) — concealed carry licenses — are recertified or renewed every three years.",
          "N.Y. Penal Law §400.00(10)(d)",
          PEN("400.00"),
          "Corroborated by two official New York State sources, but the subdivision (d) text was read through a secondary republication rather than lifted verbatim from the legislature's site. Pull the primary text before publication."
        ),
        V(
          "New York State's official guidance confirms that concealed carry permits recertify with the State Police every three years while premises-restricted permits remain on the five-year cycle.",
          "New York State, pistol permit recertification guidance",
          GUNSAFETY_RECERT
        ),
        V(
          "Licensees with a permit issued in New York City, Nassau County, Suffolk County or Westchester County do not recertify with the State Police; they follow the requirements in place in their county.",
          "New York State, pistol permit recertification guidance",
          GUNSAFETY_RECERT
        ),
      ],
    },
    {
      heading: "New York City",
      claims: [
        V(
          "New York City handgun licenses expire not more than three years after issuance, and the City sets its application and renewal fee for a three-year license period.",
          "N.Y. Penal Law §400.00(10)(a); N.Y.C. Admin. Code §10-131(a)",
          ADMIN_10_131
        ),
        V(
          "New York City handgun licenses renew every three years on the licensee's birthday.",
          "NYPD 2022 rule revisions to 38 RCNY chapters 3 and 5",
          "https://www.nyc.gov/assets/nypd/downloads/pdf/public_information/nypd-emergency-revisions-to-chapters-3-and-5-082422.pdf"
        ),
        V(
          "A New York City rifle and shotgun permit is valid for three years and is subject to automatic renewal.",
          "N.Y.C. Admin. Code §10-303",
          ADMIN_10_303
        ),
        V(
          "Since January 1, 2018 the NYPD License Division accepts only online applications for handgun licenses, rifle and shotgun permits, and renewals.",
          "NYPD License Division",
          NYPD_PERMITS
        ),
      ],
    },
    {
      heading: "Training on renewal",
      claims: [
        V(
          "The eighteen-hour training requirement applies to the issuance or renewal of a concealed carry license.",
          "N.Y. Penal Law §400.00(19)",
          PEN("400.00")
        ),
      ],
    },
  ],
  faqs: [
    {
      q: "Is New York recertification every three years or five?",
      a: "Both, depending on the license. Concealed carry licenses under Penal Law §400.00(2)(f) are on a three-year cycle under §400.00(10)(d); other licenses are on the five-year cycle under §400.00(10)(b).",
    },
    {
      q: "Do NYC licensees recertify with the State Police?",
      a: "No. New York State's guidance is explicit that licensees in New York City, Nassau, Suffolk and Westchester do not recertify with the State Police and instead follow their county's requirements. In the five boroughs that means renewing with the NYPD.",
    },
    {
      q: "When does my NYC license expire?",
      a: "New York City handgun licenses run for a three-year term and renew on the licensee's birthday. The rifle and shotgun permit is also a three-year term, subject to automatic renewal.",
    },
  ],
  related: ["training", "license-types", "getting-licensed"],
  updated: LAWS_VERIFIED,
}

const longGuns: LawTopic = {
  slug: "long-guns",
  label: "Rifles & shotguns",
  title: "Rifles and shotguns in New York City",
  metaTitle: "NYC Rifle & Shotgun Permit — Admin. Code §10-303 Explained",
  metaDescription:
    "New York City requires a separate NYPD permit to possess or purchase a rifle or shotgun, plus registration of each long gun. How it differs from the handgun license, and the state semiautomatic rifle license.",
  eyebrow: "NYC Admin. Code §10-303",
  answer:
    "New York City requires a separate NYPD permit to possess or purchase a rifle or shotgun — a requirement that exists nowhere else in New York State. The permit is valid for three years and subject to automatic renewal, and each long gun must additionally be registered. Separately, New York State requires a semiautomatic rifle license to purchase or take ownership of a semiautomatic rifle where the transfer occurred on or after the effective date of chapter 212 of the laws of 2022.",
  authorities: [
    { citation: "N.Y.C. Admin. Code §10-303", href: ADMIN_10_303 },
    { citation: "N.Y. Penal Law §400.00(2)", href: PEN("400.00") },
  ],
  sections: [
    {
      heading: "The New York City permit",
      claims: [
        V(
          "In New York City it is unlawful to dispose of a rifle or shotgun to any person unless that person holds a permit for the possession and purchase of rifles and shotguns.",
          "N.Y.C. Admin. Code §10-303",
          ADMIN_10_303
        ),
        V(
          "Applicants must be twenty-one or older and are disqualified by felony convictions, serious offenses, and certain mental-health history. The NYPD must issue or deny within thirty days, extendable to sixty if the investigation requires it.",
          "N.Y.C. Admin. Code §10-303",
          ADMIN_10_303
        ),
        V(
          "The permit is valid for three years and is subject to automatic renewal.",
          "N.Y.C. Admin. Code §10-303",
          ADMIN_10_303
        ),
        V(
          "New York City additionally requires a certificate of registration for each rifle and shotgun, and separately bans assault weapons.",
          "N.Y.C. Admin. Code §10-304; §10-303.1",
          ADMIN_10_303
        ),
      ],
      body: [
        "This is the requirement most new New York City residents do not know exists. There is no statewide long-gun possession license in New York; the rifle and shotgun permit is a City creation, administered by a separate NYPD section in Kew Gardens rather than the handgun License Division at One Police Plaza.",
      ],
    },
    {
      heading: "The state semiautomatic rifle license",
      claims: [
        V(
          "A license for a semiautomatic rifle, other than an assault weapon or disguised gun, is required to purchase or take possession of such a rifle where the transfer of ownership occurs on or after the effective date of chapter 212 of the laws of 2022.",
          "N.Y. Penal Law §400.00(2), unlettered paragraph",
          PEN("400.00")
        ),
        R(
          "The minimum age to purchase or take ownership of a semiautomatic rifle is twenty-one, and a person who lawfully owned a semiautomatic rifle before the effective date does not need the license for that rifle.",
          "N.Y. Penal Law §400.00(2) (L.2022 ch. 212); NY State guidance",
          GUNSAFETY_FAQ,
          "The grandfathering point is drawn from State guidance rather than statutory text read verbatim; confirm before publication."
        ),
      ],
      body: [
        "Note the citation. This license lives in the unlettered paragraph of §400.00(2), not in §400.00(16-a) — subdivision 16-a is SAFE Act assault-weapon registration. The miscitation is widespread enough that it is worth checking any source that repeats it.",
      ],
    },
  ],
  faqs: [
    {
      q: "Do I need a permit for a shotgun in New York City?",
      a: "Yes. New York City Administrative Code §10-303 requires an NYPD rifle and shotgun permit to possess or purchase a long gun, and §10-304 requires each one to be registered. No equivalent requirement exists elsewhere in New York State.",
    },
    {
      q: "How long is the NYC rifle and shotgun permit valid?",
      a: "Three years, subject to automatic renewal, under Administrative Code §10-303.",
    },
    {
      q: "Is the rifle permit the same as a handgun license?",
      a: "No. They are separate permits with separate applications, separate fees, and separate NYPD sections — the rifle and shotgun section is in Kew Gardens, and handgun licensing is at One Police Plaza.",
    },
  ],
  related: ["buying-a-handgun", "eligibility", "getting-licensed"],
  updated: LAWS_VERIFIED,
}

const buying: LawTopic = {
  slug: "buying-a-handgun",
  label: "Buying a handgun",
  title: "Buying a handgun once you are licensed",
  metaTitle: "Buying a Handgun in NYC — Purchase Authorization & Background Checks",
  metaDescription:
    "A New York City license does not by itself let you buy. The NYPD purchase authorization, quantity limits by license type, the ninety-day rule, and New York's background check regime.",
  eyebrow: "38 RCNY §5-25",
  answer:
    "In New York City a licensee may not take possession of a handgun without prior written authorization from the NYPD License Division. The authorization is valid for thirty days and must be presented to the dealer. How many handguns you may acquire depends on your license type, no one may acquire a firearm within ninety days of a previous acquisition, and the handgun must be presented to the License Division for inspection after purchase.",
  authorities: [
    { citation: "38 RCNY §5-25", href: RCNY_5_25 },
    { citation: "N.Y. Penal Law §400.03", href: PEN("400.03") },
    { citation: "N.Y. Gen. Bus. Law §898", href: GBS_898 },
  ],
  sections: [
    {
      heading: "The purchase authorization",
      claims: [
        V(
          "A New York City licensee may not take possession of a handgun without prior written authorization from the License Division. The authorization form is valid for thirty days from issuance and must be presented to the dealer.",
          "38 RCNY §5-25",
          RCNY_5_25
        ),
        V(
          "No person shall acquire a firearm if that person has acquired a firearm within the previous ninety days.",
          "38 RCNY §5-25",
          RCNY_5_25
        ),
        V(
          "After purchase, the licensee must contact the License Division within seventy-two hours to request inspection, and must submit the completed authorization form, the bill of sale, photographs of the handgun and its serial number, safety locking device photographs, and proof of safe storage. The authorization form must be returned within ten calendar days of its expiration or of completion of the transaction.",
          "38 RCNY §5-25",
          RCNY_5_25
        ),
      ],
    },
    {
      heading: "How many handguns you may own",
      claims: [
        V(
          "Quantity is set by license type: a premises-residence licensee is authorized one handgun initially, with additional handguns approved only on a showing of proper safeguarding and compliance with waiting periods; a premises-business licensee, one; a carry or special carry licensee, two, of which only one may be carried at a time with the other secured; a non-resident carry licensee's request for multiple handguns is not approved; a carry guard or special carry guard licensee, one, with additional handguns reviewed case by case; and a gun custodian's number is set by the Division Head based on demonstrated need.",
          "38 RCNY §5-25",
          RCNY_5_25
        ),
      ],
    },
    {
      heading: "Background checks",
      claims: [
        V(
          "New York requires all sales, exchanges or disposals of firearms, rifles or shotguns to be conducted through a background check via the State Police, with exceptions for transfers by a licensed importer, manufacturer or dealer acting under a federal firearms license, and for transfers between members of an immediate family — spouses, domestic partners, children and step-children. Violation is a class A misdemeanor.",
          "N.Y. Gen. Bus. Law §898",
          GBS_898
        ),
        V(
          "New York requires ammunition sellers to run a background check through the State Police before transferring ammunition.",
          "N.Y. Penal Law §400.03",
          PEN("400.03"),
          "The statute does not itself set a fee. Secondary reporting places the ammunition check at $2.50 and the firearm check at $9.00; those amounts were not confirmed against a primary source and are omitted here deliberately."
        ),
        R(
          "New York serves as a state point of contact for the federal background check system, so dealers run checks through the State Police rather than directly with the FBI.",
          "N.Y. Executive Law §228",
          "https://law.justia.com/codes/new-york/exc/article-11/228/",
          "Read through a secondary republication; the effective date was not verified."
        ),
      ],
    },
  ],
  faqs: [
    {
      q: "Can I buy a handgun as soon as my NYC license is issued?",
      a: "Not immediately. Under 38 RCNY §5-25 you need prior written purchase authorization from the License Division, valid thirty days, which you present to the dealer.",
    },
    {
      q: "How many handguns can I own with a NYC carry license?",
      a: "Two under 38 RCNY §5-25, of which only one may be carried at a time — the other must remain secured. Premises licensees are authorized one initially.",
    },
    {
      q: "Is there a waiting period between purchases?",
      a: "Yes. 38 RCNY §5-25 provides that no person shall acquire a firearm within ninety days of a previous acquisition.",
    },
  ],
  related: ["long-guns", "safe-storage", "getting-licensed"],
  updated: LAWS_VERIFIED,
}

const redFlag: LawTopic = {
  slug: "red-flag-orders",
  label: "Red flag orders",
  title: "Extreme risk protection orders",
  metaTitle: "NY Red Flag Law — Extreme Risk Protection Orders (CPLR Art. 63-A)",
  metaDescription:
    "Who can petition for an extreme risk protection order in New York, the mandatory-filing duty on law enforcement, and what an ERPO does to a firearm license.",
  eyebrow: "CPLR Article 63-A",
  answer:
    "New York's red flag law lets a police officer, district attorney, family or household member, school administrator, or a health care practitioner who has treated the respondent in the previous six months petition a court for an extreme risk protection order. An ERPO requires surrender of all firearms, rifles and shotguns and suspension or revocation of any firearm license, and it makes the respondent a prohibited person for purposes of the safe-storage duty owed by anyone who lives with them.",
  contested: true,
  authorities: [{ citation: "N.Y. C.P.L.R. article 63-A, §§6340–6348", href: CPLR_63A }],
  sections: [
    {
      heading: "Who may petition",
      claims: [
        V(
          "A petitioner may be a police officer or district attorney with jurisdiction where the respondent resides; a family or household member as defined in Social Services Law §459-a; a school administrator or designee of a school in which the respondent is currently enrolled or was enrolled within the preceding six months; or a licensed health care practitioner who has treated the respondent within the six months preceding the filing.",
          "N.Y. C.P.L.R. §6340(2)",
          CPLR_63A
        ),
        V(
          "A law enforcement agency employing a police officer, or a police officer or district attorney with jurisdiction, shall file an application upon receipt of credible information that an individual is likely to engage in conduct that would result in serious harm to themselves or others, unless the officer determines there is no probable cause for such filing.",
          "N.Y. C.P.L.R. §6341",
          CPLR_63A
        ),
      ],
    },
    {
      heading: "The structure of the article",
      list: [
        { term: "§6340", detail: "Definitions." },
        { term: "§6341", detail: "Application for an extreme risk protection order." },
        { term: "§6342", detail: "Issuance of a temporary extreme risk protection order." },
        { term: "§6343", detail: "Issuance of a final extreme risk protection order." },
        { term: "§6344", detail: "Surrender and removal of firearms, rifles and shotguns." },
        { term: "§6345", detail: "Request for renewal." },
        { term: "§6346", detail: "Expiration." },
        { term: "§6347", detail: "Effect of findings in subsequent proceedings." },
        { term: "§6348", detail: "Protections for health care providers applying for an ERPO." },
      ],
    },
    {
      heading: "What an order does",
      claims: [
        V(
          "Issuance of an extreme risk protection order triggers surrender of all firearms, rifles and shotguns and suspension or revocation of any firearm license, and a person subject to an ERPO is a prohibited person for purposes of the safe-storage duty owed by anyone residing with them.",
          "N.Y. C.P.L.R. §6344; N.Y. Penal Law §400.00(11); §265.45(1)",
          CPLR_63A
        ),
        R(
          "The commonly reported standards are probable cause for a temporary order and clear and convincing evidence for a final order, with a final order lasting up to one year and renewable.",
          "N.Y. C.P.L.R. §§6342, 6343, 6345, 6346",
          CPLR_63A,
          "These specifics were not extracted verbatim from the statutory text. Verify §§6342, 6343 and 6346 directly before publication."
        ),
      ],
    },
  ],
  faqs: [
    {
      q: "Who can file a red flag petition in New York?",
      a: "Under CPLR §6340(2): a police officer or district attorney with jurisdiction, a family or household member, a school administrator of a school the respondent attends or attended within six months, or a licensed health care practitioner who has treated the respondent within the previous six months.",
    },
    {
      q: "Does an ERPO affect my gun license?",
      a: "Yes. It requires surrender of firearms and suspension or revocation of any firearm license, and it also triggers the safe-storage duty for anyone who lives with the respondent and owns a firearm.",
    },
  ],
  related: ["safe-storage", "eligibility"],
  updated: LAWS_VERIFIED,
}

const retiredLeo: LawTopic = {
  slug: "retired-law-enforcement",
  label: "Retired law enforcement",
  title: "Retired law enforcement and LEOSA",
  metaTitle: "LEOSA in New York — Retired Law Enforcement Carry Rules",
  metaDescription:
    "What the federal Law Enforcement Officers Safety Act does and does not do for a qualified retired officer in New York City, and how it interacts with the sensitive-location rules.",
  eyebrow: "18 U.S.C. §926C",
  answer:
    "Under the federal Law Enforcement Officers Safety Act, a qualified retired law enforcement officer who meets the statute's conditions — including at least ten years of service or separation due to a service-connected disability, separation in good standing, and current annual firearms qualification — may carry a concealed firearm, subject to the statute's limits and to state laws on where carry is prohibited. New York's sensitive-location statute separately exempts qualified retired law enforcement officers.",
  authorities: [
    { citation: "18 U.S.C. §926C", href: LEOSA },
    { citation: "N.Y. Penal Law §265.01-e(3)", href: PEN("265.01-E") },
  ],
  sections: [
    {
      heading: "The federal authority",
      claims: [
        V(
          "Under the federal Law Enforcement Officers Safety Act, a qualified retired law enforcement officer who meets the statute's conditions — including at least ten years of aggregate service or separation due to a service-connected disability, separation in good standing, and current annual firearms qualification — may carry a concealed firearm, subject to the statute's limits and to state laws on where carry is prohibited.",
          "18 U.S.C. §926C",
          LEOSA
        ),
      ],
      body: [
        "The final clause is the one that matters in New York City. LEOSA authorizes carry; it does not override state rules about where carry is prohibited. Those rules are the sensitive-location statute, and they operate independently.",
      ],
    },
    {
      heading: "How New York treats it",
      claims: [
        V(
          "Section 265.01-e(3) exempts qualified retired law enforcement officers from the sensitive-location offense.",
          "N.Y. Penal Law §265.01-e(3)",
          PEN("265.01-E")
        ),
        V(
          "Section 265.01-d(2) exempts qualified current and retired federal law enforcement officers under 18 U.S.C. §§926B–926C from the private-property provision.",
          "N.Y. Penal Law §265.01-d(2)",
          PEN("265.01-D")
        ),
      ],
    },
  ],
  faqs: [
    {
      q: "Can a retired police officer carry in New York City under LEOSA?",
      a: "LEOSA authorizes a qualified retired officer meeting its conditions to carry concealed, subject to the statute's limits and to state law on prohibited places. New York's sensitive-location statute at §265.01-e(3) exempts qualified retired law enforcement officers.",
    },
    {
      q: "What does LEOSA require to stay qualified?",
      a: "Among other conditions: at least ten years of aggregate service or separation due to a service-connected disability, separation in good standing, and current annual firearms qualification. The statute sets out the full list.",
    },
  ],
  related: ["sensitive-locations", "private-property", "license-types"],
  updated: LAWS_VERIFIED,
}

export const LAW_TOPICS: LawTopic[] = [
  sensitiveLocations,
  privateProperty,
  penalties,
  licenseTypes,
  eligibility,
  training,
  transport,
  safeStorage,
  outOfState,
  renewal,
  longGuns,
  buying,
  redFlag,
  retiredLeo,
]

export function getTopic(slug: string) {
  return LAW_TOPICS.find((t) => t.slug === slug)
}

/** Groupings for the library index. */
export const LAW_SECTIONS: { title: string; blurb: string; slugs: string[] }[] = [
  {
    title: "Carrying",
    blurb: "What a license lets you do, and the two rules that decide where it stops.",
    slugs: ["sensitive-locations", "private-property", "license-types", "transport"],
  },
  {
    title: "Getting licensed",
    blurb: "Eligibility, training, and keeping the license alive.",
    slugs: ["eligibility", "training", "renewal"],
  },
  {
    title: "Owning",
    blurb: "Purchase, storage, and the rules that apply after the license is issued.",
    slugs: ["buying-a-handgun", "safe-storage", "long-guns"],
  },
  {
    title: "Consequences and special cases",
    blurb: "What goes wrong, and the categories that follow different rules.",
    slugs: ["penalties", "out-of-state-permits", "red-flag-orders", "retired-law-enforcement"],
  },
]

/** Every claim on the site, flattened — powers /sources and the review doc. */
export function allClaims(): { topic: LawTopic; claim: LawClaim }[] {
  return LAW_TOPICS.flatMap((topic) =>
    topic.sections.flatMap((s) => (s.claims ?? []).map((claim) => ({ topic, claim })))
  )
}

export function claimsNeedingReview() {
  return allClaims().filter(({ claim }) => claim.status === "review")
}
