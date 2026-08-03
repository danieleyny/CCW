/**
 * THE marketing route registry — the single source of truth for every public
 * marketing URL. The sitemap, llms.txt "Key pages", the top nav, and the footer
 * all read from this one list, so a new page can never be orphaned (unlinked)
 * or missing from the sitemap: you add it here once.
 *
 * Plain data only (no `server-only`) so the client nav can import it too.
 *
 * `lastReviewed` is an HONEST hand-maintained date — the day the page's CONTENT
 * was last checked, NOT build time. Update it when a page actually changes; the
 * sitemap must never claim every page changed on every deploy.
 */

export type ChangeFreq = "weekly" | "monthly" | "yearly"
export type FooterGroup = "Service" | "Answers" | "Situations" | "Boroughs" | "Learn"

export interface MarketingRoute {
  /** Route path, "" for home. */
  path: string
  /** Human label for nav / footer / llms links. */
  label: string
  priority: number
  changeFrequency: ChangeFreq
  lastReviewed: string
  /** Footer column placement (order within a group follows array order). */
  footerGroup?: FooterGroup
  /** Show in the top nav. */
  nav?: boolean
  /** Include in llms.txt "Key pages" with this one-line description. */
  llmsDescription?: string
}

const R = "2026-07-16" // baseline review date
const U = "2026-08-02" // pages touched in the Aug 2026 SEO pass

