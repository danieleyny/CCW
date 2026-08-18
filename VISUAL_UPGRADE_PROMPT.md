# CCW — Marketing Visual Upgrade (V6)

**Paste this whole file to Claude Code from the repo root.** Work in phases. Do not skip Phase 0.

---

## 0. Context you must load before writing any code

Read these first — they are the ground truth, not this document:

- `config/brand.ts` — the only source of colour. **Never hardcode a hex outside this file.**
- `app/globals.css` — theme mapping + every signature utility (`.glass`, `.glass-premium`, `.card-raised`, `.brass-edge`, `.engraved`, `.tech-grid`, `.noise`, `.section-void`, `.section-panel`, the `.ca-*` animation set).
- `components/marketing/marketing-frame.tsx` — the `.dark` wrapper that themes the entire marketing surface.
- `app/(marketing)/page.tsx` and 3–4 pillar pages (`/requirements`, `/cost`, `/timeline`, `/pricing`).
- `components/marketing/page-blocks.tsx`, `components/shared/section-eyebrow.tsx`, `components/ui/card.tsx`, `components/ui/button.tsx`.
- `AGENTS.md` for repo conventions.

Then run the site locally and **look at it**: `pnpm dev`, and screenshot `/`, `/requirements`, `/pricing`, `/timeline`, `/faq` at 1440px and 390px. You will be doing this repeatedly as your verification loop (Section 7).

---

## 1. The problem, measured

This is not a taste complaint. These are measurements from the live site.

**1. There is effectively one background colour on the entire site.**
`.section-void` = `var(--background)` = `#07080B`. `.section-panel` = `color-mix(in oklab, var(--surface-1) 55%, var(--background))` ≈ `#0B0C10`. That is a **~1.5% luminance delta** — invisible on an uncalibrated laptop at normal brightness. Sections are separated only by `1px solid rgba(255,255,255,0.08)`, which on `#07080B` is roughly a **1.2:1 contrast ratio**. The page therefore reads as one infinite black field with text floating in it. This is the single biggest cause of "it doesn't feel professional."

**2. Vertical rhythm is uniform.** Almost every section on the homepage is `py-20 sm:py-28` — 112px top and bottom, identically. Measured section heights: 867, 790, 851, 393, 777, 759, 492, 694. A chapter-opening section and a minor utility section get the same breathing room, so nothing announces itself as important.

**3. Long-form pages waste half the viewport.** `/requirements` renders a single `max-w-3xl` column: ~576px of content in a 1440px viewport, with ~860px of empty black to the right. No TOC, no rail, no anchor.

**4. Every card is the same card.** `rounded-lg border border-hairline bg-card p-4`, repeated. On `/requirements`, ~24 legal facts each render as an identical rectangle. Boxing every item in a list destroys hierarchy rather than creating it.

**5. Scroll-driven sections leave holes.** At several scroll positions on `/` there are viewport-sized regions containing zero visible content — the scroll-pinned/reveal sections (`.the-count`, `.req-wall`, `components/marketing/showcase/case-animation.tsx`, `components/marketing/reveal.tsx`) reserve space before their content is painted. A visitor scrolling at normal speed hits black voids. This reads as broken, not cinematic.

**6. Brass is never committed to a surface.** `#C9A24B` appears as text, a thin border, and one button fill. It is never a band, a wash, or a field. The page is ~97% near-black, so the brand colour never actually lands.

**7. Type has one jump.** Hero display → everything else. No intermediate chapter size, so H2s do not read as chapter openings. Body is 16px where 17px would read materially more expensive.

### What actually makes Stripe feel the way it does

Name the mechanics so you build the mechanics, not the vibe:

