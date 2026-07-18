# Gun License NYC — SEO + AI-visibility (GEO) build prompt
### Own "NYC gun license" in Google AND in AI-model recommendations

**Goal:** make gunlicensenyc.com the top result for New Yorkers searching to start a gun-license application, and one of the businesses AI models (ChatGPT, Perplexity, Gemini, Google AI Overviews, Claude) name when asked "who helps with a NYC gun license." Enhance content, metadata, and structure. **Do NOT redesign the homepage** — reuse existing components so every new page looks native; homepage changes are limited to metadata, schema, and at most one lightweight content/FAQ block.

**What's already here (audited — build on it, don't duplicate):** exact-match domain `gunlicensenyc.com`; root metadata template; `app/sitemap.ts`, `app/robots.ts`; JSON-LD for LocalBusiness / Service / HowTo / FAQPage in `components/marketing/json-ld.tsx`; pages home / how-it-works / checklist / pricing / eligibility / faq / resources / contact / book / blog / privacy; 4 blog MDX posts in `content/blog`; GA4; real contact — phone (929) 352-5961, email gunlicensenyc@gmail.com.

**Legal guardrails (from AGENTS.md — non-negotiable):** never use guarantee / expedite / fast-track / insider / approval-rate; never imply NYPD endorsement or that we file/represent; keep `brand.disclaimer` visible; keep the candor position; **invent NO statistics, reviews, testimonials, ratings, credentials, or citations.** Every fact ships with a real source or not at all. This matters more than usual here because GEO rewards citable facts — but fabricated ones are both a legal and a trust risk.

Run phases in order. This is content/SEO work — `pnpm build` + `pnpm test` must pass after each.

---

## KEYWORD & INTENT MAP (use this as the targeting spine)

```
HEAD TERMS (own these — the domain already matches):
  gun license nyc · nyc gun license · concealed carry nyc · nyc concealed carry · nyc ccw · ccw nyc
  nyc pistol permit · pistol permit nyc · how to get a gun license in nyc · nyc gun license application

HIGH-INTENT LONG-TAIL (one strong page each; these convert AND get cited by AI):
  nyc concealed carry requirements 2026
  how much does a nyc gun license cost / nyc gun license cost
  how long does it take to get a nyc concealed carry license
  nyc gun license application help / assistance
  nyc gun license documents / checklist
  nyc concealed carry training hours / 18 hour course
  nyc gun license for non-residents / business owners
  nyc special carry license
  premises license vs carry license nyc
  nyc gun license denied / appeal
  nyc gun license renewal
  do i need a lawyer for a nyc gun license
  nyc gun license references / cohabitant affidavit

LOCAL (borough landing pages — real local intent + local AI answers):
  gun license Manhattan · Brooklyn · Queens · The Bronx · Staten Island

COMPARISON / GEO ("best/vs" queries are what people ask AI):
  best nyc gun license service · nyc gun license service vs doing it yourself · nyc gun license help vs a lawyer
```

---

## PHASE 0 — Audit & plan (no edits)

```
We're doing a major SEO + AI-visibility (GEO) upgrade of gunlicensenyc.com WITHOUT redesigning the homepage. Read:
- app/layout.tsx (root metadata), app/sitemap.ts, app/robots.ts
- components/marketing/json-ld.tsx
- app/(marketing)/*/page.tsx (every marketing page — note which have per-page metadata and which are thin)
- content/blog/*.mdx, lib/blog.ts, config/brand.ts
- components/marketing/page-hero.tsx and the shared UI (so new pages reuse existing design)
- AGENTS.md (Next.js 16 — read node_modules/next/dist/docs/ before Next-specific code; legal guardrails)

Then reply with:
(a) a table of every existing marketing page + its current title/description + the ONE head/long-tail keyword it should own (map to the keyword list above; flag any cannibalization where two pages target the same term),
(b) the gaps you see vs the keyword map (which high-intent/borough/comparison pages don't exist yet),
(c) the current JSON-LD coverage and what entity/schema types are missing,
(d) confirmation that all new pages will reuse PageHero + existing components so the design stays consistent.
Don't edit yet.
```

---

## PHASE 1 — Technical SEO foundation

