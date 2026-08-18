# gunlicensenyc.com — speed audit & upgrade plan
**Date:** 12 Aug 2026 · **Scope:** homepage + `app/(marketing)` + shared layout · **Constraint:** zero change to content, copy, offers or visual design

---

## The short version

Your three symptoms have three specific causes, and none of them is what a normal perf audit would guess:

| Symptom you described | Actual cause |
|---|---|
| "Partially loads while the rest is black" | Your `Reveal` component ships content at `opacity: 0` and only makes it visible **after React hydrates**. The page below the hero is in the DOM but invisible until the JS bundle lands. |
| "Gets stuck / takes a long time" | Same component has a 2.5s blind hold, and if hydration ever fails the content **never appears**. On top of that, nine oversized blurred layers — four animating forever, one backdrop mounted twice — saturate the browser's raster thread. |
| "Hero video doesn't start until I click it" | The film's 25-second timeline is choreographed entirely in CSS, but the **clock** that drives it lives in a React `useEffect`. React 19 prioritises hydrating whatever subtree you click — so clicking the film is literally what starts it. |

The videos, the data layer, the fonts and the caching are all already done well. Those are not your problem, and the fix must not touch them.

---

## Findings, ranked by impact

### F1 — Content is invisible until React hydrates *(this is the black page)*
**File:** `components/marketing/reveal.tsx`

`Reveal` server-renders its children with `opacity-0 translate-y-4` and only flips to visible inside `useEffect`. There are 10 `<Reveal>` blocks — 7 on the homepage, 3 in `product-feature` — which means **everything below the hero is rendered but unpainted** until the marketing bundle downloads, parses and hydrates.

Three separate failure modes come out of this:

- **Best case:** a visible dark gap between hero paint and hydration. On a mid-tier phone or a cold cache that is comfortably 1–3 seconds of exactly what you described.
- **Guaranteed floor:** there's a `setTimeout(..., 2500)` safety net inside the effect. So when the IntersectionObserver doesn't fire, the content holds invisible for a **full 2.5 seconds** before appearing.
- **Worst case — the "stuck":** if hydration never completes (a stale chunk URL after a redeploy, an error thrown in any client component, an extension blocking a script), the content stays invisible **permanently**. The HTML is there. The user sees black.

Secondary cost: `will-change: transform` is set unconditionally on all 10, pinning compositor layers for the entire life of the page.

**Fix (no visual change):** invert the default. Render visible on the server; do the fade-and-rise in pure CSS with a scroll-driven animation (`animation-timeline: view()`) inside `@supports`, so browsers that lack it simply show the content. No JS, no opacity gate, no permanent `will-change`. Same animation, but visibility is never hostage to a bundle.

---

### F2 — The hero film waits for hydration *(this is the click-to-start)*
**File:** `components/marketing/hero-film/hero-film.tsx`

Credit where due: the film is architected well. The full first frame is server-rendered, and all nine beats of choreography live in CSS keyed off `data-beat` on the root element. But the **clock** — a `setTimeout` schedule over the `MARKS` table — sits inside `useEffect`. Until React hydrates that specific subtree, `data-beat` stays `"0"` and the film holds on frame one.

React 19's selective hydration then prioritises the subtree containing whatever you interact with. Clicking the film jumps it to the front of the hydration queue, the effect runs, the clock starts. That is the mechanism, precisely.

**Fix (surgical, agreed approach):** move the clock out of React into a tiny inline `<script>` rendered alongside the figure, so it runs at **HTML parse time** — before any bundle is even requested. Same `MARKS`/`CAPS` tables, same DOM writes, ~40 lines of vanilla JS. The React effect stays as a fallback and defers to the inline driver via a `data-film-driver` flag. Your CSP already allows `'unsafe-inline'` for `script-src`, so no header change is needed.

The IntersectionObserver pause you asked for moves into the driver: stopped off-screen, resumed on return. You said you'd trade that for speed — you get it, and it's free.

---

### F3 — Nine oversized blurred layers, four animating forever, one backdrop mounted twice
**Files:** `components/marketing/hero-aura.tsx`, `components/theme/dark-backdrop.tsx`, `components/shared/tech-grid.tsx`, `app/(marketing)/page.tsx`

`HeroAura` is rendered **twice** on the homepage — once in `#hero`, once in `#closing`. Each instance paints three circles at 68rem, 46rem and 48rem with `blur-[150px]`, and runs `animate-aurora-a`, `animate-aurora-b`, `animate-aura-3`, `animate-star-drift` and `animate-hero-sweep` on an infinite loop, plus a `noise` overlay. `DarkBackdrop` (fixed, present on every marketing route) adds three more at `blur-[140px]`/`blur-[150px]`. `tech-grid` adds another at `blur-[120px]`.

A 1088×1088px surface with a 150px blur radius is among the most expensive things you can ask a browser to rasterise. Animating it forces re-rasterisation on a loop, on the raster thread, forever — including while the element is scrolled far off screen. On integrated graphics or a warm phone this is what "gets stuck" actually feels like after the HTML and JS have already arrived.