1. Section boundaries are **unmissable** — the surface changes, the edge is lit, and the content width changes, usually all three at once.
2. Vertical rhythm is **varied** — hero space, chapter space, and utility space are visibly different quantities.
3. Brand colour is **committed to large areas**, not sprinkled as accents.
4. Elevation is **physical** — surfaces have a lit top edge, a dark bottom edge, and a shadow, so cards sit *on* the page.
5. Very few type sizes, with **large** jumps between them.
6. Content lives in a **designed grid** — asymmetric columns, sticky rails, wide media. Never a lonely centred column.
7. Product is shown as **artifacts with depth** — framed, shadowed, cropped by section edges.
8. Motion always **resolves**, and never leaves a hole.

---

## 2. Decisions already made — do not relitigate

- **Stay all-dark.** The obsidian/brass/signal register is the brand. Do not introduce the warm-paper theme as a route register. The fix is a real contrast ladder inside dark, not a switch to light.
- **Scope: all ~30 marketing routes** under `app/(marketing)/`, including borough pages, `/glossary`, `/blog`, `/instructors`, `/es/*`, `/about`, `/contact`.
- **You may restructure freely** — new layout primitives, asymmetric grids, sticky rails, changed section order and hierarchy — subject to the hard constraints in Section 6.

---

## 3. The system to build

Everything below goes into `config/brand.ts` + `app/globals.css` first, as tokens and utilities. **No page may ship a one-off value.**

### 3.1 The section surface ladder

Replace the two-value `.section-void` / `.section-panel` pair with a five-step ladder. Add to `paletteDark` in `config/brand.ts`:

```
"sec-0": "#06070A",   /* the void — hero, finale CTA */
"sec-1": "#0E1117",   /* base — default content sections */
"sec-2": "#171C26",   /* raised — alternating band, panels */
"sec-3": "#222834",   /* elevated — inset feature blocks inside sec-2 */
```

Adjacent steps are still subtle on dark — that is inherent. So enforce this rule, which is the actual answer:

> **A section boundary must be signalled by at least TWO of:** a surface step, a lit edge, a shadow spill, a full-bleed divider, or a change in content width.

Build `.section-0` … `.section-3` utilities. Each raised surface (`.section-2`, `.section-3`) gets physicality:

```css
box-shadow:
  inset 0 1px 0 rgba(255,255,255,0.055),   /* lit top edge */
  0 -1px 0 rgba(0,0,0,0.65);               /* dark underside */
```

### 3.2 The horizon divider

Retire bare `border-hairline` as a *section* separator (it stays fine for cards and lists). Section edges use a full-bleed gradient rule that brightens toward the centre and carries brass:

```css
.divider-horizon {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255,255,255,0.14) 18%,
    rgba(201,162,75,0.38) 50%,
    rgba(255,255,255,0.14) 82%,
    transparent
  );
}
```

Also raise `hairline` from `rgba(255,255,255,0.08)` to `0.10`, and `hairline-strong` from `0.14` to `0.18`. Verify nothing in `/admin` or `/portal` regresses — those consume the same tokens.

### 3.3 Commit brass to surface

Three new primitives. Budget is strict.

- **`.band-brass`** — a full-bleed brass field with ink text (`--brand-foreground`). **Maximum one per page**, reserved for the primary conversion moment. This is the page's exclamation mark.
- **`.wash-brass`** — a warm radial over any section, so the page has temperature without leaving dark:
  ```css
  background-image: radial-gradient(120% 80% at 50% 0%, rgba(201,162,75,0.075), transparent 62%);
  ```
  Maximum two per page.
- **`.band-invert`** — one optional paper-inverted band (`--paper: #F4F2EE`, ink text) per *long* page, for the single highest-intent block. This is punctuation inside the dark system, **not** a second register. Use on at most 6 pages sitewide; if it looks like a theme switch, you have overused it.

Every `SectionEyebrow` gets a 2px brass rule above it. Small, cheap, and it makes chapters read as chapters.

### 3.4 Vertical rhythm — three tiers, never repeated

