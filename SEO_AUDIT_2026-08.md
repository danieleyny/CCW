# Gun License NYC — SEO & Platform Audit (Aug 2, 2026)

**Scope reviewed:** every marketing route, `lib/seo.ts`, sitemap/robots/llms.txt, the full JSON-LD entity graph, `next.config.ts` (headers + redirects), brand config, blog pipeline, the four internal SEO docs (`SEO_GEO_BUILD_PROMPT`, `SEO_MEASUREMENT_NOTES`, `SEO_OFFSITE_CHECKLIST`, `DOMAIN_STRATEGY`), plus live checks of gunlicensenyc.com (homepage, robots.txt) and the current competitive SERP landscape.

---

## The headline

**Your on-site SEO is top-decile — genuinely better engineered than every competitor I found. Your problem is that Google barely knows you exist.** The site did not surface in a single search I ran, including a `site:gunlicensenyc.com` query and a search for the domain name itself. Competitors with far weaker sites (NY Safe Inc., NYC Gun / Pistol License Specialists, NYC Pistol License Consultant, Clearview/handgunpermitnyc, Pro Application Service) own the results today because they have what you don't yet: indexation history, backlinks, a Google Business Profile, reviews, and a steady stream of dated content.

The August SEO pass that's already in the codebase (canonical discipline, entity graph, borough hub-and-spoke, direct-answer blocks, llms.txt, AI-crawler allowlist) is the right foundation. What's missing now splits cleanly into two buckets: **off-site work only you can do** (the actual bottleneck) and **a second wave of code + content work** (the Claude Code prompt I've included).

---

## Scorecard

| Area | Grade | Verdict |
|---|---|---|
| Technical SEO (canonicals, robots, sitemap, noindex discipline) | A | Single `CANONICAL_ORIGIN` source of truth; preview deploys noindexed; private/tokenized routes (`/c/`, `/r/`) correctly blocked. Best-practice. |
| Structured data / entity graph | A− | Connected `@id` graph (Organization+ProfessionalService, WebSite, Service with DB-driven offers, borough Service nodes, FAQPage, HowTo, Breadcrumbs, Article). Missing: Person/author for E-E-A-T; `sameAs` is empty because the profiles don't exist yet. |
| AI/answer-engine readiness (GEO) | A− | llms.txt, AI-bot allowlist, quotable direct-answer blocks, sourced fact base. Undermined by zero off-site corroboration — models have nothing independent to confirm you're real. |
| On-page content quality | B+ | Pillar pages (/cost, /timeline, /requirements, /how-it-works, /do-i-need-a-lawyer, /denied-appeal, /renewal, /non-resident-business) are strong and honest. Borough pages have genuinely differentiated copy — no doorway-page risk. |
| Content velocity / depth | D | **One** blog post live (three were correctly 301'd into pillars). Competitors like nysafeinc.com rank with a stream of dated 2025/2026 guides. This is your biggest on-site gap. |
| Indexation & authority | F (today) | No visible index footprint. Search Console verification is wired to env vars that appear unset. No backlinks, no citations, no GBP. |
| Off-site entity (GBP, reviews, NAP, sameAs) | F (not started) | The checklist exists in the repo; none of it is actioned. This is the single highest-leverage lever available. |
| Measurement | C | GA4 + Web Vitals live in prod. But no GSC/Bing verification, no rank tracking, no AI-visibility log. You are currently flying blind. |
| Local SEO | C− | Borough pages exist, but with no GBP there is no map-pack presence at all — where a large share of "near me / service" clicks go. |
| Performance risk | B | Animation-heavy home (lazy-loaded, good), 3 font families, video assets are small/optimized. Worth a Lighthouse pass, not an emergency. |

---

## What's genuinely excellent (don't touch)

The `lib/seo.ts` → `buildMetadata()` pattern with one canonical origin; honest hand-maintained `lastModified` in the sitemap; the cannibalization 301s in `next.config.ts`; DB-driven fees flowing into copy AND schema (a price change in admin updates `/cost`, FAQ answers, and the Offer catalog together); the sourced fact base (`content/facts.ts`) behind every legal claim; the refusal to fake ratings/reviews/addresses. Keep all of it.

## Findings that need action

**1. You are invisible in search (critical, mostly non-code).** GSC is not verified (`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` unset), sitemap never submitted, no GBP, `sameAs` empty, zero reviews, zero citations. Until this is done, every code improvement is optimizing an unread book. Your own `SEO_OFFSITE_CHECKLIST.md` is the correct playbook — it's just unexecuted.

**2. Content engine is stalled (critical, code + writing).** One post. The long-tail map in your own build prompt (references/cohabitant affidavits, sealed-arrest disclosure, premises vs. carry, the interview, social-media disclosure, safe storage, training course explained, "best service" comparison) is unbuilt. These are exactly the queries AI engines answer and competitors rank for.

**3. Your unique data is not public (big opportunity).** You have an instructor marketplace, live fee tables, and a requirements registry — competitors have static text. Public, indexable pages generated from that data (a DCJS-instructor directory, a live fee/cost table page, per-requirement explainers) are content no one else can copy and the clearest expression of your "technology leader" positioning.

**4. E-E-A-T is thin.** No named human anywhere: no author entity on articles, no founder on the Organization. Google and AI models both weight identifiable humans. One real person + Person schema fixes it.

**5. Minor technical nits.** Home title renders ~66 chars (truncates in SERPs); blog `dateModified` always equals `datePublished`; sitemap `ROUTES` is hand-maintained (drift risk as pages multiply); no RSS feed; the 15+ keyword domains you own (per `DOMAIN_STRATEGY.md`) aren't 301'd anywhere yet.

**6. Untapped: multilingual NYC.** Spanish (and later Chinese/Russian) versions of the pillar pages with proper hreflang would be a real moat in this market — no competitor does it. Sequence it after the English engine is running.

---

## Priority order (my opinionated sequence)

1. **This week, no code:** verify GSC (Domain property) + Bing, submit the sitemap, request indexing on the money pages; create + verify the Google Business Profile (service-area, five boroughs); create the social profiles; set the `sameAs` env vars in Vercel and redeploy. Start asking every completed client for a review.
2. **Run the Claude Code upgrade prompt** (attached) — it wires the remaining code: content engine + 10 new long-tail guides, instructor directory, live-data pages, E-E-A-T, auto-derived sitemap, RSS, hreflang scaffold, keyword-domain redirects, measurement events.
3. **Monthly cadence forever:** 2–4 new dated guides, GSC review, the AI-visibility log from `SEO_MEASUREMENT_NOTES.md`, review count. GEO compounds; 8 weeks of silence is normal, not failure.

**Honest expectation:** the exact-match domain plus this codebase should win the head terms ("gun license nyc", "nyc gun license") within a quarter once indexed and corroborated. The map pack and AI-answer mentions follow reviews + GBP, not code.

---

## Competitive field (who currently owns your queries)

nysafeinc.com (content volume, dated guides — your main content rival), nycgun.com "Pistol License Specialists" (aged domain, service pages), nycpistollicenseconsultant.com, handgunpermitnyc.com (Clearview), proapplicationservice.com, 103tacticaltraining.com, vintagearms911.com, gstny.com, plus law firms (pistolpermitlawyers.com, essmidilaw.com) and the official NYC311/NYPD pages. None show your level of structured data, entity discipline, or product depth. The technical monopoly you want is achievable — the missing ingredients are authority signals and publishing velocity, not engineering.