```
1. PER-PAGE METADATA: every marketing page gets full metadata — title (keyword-led, ≤60 chars), description (≤155 chars, benefit + keyword), `alternates.canonical`, and `openGraph` + `twitter` (title, description, url, type, image). Add a small helper (e.g. lib/seo.ts `buildMetadata()`) so pages stay DRY. Titles use the existing template `%s · Gun License NYC`. Descriptions must be genuinely distinct per page (no boilerplate).
2. DYNAMIC OG IMAGES: add branded Open Graph images via Next.js `ImageResponse` (app/opengraph-image.tsx at root + per-section where useful, or a reusable generator). Obsidian background, brass wordmark, page title — on-brand, 1200×630. This drives click-through in Google AND rich previews when AI/social surfaces the link. Add matching `twitter-image`.
3. ROBOTS — EXPLICITLY WELCOME AI CRAWLERS (this is core to GEO): keep the existing disallows (/admin /portal /auth /api /dashboard /style-guide), but ADD explicit allow rules for the AI/answer bots so we're eligible for AI citations: GPTBot, ChatGPT-User, OAI-SearchBot, PerplexityBot, Perplexity-User, ClaudeBot, Claude-Web, anthropic-ai, Google-Extended, Applebot-Extended, Amazonbot, Bytespider, CCBot. Do NOT block them. Keep the sitemap reference.
4. llms.txt: add a `/llms.txt` route (app/llms.txt/route.ts returning text/plain, or public/llms.txt) — a concise, plain-text map of the site for LLMs: what Gun License NYC is (one-paragraph definition), the key pages with URLs and one-line summaries, and the standing disclaimer. Follow the emerging llms.txt convention (H1 title, blockquote summary, sectioned link lists).
5. SITEMAP: add `lastModified` to static routes, keep blog posts, add all new pages from later phases, and set sensible priorities (home 1.0, money/high-intent pages 0.8, supporting 0.6).
6. Confirm metadataBase is set (it is, via brand.url) and that canonical URLs resolve to https://gunlicensenyc.com with no trailing-slash duplication.

Run pnpm build. Show me one generated OG image and the diff of robots + llms.txt.
```

---

## PHASE 2 — Structured data / entity graph (the backbone of both SEO rich results and GEO)

```
Upgrade components/marketing/json-ld.tsx into a proper connected entity graph using @id references. REAL DATA ONLY — no invented ratings/reviews/credentials.

1. ORGANIZATION (the anchor entity): @type Organization (or ProfessionalService) with a stable @id (e.g. https://gunlicensenyc.com/#organization), name, url, logo (absolute URL to the OG/logo asset), description, email, telephone, and `sameAs` — an array of every real profile we control (Google Business Profile URL, and any real Instagram/Facebook/LinkedIn/X/YouTube). `sameAs` is what ties the brand into the knowledge graph AI models rely on, so wire in every REAL profile; leave the array empty rather than inventing URLs, and leave a comment listing which to add once created.
2. LOCALBUSINESS: expand the existing LocalBusiness — add `@id`, `areaServed` as the five boroughs (Manhattan, Brooklyn, Queens, The Bronx, Staten Island) + "New York City", `priceRange`, `image`, `openingHours` (only if real), `address` (only fields we truly have — keep it honest), and `geo` only if we have a real location. Reference the Organization via `parentOrganization`/`@id`.
3. WEBSITE + SEARCH: add a WebSite entity with `potentialAction` SearchAction (if site search exists; otherwise omit) and `publisher` → Organization @id.
4. BREADCRUMBS: add a `breadcrumbSchema(items)` helper and render BreadcrumbList on every non-home page (matches the page hierarchy). Also add a lightweight visible breadcrumb UI component reusing existing styles.
5. SERVICE with OFFERS: extend the Service schema with `offers`/`OfferCatalog` reflecting the real membership tiers from service_packages (names + prices from the DB, not hardcoded), and `provider` → Organization @id.
6. FAQPage EVERYWHERE it fits: the FAQ page already has it — also emit page-scoped FAQPage on the new high-intent pages (cost, timeline, requirements, non-resident, etc.), each with 3–6 real Q&As. This is the single highest-leverage schema for AI answers.
7. E-E-A-T: if there's a real author/founder, add a Person entity and reference it as `author` on blog posts and `founder` on the Organization. Only with real info.
8. Validate every graph against schema.org and Google Rich Results expectations. Keep JSON-LD injected via the existing <JsonLd> component.

Run pnpm build. Paste each schema block and confirm it validates and uses @id cross-references.
```