```
--sec-pad-sm:  clamp(56px, 6vw, 80px)     /* utility: breadcrumbs, related links, ticker */
--sec-pad-md:  clamp(88px, 9vw, 128px)    /* standard content */
--sec-pad-lg:  clamp(128px, 14vw, 192px)  /* chapter opener, hero-adjacent, finale */
```

> **Hard rule: no two adjacent sections may use the same padding tier.** Enforce it with a lint script (Section 7.4) that walks each page's top-level sections and fails on a repeat.

This single rule does more for perceived quality than any colour change.

### 3.5 Type scale — five steps, big jumps

Keep Space Grotesk for **display only** and Geist for everything else. Space Grotesk must never set body copy or UI labels.

```
--t-display: clamp(2.75rem, 6.4vw, 5.25rem)  / 0.95 / -0.03em / weight 500
--t-chapter: clamp(1.875rem, 3.6vw, 3rem)    / 1.05 / -0.022em / weight 600
--t-section: 1.375rem                        / 1.25 / -0.01em  / weight 600
--t-lead:    1.1875rem                       / 1.62 / text-mid
--t-body:    1.0625rem                       / 1.72            /* up from 1rem */
--t-micro:   0.6875rem / 0.18em tracking / mono / uppercase
```

At display sizes use weight **500**, not 700 — heavy weights at 80px read cheap. Add `text-wrap: balance` on all headings and `text-wrap: pretty` on leads.

> **Rule: no more than three type sizes visible in a single viewport.**

### 3.6 Width and grid system

```
--w-prose:  68ch      /* long-form reading measure */
--w-content: 1200px   /* standard layout container */
--w-wide:   1440px    /* full-bleed media, showcase */
```

Build **`<GuideShell>`** in `components/marketing/guide-shell.tsx` and apply it to every long-form / SEO route. Three columns at ≥1180px:

| Column | Width | Contents |
|---|---|---|
| Left rail (sticky) | 248px | Auto-generated TOC from H2/H3, current-section highlight, scroll-progress hairline, a persistent compact CTA card, "Last verified" chip |
| Prose | `--w-prose` | The content |
| Right gutter | 220px | Pull-quotes, source chips, related-link stubs. Collapses into the flow below 1180px |

This kills the empty right half, and it earns SEO: real anchor structure (jump-link sitelinks), higher scroll depth and dwell, more internal links per page.

### 3.7 Card hierarchy — four tiers, and stop boxing lists

Replace the single card look with four named primitives:

1. **`.card-flat`** — for list items and repeated facts. **No border, no box.** A 2px brass left rule, generous padding, separated by `border-hairline` dividers. Use this on `/requirements`, `/glossary`, `/disqualifiers`, `/faq`, and every `FactList`. Twenty-four identical rectangles become one readable ledger.
2. **`.card-raised`** — the standard content card: `sec-2`, lit top edge, `hairline-strong` border, `0 12px 32px -18px rgba(0,0,0,0.8)`.
3. **`.card-feature`** — `sec-3` + `.brass-edge` + larger padding + optional `.wash-brass`. **One per section, maximum.** This is what you want clicked.
4. **`.card-inset`** — recessed: darker than its parent plus an inner shadow. For legal text, quotes, and the standing disclaimer.

Refactor `DirectAnswer` → `.card-feature`. Refactor `SourcedFact` / `FactList` → `.card-flat`. Refactor `RelatedLinks` → a proper "Keep reading" module with 2-line descriptions.

### 3.8 Motion — fix the holes

Non-negotiable rules for `components/marketing/reveal.tsx`, `.the-count`, `.req-wall`, and `components/marketing/showcase/case-animation*.tsx`:

- **The resolved state is the default.** Content is visible with no JS, with `prefers-reduced-motion`, and before the observer fires. Animation only ever *removes* a temporary offset.
- IntersectionObserver `rootMargin` ≥ `20% 0px` so content paints before it scrolls into view.
- **No scroll-driven section may reserve more than 1.2× viewport height** of space before its content is painted.
- All transforms are `transform`/`opacity` only. Durations 220–420ms. Easing `cubic-bezier(0.22, 1, 0.36, 1)`.
- Nothing animates on load above the fold except the hero, and that must not affect LCP.

