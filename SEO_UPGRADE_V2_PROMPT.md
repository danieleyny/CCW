# SEO/GEO Upgrade V2 — content engine, live-data pages, E-E-A-T, distribution
### Paste this whole file into Claude Code from the repo root.

---

We're running the second wave of SEO on gunlicensenyc.com. Wave 1 (already shipped — do NOT redo it) built the technical foundation: `lib/seo.ts` canonical discipline, per-page `buildMetadata()`, `app/robots.ts` with the AI-bot allowlist, `app/sitemap.ts`, `app/llms.txt`, the connected `@id` entity graph in `components/marketing/json-ld.tsx`, pillar pages (/cost /timeline /requirements /how-it-works /do-i-need-a-lawyer /denied-appeal /renewal /non-resident-business), and the borough hub-and-spoke under /gun-license. Build on it; never fork a second metadata or schema path.

Read first: `AGENTS.md` (Next.js 16 rules — `proxy.ts` not middleware, async params; read `node_modules/next/dist/docs/` before Next-specific code), `lib/seo.ts`, `components/marketing/json-ld.tsx`, `app/sitemap.ts`, `content/facts.ts`, `config/brand.ts`, and two existing pillar pages as style references (`app/(marketing)/cost/page.tsx`, `app/(marketing)/gun-license/brooklyn/page.tsx`).

**Legal guardrails (non-negotiable, from AGENTS.md):** never use *guarantee, expedite, fast-track, insider, approval rate*; never imply NYPD endorsement or that we file/represent; the applicant always files their own application; candor-maximizing (sealed/dismissed arrests ARE disclosed); no legal advice — route specifics to the attorney seam; **invent zero statistics, reviews, ratings, testimonials, credentials, or citations.** Every factual claim renders from `content/facts.ts` (extend it with sourced entries — agency name + primary-source URL) or ships with an inline agency attribution. If a fact can't be sourced, it doesn't ship.

Design: reuse `PageHero`, `Breadcrumbs`, `DirectAnswer`, `FactList`, `FaqBlock`, `RelatedLinks`, and existing tokens. No new visual language. Every new page: `buildMetadata()`, breadcrumb schema + visible breadcrumbs, a direct-answer block up top, page-scoped FAQPage schema where there are real Q&As, internal links, CTA to /eligibility, and automatic sitemap inclusion.

Run phases in order. `pnpm build && pnpm test` must pass after each phase. Commit per phase.

---

## PHASE 1 — Plumbing fixes + self-maintaining sitemap

1. **Auto-derive the sitemap.** Replace the hand-maintained `ROUTES` array pattern in `app/sitemap.ts` with a single registry module (e.g. `lib/marketing-routes.ts`) exporting every marketing route with `{ path, priority, changeFrequency, lastReviewed }`. Sitemap, llms.txt "Key pages" section, and the nav/footer link sets all read from this one registry so a new page can never be orphaned or missing from the sitemap. Keep the honest hand-maintained `lastReviewed` dates — do NOT stamp build time.
2. **Title-length lint.** The home title currently renders ~66 chars with the template suffix. Add a tiny unit test (vitest) that walks every marketing page's exported metadata and fails if title (with ` · Gun License NYC` suffix) exceeds 60 chars or description exceeds 155. Fix the home title to fit (keep "NYC gun license" leading).
3. **Blog `dateModified`.** Add optional `updated:` frontmatter to MDX posts; Article schema uses it for `dateModified` (falling back to `date`), and the sitemap uses it for blog `lastModified`.
4. **RSS.** Add `app/feed.xml/route.ts` (force-static) emitting the blog as RSS 2.0 against `CANONICAL_ORIGIN`; link it via `alternates.types` in root metadata and from the blog index.
5. **Keyword-domain redirects.** Per `DOMAIN_STRATEGY.md` we own several exact-match domains. In `next.config.ts` (or a documented Vercel-level config if cleaner), 301 the domains — when they're attached to the Vercel project — to the MATCHING page, not just the home page: training-cluster domains → /requirements (training section anchor), handgun/carry-license domains → /, renewal domains → /renewal, borough domains → their borough page. Where code can't do this (DNS attach), write exact step-by-step instructions into `DOMAIN_STRATEGY.md` under a new "Deployment" heading. No microsites, ever.
6. Verify: canonical host untouched, `/c/` `/r/` still disallowed, previews still noindex.

## PHASE 2 — Review infrastructure + entity corroboration

Note: no founder/author Person entity and no personal bios anywhere — the brand itself stays the voice. Articles keep the Organization as `author`/`publisher` (already the case in the Article schema).

1. **Review capture (not display).** Build the ask, not fake proof: when an admin marks a case licensed, the existing notification flow appends a review-request line with a `NEXT_PUBLIC_REVIEW_URL` (GBP short link) — env-gated so it's silent until the profile exists. Add the same link to the portal's license-issued screen. Do NOT add AggregateRating schema anywhere.
2. **sameAs check.** Confirm the existing env-var wiring (`NEXT_PUBLIC_GBP_URL` etc.) flows to the graph, and add all of these env names to `.env.example` with comments.
3. **Brand-level E-E-A-T (no individuals).** Strengthen /about's "what we are / what we are not" block and ensure the Organization node carries everything honest we can assert (knowsAbout, areaServed, contactPoint — most already present). No named humans, no invented credentials.

## PHASE 3 — Content engine: 10 long-tail guides

