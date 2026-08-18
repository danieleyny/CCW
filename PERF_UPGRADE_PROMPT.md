# Gun License NYC — marketing performance upgrade
### Claude Code prompt · paste this whole file into Claude Code at the repo root

---

## Mission

Make `gunlicensenyc.com` fast, and fix two specific broken behaviours, **without changing a single thing the site shows or offers**.

Three symptoms the owner reports, with their already-diagnosed root causes. Do not re-diagnose from scratch — verify each cause, then fix it.

1. **The page partially loads and the rest is black.** Cause: `components/marketing/reveal.tsx` server-renders children at `opacity-0` and only makes them visible inside a `useEffect`. Everything below the hero is in the DOM but invisible until React hydrates.
2. **Sometimes it gets stuck.** Same cause, plus nine oversized blurred layers (four animating infinitely, one backdrop mounted twice) saturating the raster thread.
3. **The hero film only starts when you click it.** Cause: the film's choreography is CSS keyed off `data-beat`, but the clock that advances `data-beat` lives in a React `useEffect`. React 19 selective hydration prioritises the clicked subtree — so the click is what starts it.

**Scope:** the homepage, all `app/(marketing)` routes, and the shared components/layout they use. Do **not** touch `app/portal`, `app/admin`, `app/instructor`, `app/firearmlicensenyc`, or `app/nycgunlaws`.

---

## ⛔ Absolute constraints — violating any of these fails the task

- **No content changes.** Not one word of copy, not one heading, not one price, not one list item, not one CTA label, not one section added or removed or reordered. If a fix seems to require a copy change, it is the wrong fix.
- **No design changes.** The rendered pixels at rest must be identical. Every change here is about *when* and *how* things paint, never *what* paints. Animations may be re-implemented, but their visible result must match.
- **Nothing removed from the HTML.** Content must stay server-rendered for SEO. Where you use `next/dynamic`, you must pass `ssr: true`. Where you use `content-visibility`, the markup still ships — you are only deferring style/layout work.
- **Never gate content visibility on JavaScript.** This is the single rule that caused the bug. Content is visible in the server HTML, full stop. Animation may enhance it; nothing may hide it.
- **Do not touch these — they are already correct:**
  - `components/marketing/ambient-video.tsx` and the `public/media/*` files. The videos are already properly deferred (`preload="none"`, IO gate, Save-Data/reduced-motion poster fallback, 570 KB max). A previous audit wrongly blamed them. Leave them alone.
  - `lib/public-data.ts` — already cookieless + `unstable_cache`, homepage genuinely prerenders.
  - Font configuration in `app/layout.tsx` — already `display: swap`, latin-subset, mono not preloaded.
  - The CSP and security headers in `next.config.ts` (you will add one unrelated key to that file; do not alter the headers).
- **Accessibility must not regress.** `prefers-reduced-motion` handling stays intact everywhere, including in every animation you re-implement.
- `pnpm build` and `pnpm test` must pass, with **no hydration warnings** in the console.

---

## Step 0 — Measure first

Before changing anything, capture a baseline and write it into `PERF_RESULTS.md`:

```
pnpm build
```

Record: homepage First Load JS from the build output, the byte size of `.next/server/app/index.html`, and the DOM element count in that file. Then run Lighthouse mobile against a local production server (`pnpm build && pnpm start`) and record LCP, TBT, CLS and total JS transferred.

Baseline for cross-checking your numbers (measured 12 Aug 2026): homepage HTML **276 KB**, **2,458** DOM elements, **16** JS chunk requests, largest shared chunks 323/236/221 KB uncompressed.

---

## Step 1 — Rewrite `Reveal` as CSS-only, visible by default *(highest priority)*

**File:** `components/marketing/reveal.tsx` (10 usages: 7 in `app/(marketing)/page.tsx`, 3 in `components/marketing/product-feature.tsx`)

Delete the client-side visibility gate entirely. Requirements:

- Make it a **server component** — no `"use client"`, no `useState`, no `useEffect`, no `IntersectionObserver`, no 2500ms fallback timer.
- Children render **visible** in the server HTML. Non-negotiable.
- Reproduce the same fade-and-rise (opacity 0→1, `translateY(1rem)`→0, ~700ms ease-out, with the existing `delay` prop honoured as a stagger) using a **scroll-driven CSS animation** in `app/globals.css`:
  - Wrap the animation in `@supports (animation-timeline: view())` and use `animation-timeline: view()` with an appropriate `animation-range` so it plays as the element scrolls in.
  - Because the animation only ever *starts* from a hidden keyframe inside `@supports`, browsers without support show the content immediately and unanimated. That is the correct, safe degradation.
  - Guard the whole thing in `@media (prefers-reduced-motion: no-preference)`.
  - Keep the `delay` prop working — map it to `animation-delay` via a CSS custom property set inline (`style={{ "--reveal-delay": `${delay}ms` }}`).