### 3.9 Nav, footer, and product artifacts

- **Nav** (`components/marketing/nav.tsx`): add a scrolled state — `backdrop-blur(14px)`, `sec-1/85` background, bottom hairline, subtle shadow. Increase the logo lockup ~20%. On `GuideShell` routes add a 2px brass scroll-progress bar under the nav.
- **Footer** (`components/marketing/footer.tsx`): rebuild as a real 4-column sitemap footer — Process / Requirements & Costs / Boroughs / Company — plus the standing legal disclaimer in `.card-inset`, and the NAP block. Significant internal-linking and crawl-depth win.
- **Product artifacts**: the case-file mock currently floats unframed. Give every product screenshot a browser/device chrome frame, a real shadow (`0 40px 80px -40px rgba(0,0,0,0.9)`), a 3–4° perspective, and let it be **cropped by the section edge** rather than sitting fully inside it. Show more of the platform than one screen — the checklist, the reference-tracking view, and the filing packet each deserve a moment.
- **One custom diagram per pillar page** — the 6-month timeline, the cost waterfall, the document map, the eligibility decision tree. Build them as inline SVG using brand tokens. These are the "wow", and diagrams earn backlinks and image-search traffic in a way body copy does not.

### 3.10 E-E-A-T surface (SEO, and it looks better too)

The August SEO audit flagged no named human anywhere. Build `components/marketing/reviewed-by.tsx`: author/reviewer name, role, avatar, "Last verified {date}", linked source count. Render it under the H1 on every pillar and guide page, and emit matching `Person` JSON-LD wired into the existing `@graph` in `components/marketing/json-ld.tsx`.

---

## 4. Phase order

**Phase 1 — System.** Tokens in `config/brand.ts`; utilities in `app/globals.css`; the four card primitives; the three-tier rhythm; the type scale. Render every primitive on `app/style-guide/page.tsx` so it is inspectable in one screen. **Ship nothing else until the style guide looks right.**

**Phase 2 — Homepage.** Re-lay `app/(marketing)/page.tsx` onto the ladder and rhythm. Fix every motion hole. Frame the product artifacts. One `.band-brass` finale.

**Phase 3 — `GuideShell` + the 8 pillars.** `/requirements`, `/cost`, `/timeline`, `/how-it-works`, `/pricing`, `/faq`, `/do-i-need-a-lawyer`, `/denied-appeal`. Convert fact lists to `.card-flat`. Add TOC rails, `ReviewedBy`, and one diagram each.

**Phase 4 — The long tail.** Borough pages, `/glossary`, `/blog` + `[slug]`, `/instructors` + `[slug]`, `/reciprocity`, `/renewal`, `/retired-leo`, `/premises-vs-carry`, `/non-resident-business`, `/resources`, `/about`, `/contact`, `/eligibility`, `/checklist`, `/book`, `/fees`, `/disqualifiers`, `/es/*`. Most inherit the system; each still needs a look.

**Phase 5 — Pricing, nav, footer, verification.** Equal-height pricing cards with aligned CTAs and a real anchor tier. Nav scroll state. Sitemap footer. Then run the full verification suite and fix what it finds.

Commit at the end of each phase with screenshots in the commit body.

---

## 5. Pricing page — specific fixes

Currently four cards with ragged bottoms, buttons at different vertical positions, prices at identical size, and a "MOST CHOSEN" badge in 10px mono that nobody sees.

- CSS-grid the tier row so all cards are equal height with CTAs aligned on a shared baseline.
- Anchor the recommended tier: `.card-feature`, a visible brass ribbon, and ~8% larger scale.
- Price typography gets `--t-chapter` with tabular numerals; the runner-up prices step down one size.
- Add a feature-comparison table below the cards — it converts, and it ranks for "X vs Y" queries.
- Show the all-in estimate (concierge fee + `externalCostEstimates` + government fees) as one honest number with a breakdown on hover. Nobody else in this market does this, and it is the most trust-building thing on the page.

