# Gun License NYC — homepage speed + mobile overflow fix
### Claude Code prompt

Two problems on gunlicensenyc.com (home):
1. **Slow initial load** — the page pulls in ~17 client components plus two ambient NYC videos, all up front.
2. **Horizontal scroll-bleed on mobile** — swiping left/right drags the page past its edges (there's no overflow-x guard, and a full-bleed/animated element is spilling past the viewport).

Fix both. Priority: make it genuinely FAST (defer/lazy the heavy stuff), and separately add a *lightweight* branded loader for the brief moment before content paints. `pnpm build` + `pnpm test` pass. Mobile-first; verify at 390px.

---

## Part 1 — Kill the horizontal overflow (mobile side-scroll)
```
ROOT CAUSE: app/globals.css has NO overflow-x guard on html/body, and at least one full-bleed/animated element spills past 100vw.

1. GLOBAL GUARD: add to globals.css — `html, body { overflow-x: hidden; max-width: 100%; }` (and ensure no ancestor sets a width > 100%). This alone stops the drag-past-edge on mobile. Keep vertical scroll + position:sticky working (overflow-x:hidden on body can break sticky in some setups — if the sticky nav/CTA breaks, move the guard to a wrapper div around the page content instead, or use `overflow-x: clip` which doesn't create a scroll container).
2. FIND THE CULPRIT (don't just mask it): the usual suspects here are —
   - hero-aura.tsx glows / radial gradients positioned with negative offsets that extend past the viewport,
   - the ticker/marquee (translateX animation) if its track isn't clipped,
   - placemaking-band.tsx full-bleed video/section,
   - the tilted/animated case-animation card (transform: rotate/perspective can overflow its box),
   - any element using `w-screen`, `100vw`, or negative margins for full-bleed.
   Audit each: decorative/aurora layers get `overflow: hidden` on their container and `pointer-events:none`; full-bleed sections use `width:100%` (not 100vw, which includes the scrollbar); the marquee track lives inside an `overflow: hidden` wrapper; the tilted card's parent gets `overflow: clip`.
3. TEST: at 390px, swipe hard left and right on the home page AND every marketing page — the page must not move horizontally at all. Confirm the sticky nav and sticky mobile CTA still work after the guard.
```

## Part 2 — Speed up the load (the real win)
```
GOAL: fast first paint + fast LCP; heavy/below-the-fold work happens after.

1. HERO FIRST, everything else deferred:
   - Keep the hero copy + CTA server-rendered and instant (it's the LCP). The animated case card (case-animation.tsx) should hydrate AFTER first paint — load it via next/dynamic with a lightweight static placeholder (a still version of the card) so nothing blocks paint.
   - Lazy-load every below-the-fold client component (product-feature, the-count, process-stepper, placemaking-band, candor-reveal, cost-card, pricing, sticky-cta, etc.) with next/dynamic and an IntersectionObserver / `loading` fallback, so their JS isn't in the initial bundle.
2. VIDEOS are the heaviest asset — defer them hard:
   - ambient-video.tsx: set `preload="none"`, DON'T autoplay until the element is near the viewport (IntersectionObserver), always show the poster image first, and skip video entirely on Save-Data / slow connections / reduced-motion. Neither NYC clip should download during initial load.
   - Confirm the videos are compressed (<2.5MB each, webm+mp4) and sized right; if not, re-encode.
3. FONTS: you load Geist + Space Grotesk + JetBrains Mono. Use next/font with `display: "swap"`, subset to `latin`, and only the weights actually used (drop unused Space Grotesk weights). Preload only the hero display font.
4. BUNDLE: run the build and check the home route's JS size; code-split anything large; make sure no heavy lib is imported into the initial page. Remove unused imports.
5. IMAGES/ICONS: any raster images use next/image with correct sizes + lazy (except a hero LCP image, if any); decorative SVGs inline and cheap.
6. Confirm caching/CDN headers are sane on Vercel (static assets immutable, HTML revalidated).
```

## Part 3 — Branded loader (cosmetic, must NOT delay content)
```
You asked for a load-in screen. Add a TASTEFUL, lightweight one — but it must not gate SEO or slow LCP:
- A minimal branded splash (obsidian bg + the brass ◎ mark + a subtle shimmer/progress) shown ONLY briefly while the app hydrates / the hero media decodes, then auto-dismisses on first meaningful paint (e.g. on `window load` or a short max timeout ~800ms, whichever first). Fade it out.
- CRITICAL: it must sit ABOVE server-rendered content that is already in the DOM (so crawlers + no-JS users still get the real page underneath) — do NOT block rendering the actual page behind it, and never leave it up if JS fails. Respect prefers-reduced-motion (no shimmer, instant fade). Show it once per session, not on every navigation.
- If, after Part 2, the page paints fast enough that a splash would flash annoyingly, prefer a per-section skeleton/shimmer on the deferred blocks instead of a full-screen splash — note which you chose and why.
```

## Part 4 — Verify
```
- MOBILE OVERFLOW: at 390px, no horizontal movement on home or any marketing page; sticky nav + CTA still work. Show a screen recording or before/after.
- SPEED: Lighthouse mobile before/after — report LCP, TBT, CLS, total transferred bytes and JS bytes for the home route. LCP should drop meaningfully; videos must NOT appear in the initial network waterfall.
- The loader (or skeletons) shows briefly and never blocks the real content; reduced-motion respected; no layout shift when it dismisses.
- pnpm build && pnpm test pass; no hydration warnings.
Deliver: before/after Lighthouse numbers, the network waterfall showing videos deferred, and the 390px no-scroll confirmation.
```

---

### Notes for you (not for Claude Code)
- **The overflow fix and the speed fix are separate problems** — the side-scroll is a CSS spill (one guard + finding the culprit element), the slowness is too much JS/video loading up front. Part 1 is a quick, high-confidence win.
- **On the loading screen:** I included it because you asked, but the honest best practice is to make the page fast enough that you don't need one — a splash that "waits until everything loads" usually makes perceived speed *worse* and can hurt SEO. Part 2 is the real fix; Part 3 is a light cosmetic layer that auto-dismisses and never blocks the actual content. If Part 2 makes it snappy, per-section skeletons beat a full splash.
- **The two videos are almost certainly the biggest weight.** Deferring them (poster-first, load-on-scroll, skip on slow connections) is likely the single biggest speed win.