- **Remove the permanent `will-change: transform`.** If you need it at all, scope it to the animation's duration only.
- Keep the component's public API identical (`children`, `className`, `delay`) so no call site changes.

**Verify:** disable JavaScript in the browser entirely and load the homepage. Every section must be fully visible and readable. Then re-enable JS, throttle to Slow 3G + 4× CPU, and confirm there is **no dark gap** at any point during load.

---

## Step 2 — Start the hero film before hydration

**File:** `components/marketing/hero-film/hero-film.tsx`

The architecture here is good — keep it. The full first frame is server-rendered and 100% of the motion is CSS keyed off `data-beat`. Only the clock needs to move out of React.

- Extract the `MARKS` and `CAPS` tables and the beat-scheduling logic into a **self-contained inline `<script>`** rendered inside the component's output, immediately after the `<figure>`. It must run at HTML parse time, before any bundle is requested. Keep it small — this is ~40 lines of vanilla JS.
- The inline driver does exactly what the current effect does: set `data-beat`, manage `data-idle` (including the `"still"` mark that clears idle a frame early — that is the snap rule, preserve its timing exactly), toggle `data-playing`, and set `data-on` on the correct `[data-cap]` caption line. Loop at 25400ms.
- Honour `prefers-reduced-motion: reduce` in the driver: hold `data-beat="8"` and caption `c6`, exactly as the current effect does. Do not start a loop.
- **Add the visibility pause the owner asked for:** an `IntersectionObserver` (threshold 0.15) inside the driver that stops the schedule when the film leaves the viewport and restarts it on return. Also pause on `document.visibilitychange` when the tab is hidden.
- Set a flag (e.g. `data-film-driver="inline"`) so the React `useEffect` **defers and no-ops** when the inline driver is already running. Keep the effect as a fallback for the case where the inline script is blocked — but it must not double-drive the timeline.
- Write the script tag in a CSP-safe way. `script-src` already allows `'unsafe-inline'`, so an inline script is fine; do **not** add or weaken any CSP directive.
- The film's `<figure>` must still server-render with `data-beat="0" data-idle="1" data-playing="true"` so the first frame is correct with no JS at all.

**Verify:** hard-reload the homepage with cache disabled and CPU throttled 4×. The film must begin its 25-second sequence within a few hundred milliseconds of first paint, **without any interaction**. Scroll it off screen — motion stops. Scroll back — it resumes. Then set reduced-motion and confirm it holds the resolved still frame.

---

## Step 3 — Cut the animated blur budget

**Files:** `components/marketing/hero-aura.tsx`, `components/theme/dark-backdrop.tsx`, `components/shared/tech-grid.tsx`, `app/(marketing)/page.tsx`, `app/globals.css`

`HeroAura` is currently mounted **twice** on the homepage (`#hero` and `#closing`). Each instance paints three circles at 68rem/46rem/48rem with `blur-[150px]` and runs `animate-aurora-a`, `animate-aurora-b`, `animate-aura-3`, `animate-star-drift`, `animate-hero-sweep` infinitely. `DarkBackdrop` adds three more at `blur-[140px]`/`blur-[150px]` on every marketing route; `tech-grid` another at `blur-[120px]`.

1. **De-duplicate.** Give `HeroAura` a `static` (or `variant="still"`) prop and use it for the `#closing` section — same layers, same colours, same positions, **no animations and no pointer parallax**. At that blur radius the visual difference is imperceptible; this alone halves the animated blur budget.
2. **Never animate the blurred element.** Where an aurora pool animates, move the animation to a non-blurred parent wrapper and animate only `transform` on it, so each blurred surface rasterises once and the compositor just moves the result. Do not change the visual path or timing of the motion.
3. **Pause decorative loops when off-screen.** Add a visibility gate so `animate-aurora-*`, `animate-star-drift` and `animate-hero-sweep` are paused (`animation-play-state: paused`) once the hero is out of view. Prefer a CSS-only approach if one exists in the codebase's idiom; otherwise a single small IO that toggles one class on the hero wrapper is acceptable — but visibility of content must **never** depend on it.
4. Confirm the `pointermove` parallax in `HeroAura` is already correctly gated to `(pointer: fine)` and non-reduced-motion — it is; leave that logic intact for the animated instance and skip it entirely for the static one.

**Verify:** record a Chrome Performance profile scrolling the full homepage. Compare raster-thread time and dropped frames against baseline. Take before/after screenshots of the hero and the closing section at 1440px and 390px and confirm they are visually identical.

---

## Step 4 — `content-visibility` on the heavy off-screen illustrations