---

## 6. Hard constraints — a violation is a failed build

**SEO must not regress.** Before you start, snapshot for every route: the full heading outline (H1–H4 text and order), every JSON-LD block, the canonical URL, `<title>`, meta description, and the set of internal `href`s. After each phase, diff. **Heading text, heading order, canonicals, structured data, and internal links must be identical unless the change is additive.** Never move copy into a client component that removes it from server-rendered HTML. Never replace a real heading with a styled `div`.

**Accessibility.** Body text ≥ 7:1 against its surface; secondary text ≥ 4.5:1; interactive borders ≥ 3:1. Every interactive element keeps a visible `focus-visible` ring. Respect `prefers-reduced-motion` everywhere. Keep the skip link working. Target Lighthouse a11y = 100.

**Performance.** No new font families — Geist, Space Grotesk, JetBrains Mono only. No new animation library. Diagrams are inline SVG, not images. Mobile Lighthouse performance ≥ 90, CLS < 0.05, LCP < 2.5s on mobile. The hero LCP element stays server-rendered text.

**Tokens.** Every colour resolves through `config/brand.ts`. If you need a value that does not exist, add it to the palette — do not inline a hex.

**Do not touch** `/admin`, `/portal`, `/instructor`, `/auth`, `app/api/**`, `lib/seo.ts`, `next.config.ts` redirects, `content/facts.ts`, or any copy. This is a presentation-layer change. If a component is shared with the app surface, extend it rather than editing it in place, and verify the app routes still render.

---

## 7. Verification — run this, do not just claim it

### 7.1 Visual regression loop
Playwright script: for every marketing route, at 1440×900 and 390×844, screenshot at scroll positions every 400px to the bottom. Save to `.visual/`. Review them yourself before declaring a phase done.

### 7.2 The dead-space test (automated)
For each screenshot, compute the fraction of pixels differing from that section's background by more than 3%. **Fail any frame below 12% "ink" coverage.** This is the test that catches the black voids. It must pass on every route at every scroll position.

### 7.3 The squint test (automated)
Re-render each full-page screenshot at 25% brightness and 8px gaussian blur. Section boundaries must still be locatable. If two adjacent sections merge into one field, the boundary fails Section 3.1 and you must add a second signal.

### 7.4 Rhythm lint
A script that walks each page's top-level `<section>` elements and asserts no two adjacent sections resolve to the same padding tier. Fail the build on a repeat.

### 7.5 SEO diff
Re-run the Section 6 snapshot and diff. Any non-additive change to headings, canonicals, JSON-LD, or internal links is a failure.

### 7.6 Existing checks
`pnpm lint`, `pnpm test`, `pnpm build` must all pass.

---

## 8. Definition of done

- The style guide at `/style-guide` renders every token, surface, divider, card tier, and type step on one page, and it looks like a design system rather than a list of leftovers.
- On every route, at every scroll position, you can point at where one section ends and the next begins — at 25% brightness.
- No two adjacent sections share a padding tier, anywhere.
- No frame anywhere on the site falls below 12% ink coverage.
- `/requirements` reads as a structured document with a navigable rail, not 24 identical boxes in a 40%-wide column.
- Brass appears as a committed surface at least once per long page, and never more than once as `.band-brass`.
- Every pillar page carries one custom diagram and a `ReviewedBy` block.
- Lighthouse mobile: performance ≥ 90, a11y 100, best practices ≥ 95, SEO 100.
- The SEO diff is clean.

---

## 9. How to work

Do Phase 1 completely and show me the style guide before moving on. After each phase, post: what changed, before/after screenshots at both widths, and the output of the four automated checks. If a rule in this document fights the brand or the content, say so and propose the alternative rather than silently deviating.
