# Marketing performance upgrade — results

Scope: homepage + `app/(marketing)` + shared components/layout only. No content or
design changes; content stays server-rendered and visible without JS.

## Step 0 — Baseline (measured 2026-08-12, `pnpm build`, production)

| Metric | Baseline |
|---|---|
| Homepage HTML (`.next/server/app/index.html`) | **282,213 bytes** (~276 KB) |
| Homepage DOM elements (open tags) | **2,458** |
| Total `.next/static` JS on disk | ~2,389 KB across 80 chunk files |

Owner's cross-check reference (12 Aug 2026): HTML 276 KB · 2,458 DOM · 16 JS chunk
requests · largest shared chunks 323/236/221 KB uncompressed. HTML byte size and
DOM count match exactly.

**Measurement note (environment):** Lighthouse-mobile, a Chrome Performance
profile, and the throttled screen-recording require live browser tooling that is
unreliable in this build environment (the in-app browser can't hold sessions and
the perf panel isn't scriptable here). The reproducible, deterministic metrics —
HTML byte size, DOM element count, JS chunk weight, and the **JS-disabled server
HTML content proof** (the actual regression test for the black-page bug) — are
captured here from the build output and `curl` of the prerendered HTML. The owner
should run Lighthouse-mobile before/after on the Vercel preview for the field
LCP/TBT/CLS numbers; the mechanism-level fixes below make those wins structural,
not incremental.

<!-- After/step results appended below as each step lands. -->

## Step 1 — Reveal is now CSS-only, visible by default ✅ (the black-page fix)

`components/marketing/reveal.tsx` is now a **server component** — no `"use client"`,
no `useState`/`useEffect`/IntersectionObserver, no 2500ms fallback timer, no
permanent `will-change`. Public API unchanged (`children`/`className`/`delay`).

Motion moved to `app/globals.css` `.reveal`: a scroll-driven fade+rise
(`animation-timeline: view()`) inside `@supports (animation-timeline: view())` and
`@media (prefers-reduced-motion: no-preference)`. Browsers without support show
the content immediately; reduced-motion users get no animation; `delay` maps to
`animation-delay: var(--reveal-delay)`.

**Proof (server HTML, `.next/server/app/index.html`):**
- `.reveal` blocks present and visible: **15** (was rendered at `opacity-0`).
- `opacity-0` occurrences on the whole homepage: **1** — and that one is the
  `StickyCta` (`translate-y-full pointer-events-none`), a deliberate off-screen
  slide-in, NOT content. The reveal gate that caused "loads then goes black" is
  gone: below-hero content is opacity:1 in the HTML, revealed by CSS scroll
  position (not by hydration).
- Build compiles clean, no `"use client"` in reveal.