**Fix (no visual change):**
1. Stop mounting `HeroAura` twice — the closing section gets a static, non-animated variant. Visually indistinguishable at that scale; halves the animated blur budget outright.
2. Never animate the blurred element itself — animate a parent's `transform` so the blur rasterises once and the GPU just moves the result.
3. Gate the infinite decorative loops on visibility: pause aurora/star/sweep when the hero leaves the viewport. This is the same trade you offered for the film, applied to the backdrop.
4. `content-visibility: auto` + `contain-intrinsic-size` on the closing section so its layer work is skipped entirely until it's near.

---

### F4 — 276 KB of HTML, ~2,460 DOM elements, ~1,320 of them SVG nodes
**Measured from** `.next/server/app/index.html`

| | Count |
|---|---|
| Prerendered homepage HTML | **276 KB** |
| Total elements | **2,458** |
| `<rect>` | 529 |
| `<g>` | 340 |
| `<path>` | 186 |
| `<line>` | 117 |
| `<svg>` | 98 |
| `<circle>` | 52 |

Three inline illustrations account for most of it: `hero-film`, `hero-skyline` (26 KB of source), `the-count` (24 KB). Every one of those nodes costs HTML parse time, style recalculation and layout on each pass. This is what makes hydration slow enough for F1 and F2 to be *visible* in the first place — fix this and the other two get less punishing even before their own fixes land.

**Fix (nothing removed from the page):** `content-visibility: auto` with a correct `contain-intrinsic-size` on the sections containing `hero-skyline` and `the-count`, so the browser skips styling and layout for them until they approach the viewport. Everything still ships in the HTML — crawlers and no-JS users see the identical document.

---

### F5 — 16 JS chunk requests on the homepage; 9 client components loaded eagerly
Nine client components sit on the homepage — `nav`, `hero-aura`, `hero-film`, `magnetic`, `reveal` (×7), `process-stepper`, `cost-card`, `the-count`, `sticky-cta` — every one statically imported, so all of their JS is in the initial waterfall. `next/dynamic` appears in exactly **one** file in the whole repo (`case-animation-lazy.tsx`). Largest shared chunks are 323 KB, 236 KB and 221 KB uncompressed.

**Fix:** `next/dynamic` with **`ssr: true`** for the below-the-fold interactive ones (`ProcessStepper`, `CostCard`, `TheCount`, `StickyCta`). `ssr: true` matters — the HTML still renders server-side, so nothing changes for SEO or for what a visitor sees; only the JS moves out of the critical path. `hero-film`'s markup stays fully SSR'd, and with F2 done it no longer needs its bundle to animate at all.

---

### F6 — `radix-ui` barrel imported in 12 files with no `optimizePackageImports`
`next.config.ts` sets no `experimental.optimizePackageImports`. You import the `radix-ui` meta-package as a barrel in 12 files and `lucide-react` in 122. Next tree-shakes `lucide-react` by default; it does **not** tree-shake `radix-ui`. One line of config.

---

## What is already right — do not let an agent "fix" these

- **Videos are properly deferred.** `ambient-video.tsx` uses `preload="none"`, an IntersectionObserver gate, and falls back to a poster image on reduced-motion or Save-Data. Largest asset is 570 KB. **The videos are not your problem** — an earlier audit assumed they were, and that assumption is now stale.
- **The data layer is correct.** `lib/public-data.ts` is cookieless and wrapped in `unstable_cache` with tags, so the homepage genuinely prerenders. TTFB is not the issue.
- **Fonts are already tuned.** `display: swap`, latin subset, mono excluded from preload.
- **Security headers and CSP are in place** and the inline film driver is compatible with them as written.

---

## Plan of execution, in order

Sequenced so the highest-certainty wins land first and each step is independently verifiable.

| # | Change | Fixes | Risk |
|---|---|---|---|
| 1 | Rewrite `Reveal` as CSS-only, visible by default | The black page, the stuck page | Low |
| 2 | Inline pre-hydration driver for the hero film + IO pause | Click-to-start | Low |
| 3 | De-duplicate `HeroAura`; animate parents not blurs; pause off-screen | Jank, stalling, battery | Low |
| 4 | `content-visibility: auto` on `hero-skyline`, `the-count`, `#closing` | Parse/layout/raster cost | Low |
| 5 | `next/dynamic` + `ssr: true` on four below-fold client components | Initial JS waterfall | Medium |
| 6 | `optimizePackageImports: ["radix-ui", "lucide-react"]` | Bundle size | Low |

**Expected outcome:** the dark gap and the stuck state disappear entirely (they're structural, not gradual — steps 1 and 2 remove the mechanism). LCP and TBT should improve materially from steps 3–6, but insist on measured before/after numbers rather than taking anyone's word for it.

**Hard constraint to carry into execution:** not one word of copy, not one price, not one section, not one visual treatment changes. Every fix above is a change to *when and how* things paint — never to *what* paints. The rendered pixels at rest must be identical.