Write these as MDX in `content/blog/` (frontmatter: title ≤60 chars incl. suffix, description ≤155, date = today, `updated` omitted, tag). Each: opens with a 2–4 sentence quotable direct answer; 900–1,500 words; facts pulled from/added to `content/facts.ts` with real agency sources; internal links to the relevant pillar + one borough page + one other guide; ends with the eligibility CTA. Check `next.config.ts` redirects so no new post recreates a URL that 301s to a pillar, and no post cannibalizes a pillar (guides go DEEPER than the pillar, they don't restate it).

1. Character references for a NYC gun license — who qualifies, the notarization step, how to ask
2. The cohabitant affidavit, explained — who counts as your household, edge cases (roommates, multi-family homes)
3. Sealed or dismissed arrest? What full candor means on a NY firearms application (route specifics to the attorney seam)
4. Premises license vs. carry license in NYC — the honest decision guide
5. The NYPD License Division interview — what happens, what to bring, how to prepare
6. The 3-year social media disclosure — what the application asks and how to prepare it
7. The 18-hour CCIA course — curriculum, the 80% written test, live-fire, how to choose an instructor
8. NY safe-storage rules once you're licensed — safes, transport, the two safe photos
9. Special Carry licenses for non-NYC residents with NYC business — the dedicated track
10. Service vs. lawyer vs. DIY for a NYC gun license — expanded honest comparison (link, don't duplicate, /do-i-need-a-lawyer)

Also: `/blog` index gets tag filtering only if trivially cheap; otherwise skip — no thin tag archive pages.

## PHASE 4 — Live-data pages (the moat competitors can't copy)

1. **/fees — the live fee table.** A page rendering current NYPD/DCJS fees straight from the `fees` table via `getPublicFees()` (same source as /cost — /cost keeps the narrative + all-in estimate; /fees is the compact reference table). "Last verified" date from the DB row, agency attribution per row, FAQPage schema with 3–4 fee questions. Add to the route registry.
2. **/instructors — public DCJS-instructor directory.** Public, indexable index + per-instructor profile pages from the instructor marketplace data — ONLY instructors who have opted in (add an explicit `public_profile` boolean, default false, admin-toggled; respect it in an RLS-safe public view that exposes ONLY: name, boroughs served, course offered, languages, public bio). Each profile: Person + Course/Service schema referencing the org graph, breadcrumbs, CTA. Index page targets "18 hour course nyc / dcjs certified instructor nyc". Zero PII beyond the opt-in fields; verify with a test that the public view can't leak anything else.
3. **/glossary.** One page, `DefinedTerm`/`DefinedTermSet` schema, ~25 terms (CCIA, DCJS, License Division, premises license, carry license, Special Carry, cohabitant affidavit, character reference, recertification, safe storage, proper cause, good moral character, …). Each definition sourced or purely definitional. Terms deep-link to their pillar/guide.
4. Wire all three into the route registry, llms.txt, and RelatedLinks blocks on the relevant pillars.

## PHASE 5 — hreflang scaffold (Spanish first)

1. Build the i18n scaffold for marketing pages only (`lib/i18n` exists as a stub): locale-prefixed routes (`/es/...`) for the FIVE money pages only (home, /cost, /requirements, /timeline, /how-it-works), with `alternates.languages` hreflang emitted from `buildMetadata()` for every page that has a translation (and `x-default`). Sitemap emits hreflang alternates.
2. Professionally-toned Spanish translations of those five pages (translate meaning, keep every legal disclaimer and sourced fact intact; the disclaimer renders in BOTH languages on /es pages). If translation quality is uncertain for a legal phrase, keep the English sentence inline rather than risk drift.
3. No auto-redirect by Accept-Language (SEO poison) — a small language toggle in the footer/nav instead. English pages without translations emit no hreflang. Gate the whole phase behind a single flag so it can ship dark if review is needed.

## PHASE 6 — Measurement + adversarial verify

1. **GA4 events:** eligibility quiz started/completed, checklist generated, contact submitted, pricing viewed → documented as conversions-to-mark in `SEO_MEASUREMENT_NOTES.md`. Confirm events fire only in production.
2. **Env docs:** `.env.example` gains every SEO env (`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION`, GBP/social `sameAs` vars, `NEXT_PUBLIC_REVIEW_URL`) with one-line instructions.
3. **Adversarial pass — as a hostile SEO reviewer:**
   - Every marketing route (old + new, + /es): unique title/description within limits, canonical, OG image, in sitemap, reachable ≤2 clicks from home, breadcrumbs present.
   - Validate every JSON-LD block (Organization, WebSite, Service+Offers, borough Services, FAQPage, HowTo, Article, DefinedTermSet, Course, and instructor-profile Person nodes from Phase 4) — zero errors, all cross-referenced by `@id`, no fabricated fields, no founder/author Person anywhere.
   - Grep ALL new content for: guarantee, expedite, fast-track, insider, approval rate, "we file", endorsed. Report hits verbatim and fix.
   - Confirm no new route leaks into robots-disallowed space and nothing tokenized (`/c/`, `/r/`) is linked from public pages.
   - Lighthouse (or equivalent) on home + /fees + /instructors + one guide: SEO 100, perf ≥ 90 mobile; fix regressions.
   - `pnpm build && pnpm test` green; portal/admin/instructor surfaces untouched.
4. Deliver a final table: URL · target query · title · schema types · in-sitemap · locale — plus an honest list of what still depends on off-site work (GSC verification, GBP, reviews, sameAs URLs, domain attachments).

---

### Off-site reminder (for the owner, not for Claude Code)
Code cannot verify Search Console, create the Google Business Profile, earn reviews, or attach the keyword domains in Vercel/DNS. `SEO_OFFSITE_CHECKLIST.md` + `SEO_MEASUREMENT_NOTES.md` are the playbook — do them in parallel with this build or the build optimizes an unread site.
