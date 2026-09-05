/**
 * THE single source of truth for attorney-referral partners — the seam guardrail #3
 * (AGENTS.md) requires: when a case needs legal judgment we cannot give, we hand the
 * applicant to a New York-licensed attorney we would use ourselves. Both the /partners
 * directory and each partner profile render entirely from here, so a second partner
 * costs a config object, not a new page. Phase 2 (the in-portal referral card, admin
 * visibility) will read this SAME file — which is why the data lives here, not in JSX.
 *
 * CONTENT GATE — enforced by the type, not a checklist. A partner ships with
 * `published: false`; `partnerBySlug` returns null and `publishedPartners()` omits it,
 * so its profile 404s and it appears in no directory, sitemap, or link. Every
 * credential, the rate, the bio and the booking URL must be confirmed by the attorney
 * IN WRITING before `published` flips to true. Do not invent a value to fill a field —
 * leave it out (that is why several fields are optional).
 */

export interface PartnerCredential {
  label: string
  detail?: string
}

export interface PartnerService {
  title: string
  /** One-line description; omitted where we have no confirmed copy. */
  detail?: string
}

export interface PartnerFaq {
  q: string
  a: string
}

export interface Partner {
  /** URL segment AND the vanity route: /{slug}. */
  slug: string
  /** false → profile 404s, excluded from directory/sitemap/links. */
  published: boolean
  name: string
  /** e.g. "Esq." */
  credentialsSuffix: string
  firm: string
  role: string
  /** One line: what he does for our applicants. */
  headline: string
  /** Paragraphs. */
  bio: string[]
  photo: { src: string; alt: string }
  address: { street: string; city: string; state: string; zip: string }
  phone: string
  email: string
  website: string
  admissions: string[]
  education: PartnerCredential[]
  honors: PartnerCredential[]
  /** States he serves. */
  serves: string[]
  yearsInPractice: number
  /** What he handles for OUR applicants. */
  services: PartnerService[]
  /** Questions he can answer that we cannot. */
  qualifyingQuestions: string[]
  faqs: PartnerFaq[]
  rate: { amount: number; unit: string }
  /** HIS scheduler — never ours. Omitted until confirmed; CTA falls back to his phone. */
  bookingUrl?: string
}

export const PARTNERS: Partner[] = [
  {
    slug: "ethanbrecher",
    // GATED: flip to true only after Ethan confirms every field below in writing,
    // the portrait is saved to public/partners/ethan-brecher.jpg, and a real
    // bookingUrl is supplied.
    published: false,
    name: "Ethan A. Brecher",
    credentialsSuffix: "Esq.",
    firm: "Law Office of Ethan A. Brecher, LLC",
    role: "Founder",
    headline:
      "A New York attorney who represents firearms-license applicants before the NYPD License Division.",
    bio: [
      "Ethan has practised in New York for 34 years, building a litigation and counselling practice for Wall Street professionals, physicians and individuals in high-stakes disputes — and, alongside it, a dedicated NYC firearms licensing practice representing applicants and licensed dealers before the NYPD License Division.",
    ],
    photo: { src: "/partners/ethan-brecher.jpg", alt: "Ethan A. Brecher" },
    address: { street: "244 Fifth Avenue, Suite B241", city: "New York", state: "NY", zip: "10001" },
    phone: "860-590-0138",
    email: "ethan@ethanbrecherlaw.com",
    website: "https://ethanbrecherlaw.com",
    admissions: ["New York", "Connecticut", "Various federal courts"],
    education: [
      { label: "J.D., New York University School of Law", detail: "1991" },
      { label: "B.A., Cornell University", detail: "History, cum laude, 1988" },
    ],
    honors: [
      { label: "Super Lawyers", detail: "2009–2011, 2013–2026" },
      { label: "Avvo 10.0", detail: "4.9★ across 53 reviews" },
      { label: "AV Preeminent", detail: "peer rating" },
      { label: "American Law Institute", detail: "elected 2013" },
      { label: "U.S. Court of Appeals, 2d Circuit", detail: "Pro Bono Panel" },
    ],
    serves: ["New York", "New Jersey", "Connecticut", "Florida"],
    yearsInPractice: 34,
    services: [
      { title: "Premises and carry license applications" },
      { title: "Appeals of denials" },
      { title: "Rifle and shotgun permits" },
      { title: "Suspensions and revocations" },
      { title: "Renewals and amendments" },
      { title: "Correspondence with the License Division" },
    ],
    qualifyingQuestions: [
      "I have an arrest from years ago that was sealed or dismissed. How does disclosing it affect my application?",
      "I'm not a U.S. citizen. Can I apply for a license at all?",
      "Am I allowed to drive with my firearm in the car — through New Jersey, or upstate?",
      "My application was denied. What are my options, and how long do I have?",
      "There's an order of protection in my history. What does that mean for me?",
      "I hold a pistol license in another New York county. How does that interact with a City licence?",
      "What happens to my licence if I'm arrested, or if my employer asks about it?",
      "My licence was suspended. How do I get it back?",
    ],
    faqs: [
      {
        q: "Are you affiliated with Gun License NYC?",
        a: "No. Ethan Brecher is an independent attorney, not an employee or agent of Gun License NYC. We refer applicants to him when a case needs legal judgment we are not licensed to give. Retaining him creates an attorney–client relationship with his firm alone.",
      },
      {
        q: "How are his fees handled?",
        a: "You pay his office directly at his own rate. Gun License NYC receives no share of his fees and no referral fee — we do not profit from sending you to him.",
      },
      {
        q: "Will he see my file, or share it with you?",
        a: "No. He runs his own intake and conflicts check, and what you tell him is his to keep — protected by attorney–client privilege. He does not review your file for us, and we do not receive his advice to you.",
      },
    ],
    rate: { amount: 300, unit: "hour" },
    // bookingUrl intentionally omitted — no confirmed scheduler yet; the CTA falls
    // back to his office phone until one is supplied.
  },
]

/** A published partner by slug, or null. Unpublished partners are invisible everywhere. */
export const partnerBySlug = (slug: string): Partner | null =>
  PARTNERS.find((p) => p.slug === slug && p.published) ?? null

/** Every published partner, in config order. */
export const publishedPartners = (): Partner[] => PARTNERS.filter((p) => p.published)

/** The canonical path for a partner — the vanity URL /{slug}. */
export const partnerPath = (p: Partner): string => `/${p.slug}`

/** Full name with suffix, e.g. "Ethan A. Brecher, Esq." */
export const partnerFullName = (p: Partner): string =>
  p.credentialsSuffix ? `${p.name}, ${p.credentialsSuffix}` : p.name

/**
 * The "schedule" CTA target. His scheduler if we have one (opens in a new tab); until
 * then, his office phone — we never hold his calendar or collect his intake.
 */
export function partnerSchedule(p: Partner): { href: string; label: string; external: boolean } {
  if (p.bookingUrl) return { href: p.bookingUrl, label: "Schedule a call", external: true }
  return { href: `tel:${p.phone.replace(/[^0-9+]/g, "")}`, label: "Call his office to schedule", external: false }
}