---

## PHASE 3 — Content expansion (SEO pages + GEO answer content), design-consistent

```
Create new pages, each reusing PageHero + existing components so they look native. Every page follows the SAME high-performance structure:
  • A DIRECT-ANSWER BLOCK at the very top: 2–4 sentences that answer the query outright, in plain language, quotable verbatim by an AI ("A NYC gun license costs roughly $X in government fees plus training; the full process takes about six months…"). This is what LLMs lift.
  • Then the depth (sections, a table where useful, real citations to NYPD/DCJS/CCIA rules).
  • A page-scoped FAQ (3–6 real Q&As) wired to FAQPage schema.
  • Internal links to related pages + a CTA to /eligibility.
  • Honest, guardrail-safe copy; cite government sources by name (NYPD License Division, DCJS, NY CCIA) — do not fabricate citations.

BUILD THESE PAGES (map each to its keyword from the map):
1. /cost  — "How much does a NYC gun license cost" — the honest all-in breakdown (our fee + government fees + ~training range + notary), a table, FAQ. (Reuse the cost logic/estimates already in config/brand.ts + getFees.)
2. /timeline — "How long does a NYC concealed carry license take" — the ~6-month journey, stage by stage, what causes delays.
3. /requirements — "NYC concealed carry requirements 2026" — eligibility + the 18-hour training + the full document list (this can consolidate/annex the checklist).
4. /non-resident-business — "NYC gun license for non-residents & business owners" + special/premises distinctions.
5. /denied-appeal — "What to do if your NYC gun license is denied" — administrative review window, attorney-referral seam (candor-safe).
6. /renewal — "NYC gun license renewal" — timing, what changes.
7. /do-i-need-a-lawyer — comparison page: consultant/document-prep service vs attorney vs DIY (honest, positions us correctly and legally).
8. BOROUGH PAGES: /gun-license/manhattan, /brooklyn, /queens, /bronx, /staten-island — localized intro (License Division is central, but address borough-level intent + local proof), same structure, unique copy per borough (no thin duplicate content — vary meaningfully).
9. Expand the BLOG hub: add 4–6 more MDX posts targeting remaining long-tail (references & cohabitant affidavits explained, sealed/dismissed arrest disclosure, premises vs carry, training course explained, social-media disclosure, the interview). Each with real frontmatter, internal links, and author.

Every new page: unique title/description/canonical/OG (Phase 1 helper), breadcrumb + FAQPage schema (Phase 2), added to the sitemap. Reuse existing design — NO new visual language.

Run pnpm build. Give me the list of new routes with their target keyword + title + one-line direct-answer.
```

---

## PHASE 4 — GEO: make AI models recommend us

```
Beyond schema, add the content patterns that get brands NAMED in AI answers:
1. DEFINITIONAL / ENTITY CLARITY: on the homepage (content only, no redesign) and /about, include one crisp, quotable definition block: "Gun License NYC is a New York City concealed-carry (CCW) document-preparation and case-management service that guides applicants through the NYPD License Division process end to end." AI models quote clean definitions like this. Add an /about page with the real story, what we are/aren't (reuse the existing "what we are" content), and E-E-A-T signals (real experience, process, sources) — this is a top page for AI to cite.
2. COMPARISON & "BEST" CONTENT: the /do-i-need-a-lawyer page and a short, honest "why use a concierge service" section give AI the structured trade-off content it pulls for "best NYC gun license service / should I use a service" queries. Use clear headers and, where honest, a comparison table.
3. CITABLE FACTS WITH SOURCES: throughout the new pages, present key facts as clean, sourced statements (training hours per CCIA, fee amounts per NYPD/DCJS, ~6-month timeline) — LLMs preferentially cite content with specific, attributed numbers. Never fabricate; cite the agency by name.
4. CONSISTENT ENTITY (NAP): ensure Name / Address-area / Phone / email are byte-identical everywhere they appear on-site (footer, contact, schema, llms.txt) — inconsistency weakens the entity AI models build.
5. Confirm the Phase 1 AI-bot allowlist + llms.txt are live and the high-value pages are in the sitemap.
6. OFF-SITE (generate a checklist file, don't code it): create SEO_OFFSITE_CHECKLIST.md for me covering the things that happen off the codebase but drive ~40%+ of AI citations and local rank: verify & fully complete the Google Business Profile (category, services, hours, photos, posts, Q&A), get real Google reviews, and build consistent NAP citations on relevant directories (and any legitimate firearms-licensing / local NYC directories). List concrete steps and why each matters for AI + local SEO. Reviews/citations must be earned, never fabricated.

Run pnpm build. Show me the definition block, the /about outline, and the off-site checklist.
```

