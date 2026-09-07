/**
 * THE single source of truth for attorney-referral partners — the seam guardrail #3
 * (AGENTS.md) requires: when a case needs legal judgment we cannot give, we hand the
 * applicant to a New York-licensed attorney we would use ourselves. Both the /partners
 * directory and each partner profile render entirely from here, so a second partner
 * costs a config object, not a new page. Phase 2 (the in-portal referral card, admin
 * visibility) will read this SAME file — which is why the data lives here, not in JSX.
 *
 * CONTENT GATE — enforced by the type, not a checklist:
 *   hidden       404 everywhere. The default for a new partner.
 *   coming_soon  The route renders a coming-soon screen (or the real profile behind a
 *                preview cookie). noindex, out of sitemap/nav/footer/llms.
 *   public       Live and indexed, in the sitemap and nav.
 * Nothing goes `public` until the attorney confirms his credentials, rate, bio and
 * booking URL IN WRITING. `coming_soon` is for showing him and the team — not
 * publication. Do not invent a value to fill a field — leave it out (several are optional).
 */

export type PartnerVisibility = "hidden" | "coming_soon" | "public"

/** A credential row: mono term label + its value. e.g. term "J.D." value "NYU School of Law". */
export interface PartnerCredential {
  term: string
  value: string
  detail?: string
}

/** A recognition badge. `tier: "primary"` gets the brass-tinted lead treatment. */
export interface PartnerHonor {
  label: string
  detail?: string
  tier?: "primary"
}

/** One cell of the credential band under the hero: a big figure + a mono label. */
export interface PartnerHighlight {
  figure: string
  label: string
}

export interface PartnerService {
  title: string
  /** One-line description; shown on the profile (the card stays title-only). */
  detail?: string
}

export interface PartnerFaq {
  q: string
  a: string
}

export interface Partner {
  /** URL segment AND the vanity route: /{slug}. */
  slug: string
  visibility: PartnerVisibility
  name: string
  /** e.g. "Esq." */
  credentialsSuffix: string
  firm: string
  role: string
  /** One line: what he does for our applicants. */
  headline: string
  /** Paragraphs. */
  bio: string[]
  /** src = plain card portrait; cutout = transparent hero figure; panel = hero tonal wash. */
  photo: { src: string; alt: string; cutout?: string; panel?: string }
  address: { street: string; city: string; state: string; zip: string }
  phone: string
  email: string
  website: string
  admissions: string[]
  education: PartnerCredential[]
  honors: PartnerHonor[]
  /** The credential band under the hero — figures with mono labels. */
  highlights: PartnerHighlight[]
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
    // Coming-soon preview only. Flip to "public" solely after Ethan confirms every
    // field below in writing and a real bookingUrl is supplied.
    visibility: "coming_soon",
    name: "Ethan A. Brecher",
    credentialsSuffix: "Esq.",
    firm: "Law Office of Ethan A. Brecher, LLC",
    role: "Founder",
    headline:
      "A New York attorney who represents firearms-license applicants before the NYPD License Division.",
    bio: [
      "Ethan has practised in New York for 34 years, building a litigation and counselling practice for Wall Street professionals, physicians and individuals in high-stakes disputes — and, alongside it, a dedicated NYC firearms licensing practice representing applicants and licensed dealers before the NYPD License Division.",
    ],
    photo: {
      src: "/partners/ethan-brecher.jpg",
      alt: "Ethan A. Brecher",
      cutout: "/partners/ethan-brecher-cutout.webp",
      panel: "/partners/ethan-brecher-panel.jpg",
    },
    address: { street: "244 Fifth Avenue, Suite B241", city: "New York", state: "NY", zip: "10001" },
    phone: "860-590-0138",
    email: "ethan@ethanbrecherlaw.com",
    website: "https://ethanbrecherlaw.com",
    admissions: ["New York", "Connecticut", "Various federal courts"],
    education: [
      { term: "J.D.", value: "New York University School of Law", detail: "1991" },
      { term: "B.A.", value: "Cornell University", detail: "History, cum laude, 1988" },
    ],
    honors: [
      { label: "Super Lawyers", detail: "2009–2011, 2013–2026", tier: "primary" },
      { label: "Avvo 10.0", detail: "4.9★ across 53 reviews" },
      { label: "AV Preeminent", detail: "peer rating" },
      { label: "American Law Institute", detail: "elected 2013" },
      { label: "2d Cir. Pro Bono Panel", detail: "appointed" },
    ],
    highlights: [
      { figure: "34", label: "Years in practice" },
      { figure: "10.0", label: "Avvo rating" },
      { figure: "4.9★", label: "53 client reviews" },
      { figure: "2009–26", label: "Super Lawyers" },
      { figure: "ALI", label: "Elected member, 2013" },
      { figure: "AV", label: "Preeminent peer rating" },
    ],
    serves: ["New York", "New Jersey", "Connecticut", "Florida"],
    yearsInPractice: 34,
    services: [
      { title: "Premises and carry license applications", detail: "Preparing and presenting the initial application to the NYPD License Division." },
      { title: "Appeals of denials", detail: "Challenging a denial within the deadline that applies to your case." },
      { title: "Rifle and shotgun permits", detail: "The separate long-gun permitting process." },
      { title: "Suspensions and revocations", detail: "Responding when a licence is suspended or revoked." },
      { title: "Renewals and amendments", detail: "Keeping a licence current and updating its terms." },
      { title: "Correspondence with the License Division", detail: "Handling the Division's requests and follow-ups on your behalf." },
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

/**
 * A partner by slug that is at least previewable (coming_soon or public), or null.
 * Hidden/absent partners are invisible everywhere. The PAGE decides whether to render
 * the coming-soon screen or the profile based on visibility + preview cookie.
 */
export const partnerBySlug = (slug: string): Partner | null =>
  PARTNERS.find((p) => p.slug === slug && p.visibility !== "hidden") ?? null

/** PUBLIC partners only — the set the sitemap, nav, footer and llms.txt may surface. */
export const publishedPartners = (): Partner[] => PARTNERS.filter((p) => p.visibility === "public")

/** Public + coming-soon — the set a preview visitor may see in the directory. */
export const previewablePartners = (): Partner[] =>
  PARTNERS.filter((p) => p.visibility === "coming_soon" || p.visibility === "public")

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
