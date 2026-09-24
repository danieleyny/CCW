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
  /** When set, the honor renders as an external link (target=_blank rel=noopener). */
  href?: string
}

/** A time-sensitive callout on the profile — the attorney's own advertising content,
 *  attributed to him, never generalized elsewhere on the site. */
export interface PartnerCallout {
  heading: string
  body: string
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
  /** The attorney's OFFICE line. PUBLIC — he asked for it displayed. It is a real
   *  tel: link ONLY inside partner-advertising-footer.tsx; every other CTA still points
   *  at the consultation form. */
  phone: string
  /** The attorney's CELL line. PUBLIC — rendered (with `phone`) in the advertising footer. */
  cellPhone: string
  /** PUBLIC — he asked for it displayed. A real mailto: link ONLY inside the advertising
   *  footer; every other route to him goes through the consultation form. */
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
  /** How his office takes payment — rendered in the fees block + FAQ. Paid directly to him. */
  paymentMethods: string[]
  /** A card-payment link on HIS OWN Stripe account (his payouts). Never our checkout /
   *  our Stripe. Unset until set up separately; when present, renders a "pay by card" link. */
  paymentUrl?: string
  /** The attorney-advertising line, his words, verbatim. Rendered last on every page of
   *  his section (NY Rule 7.1). Required for any non-hidden partner. */
  advertisingDisclaimer: string
  /** His personal statement — rendered as an attributed pull quote near the bio. */
  statement?: string
  /** Time-sensitive advertising callouts (his words), shown above the qualifying list. */
  callouts?: PartnerCallout[]
  /** HIS scheduler — never ours. Reserved for staff/Phase-2 use; the PUBLIC CTA always
   *  points at our consultation form, never at a scheduler or phone. */
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
      "Ethan has practised in New York for 35 years, building a litigation and counselling practice for Wall Street professionals, physicians and individuals in high-stakes disputes — and, alongside it, a dedicated NYC firearms licensing practice representing applicants and licensed dealers before the NYPD License Division.",
    ],
    photo: {
      src: "/partners/ethan-brecher.jpg",
      alt: "Ethan A. Brecher",
      cutout: "/partners/ethan-brecher-cutout.webp",
      panel: "/partners/ethan-brecher-panel.jpg",
    },
    address: { street: "244 Fifth Avenue, Suite B241", city: "New York", state: "NY", zip: "10001" },
    phone: "860-590-0138",
    cellPhone: "929-539-1541",
    email: "ethan@ethanbrecherlaw.com",
    website: "https://ethanbrecherlaw.com",
    admissions: ["New York", "Connecticut", "Various federal courts"],
    education: [
      { term: "J.D.", value: "New York University School of Law", detail: "1991" },
      { term: "B.A.", value: "Cornell University", detail: "History, cum laude, 1988" },
    ],
    honors: [
      { label: "Super Lawyers", detail: "2009–2011, 2013–2026", tier: "primary" },
      { label: "Avvo 10.0", href: "https://www.avvo.com/attorneys/10001-ny-ethan-brecher-910482.html" },
      { label: "AV Preeminent", detail: "peer rating" },
      { label: "American Law Institute", detail: "elected 2013" },
      { label: "2d Cir. Pro Bono Panel", detail: "2013–2015" },
      { label: "Arbitrator, American Arbitration Association", detail: "Commercial, Employment, Consumer and Expedited Panels", href: "https://www.adr.org/" },
      { label: "Arbitrator, DecisionLayer", href: "https://www.decisionlayer.ai/" },
      { label: "18 Google reviews", detail: "Read client reviews", href: "https://www.lawyers.com/new-york/new-york/ethan-brecher-483358-a/#reviews" },
    ],
    highlights: [
      { figure: "35", label: "Years in practice" },
      { figure: "10.0", label: "Avvo rating" },
      { figure: "18", label: "Google reviews" },
      { figure: "2009–26", label: "Super Lawyers" },
      { figure: "AAA", label: "Arbitrator, AAA panels" },
      { figure: "AV", label: "Preeminent peer rating" },
    ],
    serves: ["New York", "New Jersey", "Connecticut"],
    yearsInPractice: 35,
    services: [
      // Q11 — he REVIEWS applications; he does not prepare or file them.
      { title: "Review of premises and carry applications", detail: "A lawyer's review of the application you prepare and file yourself. He does not prepare applications." },
      { title: "Denials and internal NYPD appeals", detail: "Challenging a denial through the License Division's internal appeal, and in court where that is available." },
      { title: "Delayed applications", detail: "A letter to the License Division asking it to move a stalled application forward." },
      { title: "Rifle and shotgun permits", detail: "The separate long-gun permitting process." },
      { title: "Suspensions and revocations", detail: "Responding when a licence is suspended or revoked." },
      { title: "Renewals and amendments", detail: "Keeping a licence current and updating its terms." },
      { title: "Correspondence with the License Division", detail: "Handling the Division's requests and follow-ups on your behalf." },
    ],
    qualifyingQuestions: [
      "I have an arrest from years ago that was sealed or dismissed. How does disclosing it affect my application?",
      "I'm not a U.S. citizen. Can I apply for a license at all?",
      "Am I allowed to drive with my firearm in the car — through New Jersey, or upstate?",
      "My application was denied. How do I appeal inside the NYPD, and how long do I have?",
      "My application was denied for another reason. What are my options?",
      "My application has been pending for months. Can anything be done?",
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
        a: "You pay his office directly at his own rate. His office accepts credit card, wire and Zelle, paid directly to him. Gun License NYC receives no share of his fees and no referral fee — we do not profit from sending you to him.",
      },
      {
        q: "Will he see my file, or share it with you?",
        a: "Your consultation request goes straight to his office, and we never see it. What you tell him stays between you and his firm. We don't review your file for him, and we don't receive his advice to you.",
      },
    ],
    rate: { amount: 350, unit: "hour" },
    paymentMethods: ["Credit card", "Wire transfer", "Zelle"],
    // paymentUrl intentionally unset — a card link points to HIS OWN Stripe account,
    // set up separately; never our checkout / our Stripe.
    advertisingDisclaimer: "Attorney Advertising. Prior results do not guarantee a similar outcome.",
    // Q14 — his words; two typos fixed ("Though"→"Through", "then"→"than") and the firm
    // name punctuation. Confirm the edits with him before flipping to public.
    statement:
      "I understand the frustration of having a firearm permit delayed or denied. Through aggressive pursuit of all legal rights, you will have no better friend, and the NYPD no worse enemy, than the Law Office of Ethan A. Brecher, LLC in pursuing all legal avenues to secure your firearm permit.",
    // Source: E. Brecher written answers, Sept 2026, Q12. His statement, not ours; do not
    // generalize these deadlines elsewhere on the site (registry, portal, other marketing).
    callouts: [
      {
        heading: "Denied? Time is of the essence.",
        body: "Contact him as soon as possible after receiving a denial. There is generally only 90 days to file an internal NYPD appeal, and failing to pursue that internal appeal would likely bar an Article 78 proceeding in court.",
      },
      {
        heading: "Waiting too long?",
        body: "If a carry application has been pending more than 6 months, or a rifle/shotgun permit more than 60 days, a call to have a letter sent to the NYPD may help move it forward.",
      },
    ],
    // bookingUrl intentionally omitted — the public CTA is our consultation form
    // regardless; a scheduler here is reserved for staff/Phase-2 use only.
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

/**
 * The consultation-request form for a partner — /{slug}/consultation. Every public
 * route to the attorney goes through this ONE intake form we own (no tel:, no mailto:,
 * no direct scheduler), so he arrives at the call already briefed and the person is told
 * up front that the message is not privileged. The form inherits the partner's
 * visibility gate (a hidden partner 404s the form too).
 */
export const partnerConsultationPath = (p: Partner): string => `/${p.slug}/consultation`

/** Full name with suffix, e.g. "Ethan A. Brecher, Esq." */
export const partnerFullName = (p: Partner): string =>
  p.credentialsSuffix ? `${p.name}, ${p.credentialsSuffix}` : p.name