---

## PHASE 5 — Internal linking, breadcrumbs, measurement

```
1. INTERNAL LINKING (hub-and-spoke): the homepage and pillar pages (how-it-works, requirements, cost, timeline) link down to the spokes (borough pages, blog posts, comparison), and spokes link back up + laterally. Add a tasteful "related" links block reusing existing styles. Ensure every new page is reachable within ~2 clicks of the home page and appears in the sitemap. No orphan pages.
2. BREADCRUMBS: render the visible breadcrumb UI (Phase 2) on all non-home pages.
3. MEASUREMENT: confirm GA4 fires on new pages; add lightweight events for the primary CTAs (eligibility start, contact). Generate SEO_MEASUREMENT_NOTES.md telling me how to: submit the sitemap in Google Search Console, monitor the target keywords, and track AI-citation visibility (e.g. periodic manual prompts to ChatGPT/Perplexity/Gemini asking "who helps with a NYC gun license" and logging whether we're named).
4. Confirm no accidental noindex, correct canonicals, and that pagination/tags (if any) don't create duplicate/thin content.

Run pnpm build && pnpm test.
```

---

## PHASE 6 — Verify (adversarial)

```
As a hostile SEO reviewer:
1) CRAWL/INDEX: every marketing + new page has a unique title, description, canonical, OG image, and is in the sitemap; robots ALLOWS the AI bots (GPTBot/PerplexityBot/ClaudeBot/Google-Extended etc.) and disallows only app routes; llms.txt is served as text/plain and lists the key pages.
2) SCHEMA: run each JSON-LD block through validation — Organization/LocalBusiness/WebSite/BreadcrumbList/Service+offers/FAQPage/HowTo all valid, cross-referenced by @id, zero errors/warnings; no fabricated ratings/reviews.
3) CONTENT/GEO: each high-intent page opens with a quotable direct-answer block; facts are attributed to real agencies; there's a crisp entity definition; NAP is byte-identical across footer/contact/schema/llms.txt; no thin/duplicate borough pages.
4) LEGAL: grep all new content for guarantee/expedite/fast-track/insider/approval-rate/"we file"/"endorsed"; confirm brand.disclaimer present; confirm zero invented stats/reviews/credentials/citations. Report hits verbatim.
5) PERF/UX: Lighthouse SEO = 100 on home + 3 new pages; mobile CLS/LCP healthy; internal links have descriptive anchor text; no broken links; every new page reachable ≤2 clicks from home.
6) REGRESSION: existing pages, portal, admin unchanged; pnpm build && pnpm test pass.
Deliver: a table of all pages (URL / target keyword / title / has-FAQ-schema / in-sitemap), the Lighthouse SEO scores, the two generated .md checklists, and an honest list of the highest-leverage things still left (likely off-site: reviews, GBP, citations).
```

---

### Notes for you (not for Claude Code)
- **Two levers this prompt can't pull for you** (they're ~40% of AI citations and a big chunk of local rank): a fully-completed **Google Business Profile** and **real Google reviews**. Phase 4 generates a checklist, but you have to action it. I gave you a GBP description earlier — use it.
- **GEO is a compounding game:** expect 4–8 weeks before AI models start naming you, longer to stabilize. The entity consistency (identical NAP + `sameAs` to real profiles) is what makes it stick — so create/claim your social profiles and feed their URLs into the Organization schema.
- **Your domain is a genuine moat.** `gunlicensenyc.com` is an exact match for the head term — most competitors are training ranges or law firms with off-topic domains. Winning the head term is realistic; the content depth in Phase 3 is how you also capture the long-tail they ignore.
- **Don't fabricate to feed the machine.** GEO rewards citable facts, which tempts invention — but a fake stat or review is both a legal exposure and something AI models increasingly discount. Real facts, real sources, real reviews only.