export const MARKETING_ROUTES: MarketingRoute[] = [
  {
    path: "",
    label: "Home",
    priority: 1.0,
    changeFrequency: "weekly",
    lastReviewed: U,
    llmsDescription: "What the NYC gun-license process involves and how we run it as one tracked case.",
  },
  // ── Answers / money pages ────────────────────────────────────────────────
  { path: "/how-it-works", label: "How it works", priority: 0.8, changeFrequency: "monthly", lastReviewed: U, footerGroup: "Service", nav: true, llmsDescription: "The full process, stage by stage, from eligibility to licensure." },
  { path: "/cost", label: "What it costs", priority: 0.8, changeFrequency: "monthly", lastReviewed: U, footerGroup: "Answers" },
  { path: "/fees", label: "Government fees", priority: 0.7, changeFrequency: "monthly", lastReviewed: "2026-08-03", footerGroup: "Answers", llmsDescription: "The current NYPD and NYS government fees, each with the agency that sets it and the date last verified — read live from our records." },
  { path: "/timeline", label: "How long it takes", priority: 0.8, changeFrequency: "monthly", lastReviewed: R, footerGroup: "Answers" },
  { path: "/requirements", label: "What's required", priority: 0.8, changeFrequency: "monthly", lastReviewed: R, footerGroup: "Answers" },
  { path: "/premises-vs-carry", label: "Premises vs carry", priority: 0.7, changeFrequency: "monthly", lastReviewed: U, footerGroup: "Answers" },
  { path: "/disqualifiers", label: "What disqualifies you", priority: 0.7, changeFrequency: "monthly", lastReviewed: U, footerGroup: "Answers" },
  { path: "/checklist", label: "Free checklist", priority: 0.8, changeFrequency: "monthly", lastReviewed: R, footerGroup: "Answers", nav: true, llmsDescription: "A free, no-account checklist of the documents required, personalized to your situation." },
  { path: "/do-i-need-a-lawyer", label: "Do I need a lawyer?", priority: 0.7, changeFrequency: "monthly", lastReviewed: R, footerGroup: "Answers" },
  // ── Situations ───────────────────────────────────────────────────────────
  { path: "/non-resident-business", label: "Non-residents & business", priority: 0.7, changeFrequency: "monthly", lastReviewed: R, footerGroup: "Situations" },
  { path: "/reciprocity", label: "Reciprocity", priority: 0.7, changeFrequency: "monthly", lastReviewed: U, footerGroup: "Situations" },
  { path: "/retired-leo", label: "Retired law enforcement", priority: 0.6, changeFrequency: "monthly", lastReviewed: U, footerGroup: "Situations" },
  { path: "/renewal", label: "Renewal", priority: 0.7, changeFrequency: "monthly", lastReviewed: R, footerGroup: "Situations" },
  { path: "/denied-appeal", label: "If you're denied", priority: 0.7, changeFrequency: "monthly", lastReviewed: R, footerGroup: "Situations" },
  { path: "/resources", label: "Official sources", priority: 0.6, changeFrequency: "monthly", lastReviewed: U, footerGroup: "Situations", nav: true, llmsDescription: "Links to the primary sources — NYPD License Division, fees, DCJS, CCIA training, recertification, safe storage. Each link is dated with the day we last verified it." },
  // ── Service / conversion ─────────────────────────────────────────────────
  { path: "/pricing", label: "Pricing", priority: 0.8, changeFrequency: "monthly", lastReviewed: U, footerGroup: "Service", nav: true, llmsDescription: "Our membership tiers and what each includes." },
  { path: "/eligibility", label: "Eligibility quiz", priority: 0.8, changeFrequency: "monthly", lastReviewed: R, footerGroup: "Service", llmsDescription: "A two-minute check of whether you likely qualify." },
  { path: "/book", label: "Book a consult", priority: 0.6, changeFrequency: "yearly", lastReviewed: R, footerGroup: "Service" },
  { path: "/about", label: "About us", priority: 0.7, changeFrequency: "monthly", lastReviewed: R, footerGroup: "Service" },
  // ── Boroughs (hub + spokes) ──────────────────────────────────────────────
  { path: "/gun-license", label: "By borough — overview", priority: 0.7, changeFrequency: "monthly", lastReviewed: U, footerGroup: "Boroughs" },
  { path: "/gun-license/manhattan", label: "Manhattan", priority: 0.6, changeFrequency: "monthly", lastReviewed: U, footerGroup: "Boroughs" },
  { path: "/gun-license/brooklyn", label: "Brooklyn", priority: 0.6, changeFrequency: "monthly", lastReviewed: U, footerGroup: "Boroughs" },
  { path: "/gun-license/queens", label: "Queens", priority: 0.6, changeFrequency: "monthly", lastReviewed: U, footerGroup: "Boroughs" },
  { path: "/gun-license/bronx", label: "The Bronx", priority: 0.6, changeFrequency: "monthly", lastReviewed: U, footerGroup: "Boroughs" },
  { path: "/gun-license/staten-island", label: "Staten Island", priority: 0.6, changeFrequency: "monthly", lastReviewed: U, footerGroup: "Boroughs" },
  // ── Learn / supporting ───────────────────────────────────────────────────
  { path: "/blog", label: "Guides", priority: 0.6, changeFrequency: "weekly", lastReviewed: U, footerGroup: "Learn", llmsDescription: "In-depth guides to the NYC gun-license process." },
  { path: "/instructors", label: "Find an instructor", priority: 0.6, changeFrequency: "weekly", lastReviewed: "2026-08-03", footerGroup: "Learn", llmsDescription: "A directory of DCJS-approved NYC firearms instructors who teach the required 18-hour concealed-carry course — opt-in, verified, listing the boroughs and languages they teach in." },
  { path: "/glossary", label: "Glossary", priority: 0.5, changeFrequency: "monthly", lastReviewed: "2026-08-03", footerGroup: "Learn", llmsDescription: "Plain-language definitions of the NYC gun-license terms, each linked to the page that explains it in full." },
  { path: "/faq", label: "FAQ", priority: 0.6, changeFrequency: "monthly", lastReviewed: U, footerGroup: "Learn", nav: true, llmsDescription: "Common questions about the NYC gun-license process." },
  { path: "/contact", label: "Contact", priority: 0.6, changeFrequency: "yearly", lastReviewed: R, footerGroup: "Learn", llmsDescription: "Reach the team." },
  { path: "/privacy", label: "Privacy", priority: 0.3, changeFrequency: "yearly", lastReviewed: R, footerGroup: "Learn" },
]

/** Footer columns in display order, each with its routes (registry order). */
export const FOOTER_GROUP_ORDER: FooterGroup[] = ["Service", "Answers", "Situations", "Boroughs", "Learn"]

export function footerColumns(): { title: FooterGroup; links: { href: string; label: string }[] }[] {
  return FOOTER_GROUP_ORDER.map((title) => ({
    title,
    links: MARKETING_ROUTES.filter((r) => r.footerGroup === title).map((r) => ({ href: r.path || "/", label: r.label })),
  }))
}

/** Top-nav links, in registry order. */
export const NAV_ROUTES = MARKETING_ROUTES.filter((r) => r.nav).map((r) => ({ href: r.path || "/", label: r.label }))

/** llms.txt "Key pages" entries, in registry order. */
export const LLMS_KEY_PAGES = MARKETING_ROUTES.filter((r) => r.llmsDescription).map((r) => ({
  path: r.path || "/",
  label: r.label,
  description: r.llmsDescription!,
}))