**Files:** `app/globals.css`, `app/(marketing)/page.tsx`

The homepage ships ~1,320 SVG nodes across three inline illustrations (`hero-film`, `hero-skyline`, `the-count`). Skip style and layout work for the ones that aren't on screen yet.

- Add `content-visibility: auto` with an accurate `contain-intrinsic-size` to the sections wrapping `TheCount`, `PlacemakingBand` and `#closing`.
- **Do not** apply it to the hero, `hero-skyline` (it's inside the hero) or anything above the fold — that would delay LCP.
- `contain-intrinsic-size` must match each section's real rendered height closely, or you introduce scrollbar jumping and CLS. Measure the actual heights at 1440px and 390px and set them per-breakpoint if they differ materially.
- Confirm in-page anchor links and browser find-in-page still work. If find-in-page misses text inside a `content-visibility: auto` block, that is a bug — fix or revert that block.

**Verify:** CLS must stay at or below baseline. Scroll fast from top to bottom and confirm no visible pop-in, reflow or scrollbar jump.

---

## Step 5 — Move below-fold client JS off the critical path

**File:** `app/(marketing)/page.tsx`

Nine client components load eagerly on the homepage. Convert these four to `next/dynamic`:

- `ProcessStepper`
- `CostCard`
- `TheCount`
- `StickyCta`

**Every one must use `ssr: true`.** Their HTML keeps rendering server-side, so nothing changes for crawlers or for what a visitor sees — only the JS leaves the initial waterfall.

- Do **not** dynamic-import `HeroFilm`, `HeroAura`, `HeroSkyline` or `MarketingNav` — they are above the fold.
- No `loading` skeletons that swap in different markup. The server HTML must remain identical to today's. If `next/dynamic` with `ssr: true` would change the emitted HTML for any of these, skip that one and say so in the report.
- Note `TheCount` runs an imperative animation in an effect over a root ref — confirm it still animates correctly after the change, and that the server-rendered still frame is unchanged.

---

## Step 6 — One config line

**File:** `next.config.ts`

Add to the existing `experimental` block (keep `serverActions` exactly as it is, and do not touch `headers()` or `redirects()`):

```ts
optimizePackageImports: ["radix-ui", "lucide-react"],
```

`radix-ui` is imported as a barrel in 12 files and is not tree-shaken by default. `lucide-react` is imported in 122 files and is on Next's default list, but listing it explicitly is harmless and makes the intent legible.

---

## Verification — required before you report done

Run all of these. Do not skip any.

**Correctness**
- `pnpm build` passes. `pnpm test` passes. Zero hydration warnings in the console on the homepage and on three interior marketing routes.
- **JavaScript fully disabled:** the homepage and every marketing route render complete, readable, correctly styled content. Every section visible. This is the regression test for the original bug — treat a failure here as a hard stop.
- `curl -s https://localhost:3000/ | grep` for the H1 text, a price, and one line of body copy from each major section — all still present in the raw HTML.
- **Content diff:** produce a text-only diff of the rendered homepage before vs after (strip tags, normalise whitespace). It must be **empty**. Same for three interior routes. Include the command you used in the report.

**Behaviour**
- Hero film starts on its own within ~300ms of first paint on a 4× throttled CPU with cache disabled, no interaction. Pauses off-screen, resumes on return, pauses on tab hide.
- Slow 3G + 4× CPU: no black or empty region at any point during load. Screen-record it.
- `prefers-reduced-motion: reduce`: film holds the resolved still frame, no aurora/star/sweep motion, all content visible and unanimated.
- 390px: no horizontal scroll, sticky nav and sticky mobile CTA both still work.

**Numbers**
- Lighthouse mobile before/after, in a table: LCP, TBT, CLS, Total Blocking Time, total JS transferred, homepage First Load JS.
- Homepage HTML byte size and DOM element count, before/after.
- Chrome Performance profile: raster-thread time and dropped frames while scrolling the full homepage, before/after.

**Deliverable:** append everything to `PERF_RESULTS.md` — the before/after table, the empty content diff as proof nothing changed, the screen recording of the throttled load, and an explicit list of anything you chose **not** to do and why.

---

## Notes on judgement

- If any step would require changing what the page shows, **stop and report it** rather than doing it. The no-content-change rule outranks every performance goal here.
- Steps 1 and 2 remove broken mechanisms rather than tuning gradual costs — they should be near-total fixes for the black page and the click-to-start. Do them first and verify them independently before moving on, so their effect is isolated in the measurements.
- Steps 3–6 are real but incremental. If a step's measured win is negligible and its risk isn't, say so and skip it. Report what you skipped.
- Commit each step separately with a clear message so any individual change can be reverted without unwinding the rest.
