# Marketing site: speed, hydration, and de-clutter pass

The live marketing site (gunlicensenyc.com) feels slow, laggy and "glitchy," the
homepage hero is over-crowded with text, some words don't appear until you interact
with the page, and the mobile nav is unreliable. This was audited against production
and the code at `638c69b`. The findings below are measured, not guessed — follow them.

## The one root cause behind most of it

The homepage runs a large amount of **continuous, always-on animation and blur
compositing above the fold**, on top of a **2,449-node DOM** and **~208 KB of CSS
keyframes**. That saturates the main thread and the compositor, which produces every
runtime symptom at once:

- **Slow interactivity** → the mobile nav is dead for the first seconds after load
  (it has no non-JS fallback; it only works once hydration finishes). Measured
  **LCP ≈ 2.9 s on desktop warm-cache** — materially worse on a real phone CPU.
- **"Words don't show until you click"** → the hero-film captions and figure are
  hidden in the server HTML and only revealed by JavaScript; when the main thread is
  busy they stay blank until an interaction. Separately, this component has **no
  CSS/no-JS fallback at all** (unlike `<Reveal>`, which was correctly fixed).
- **Laggy / glitchy scroll** → three stacked layers of `blur-[140–150px]` under
  infinite animations repaint huge surfaces every frame.

So the plan is: **cut the always-on animation cost, make hero content visible without
JS, de-clutter the first screen, and make the nav robust.** Do NOT solve this by
deleting the brand's visual identity — keep the obsidian/brass look; make it cheap and
correct.

## What is already correct — DO NOT touch

Fonts (`app/layout.tsx:13-31`, self-hosted `next/font`, `display:"swap"`), video
(`ambient-video.tsx`, `preload:"none"`, poster-first, pauses off-screen), analytics
(`app/layout.tsx:88-93`, prod-only, `afterInteractive`, in `Suspense`), code-splitting
(`page.tsx` dynamic `ssr:true` for below-fold), `<Reveal>` (`components/marketing/reveal.tsx`
— CSS-only via `@supports (animation-timeline: view())`), and the CSP (keeps
`'unsafe-inline'`, no nonce — inline hydration is allowed). No framer-motion/three.js.
Don't add heavy animation libraries.

---

# P0 — Correctness (things that are actually broken)

## P0.1 · Hero content must be visible WITHOUT JavaScript

`components/marketing/hero-film/hero-film.tsx` renders its caption sentences and its
whole SVG at `opacity:0` / clipped in the server HTML; they are un-hidden **only** by
JS setting `data-beat` / `data-on`. There is no CSS fallback, so any delay or failure
of the driver leaves the words blank until interaction.

```
Give the hero film a correct RESTING STATE that is visible with no JS:
· app/globals.css — the caption + beat gates:
    .filmfig .capline               (~:1797-1803)  opacity:0 → data-on
    .pg / .prob / .fix / .world-order (~:1637-1664) opacity:0 / clipped → data-beat
  Mirror the pattern already used by `.reveal` (globals.css:418-436): the HIDDEN
  state must live INSIDE `@media (prefers-reduced-motion: no-preference)` and/or an
  `@supports` guard, so the DEFAULT (no-JS, reduced-motion) renders the film's
  resolved/finished frame — figure, product screen, license, and ONE caption —
  fully visible. Text is never blank without JS.
· Simplest robust approach: render the component's default markup at the RESOLVED
  beat (the end state, ~beat 8), and let JS only ANIMATE from there — never hide the
  content pending JS. The still frame is the poster; motion is the enhancement.
```

Verify by loading the homepage with JavaScript disabled: the hero shows a complete,
legible image with its caption — no empty room, no blank text.

## P0.2 · The mobile nav must never be dead

`components/marketing/nav.tsx` is a Radix Sheet driven purely by `useState` — correct,
but with **no non-JS fallback** and it only works after hydration. Two hardening steps:

```
1. Faster hydration is the real fix (see P1 — a lighter homepage hydrates in time).
2. Harden the Sheet close/unmount. Observed: after open→close the overlay
   (components/ui/sheet.tsx:32-46, `data-slot="sheet-overlay"`, `fixed inset-0 z-50`,
   pointer-events:auto) can remain mounted with its exit animation stuck
   "running" (animationName "exit" never firing animationend), which leaves a
   full-screen tap-eating layer over the page. This was seen with the tab
   backgrounded (animations paused), so treat it as a FRAGILE pattern to harden:
     · Ensure the overlay/content exit animations reliably complete (or drop the
       exit animation on the overlay so Radix Presence unmounts it immediately),
       and confirm the overlay is REMOVED from the DOM after close on a real device.
     · The `data-open:` / `data-closed:` animation variants there are non-standard
       shorthand — verify they resolve to Radix's `data-state=open|closed`; if in
       doubt use the explicit `data-[state=open]:` / `data-[state=closed]:` variants
       that the rest of shadcn uses, so open AND close animations are correct.
3. Confirm the whole nav import chain stays client-safe (nav → NAV_ROUTES →
   lib/marketing-routes.ts → config/partners.ts). It currently IS safe; keep it so —
   never let a `server-only` / `next/headers` module leak into that graph.
```

Verify: on mobile, tapping the hamburger opens the menu; closing it removes the
overlay and every tap target (hamburger, links, page) is immediately usable again —
open/close repeatedly with no stuck layer.

---

# P1 — Performance (make it fast and smooth)

## P1.1 · HeroFilm — the single heaviest thing on the page

`components/marketing/hero-film/hero-film.tsx` (613 lines) + `hero-film/geometry.ts`.
Eager client component beside the LCP `<h1>`. It runs **~20 infinite CSS animations**
(`globals.css` ~1657-1811), a self-rescheduling **25 s JS timeline** (`hero-film.tsx:184-217`)
started by an **inline parse-time `<script>` driver** (`:64-81`, injected `:610`), and
renders **~200 confetti SVG nodes** (`geometry.ts:104` loop `i<56`, each 3–4 nested
`<g>`) — the dominant contributor to the 2,449-node DOM.

```
· Default to the RESOLVED STILL FRAME (P0.1). Start the animated timeline only after
  first idle/interaction (`requestIdleCallback` / first pointer/scroll), never at
  parse time. Reconsider whether the inline pre-hydration driver is worth its
  fragility — a still poster + deferred animation removes the need for it.
· It already has an IntersectionObserver pause, but it sits in the first viewport, so
  it's always "on." Cut the continuous cost: drop the always-running ticker
  (`hf-tick`, ~globals.css:1811) and reduce the count of `infinite` animations.
· Cut the confetti count hard (56 → a handful, or SVG-none on mobile) to shrink the
  DOM and paint.
· On mobile, consider serving a static illustration (the still frame) with NO
  animation timeline at all — the phone is where the cost hurts and the payoff is
  lowest.
```

## P1.2 · HeroAura — 5 infinite animations over 68rem blur layers, rendered twice

`components/marketing/hero-aura.tsx` (rendered `page.tsx:79` AND `:293`). Layers of
`blur-[150px]` on 68rem/46rem/48rem pools each under an infinite aurora/star-drift/
sweep keyframe (`globals.css:1008,1022-1040`), plus a `pointermove`→rAF parallax loop.
Large-radius blur under continuous animation is the prime scroll-jank suspect.

```
· Bake the aura to a STATIC gradient (a `radial-gradient`/`conic-gradient` background,
  or a pre-rendered WebP) — it does not need to move to look premium.
· If any motion is kept: one slow animation at most, smaller blur radius, and pause it
  via IntersectionObserver when the hero leaves the viewport. Drop the parallax rAF
  loop (or gate it behind fine-pointer + reduced-motion, which it partly does).
· The `#closing` instance is already `variant="still"`; still, reduce its blur layers.
```

## P1.3 · DarkBackdrop — 3 fixed blur pools on EVERY route

`components/theme/dark-backdrop.tsx` (mounted globally via `marketing-frame.tsx`).
Three fixed full-viewport `blur-[140–150px]` glows + a tech-grid, always composited,
compounding with HeroAura on the homepage. It never animates.

```
· Replace the three blurred pools with a single static pre-rendered gradient image
  (or a plain CSS gradient) — a non-animated blur this large is pure compositor cost
  for no motion benefit. Keep the tech-grid if it's cheap (a tiled SVG/CSS pattern).
```

## P1.4 · Trim DOM + CSS

The ~2,449-node DOM and ~208 KB of keyframe CSS come mainly from HeroFilm confetti,
"The Count" (24 doc cells), and the two skyline SVGs. After P1.1 (confetti cut), audit
whether "The Count" can render fewer nodes. Remove keyframes for any animations you
delete. Delete the dead media (`public/media/nyc-night-abstract.{mp4,webm}` — no longer
referenced) to keep the deploy clean.

---

# P2 — De-clutter the first screen

The first viewport currently competes: eyebrow badge + H1 + ~40-word lead + **two**
CTAs + a micro line (`page.tsx:83-150`) + the hero film's **own 6 rotating captions and
a text-dense mock dashboard** (`hero-film.tsx:457-601`) + a **3-column proof strip**
(`page.tsx:129-150`). That is the "cluttered with words."

```
· Above the fold, keep: H1, ONE supporting line (~1 sentence), ONE primary CTA
  (a quiet secondary link is fine). Drop the micro line or fold it into the CTA.
· Make the hero film read as an IMAGE, not a second paragraph: cut its rotating
  caption track to one line (or none), and simplify the mock-dashboard text so it's
  glanceable, not readable.
· Move the 3-column proof strip BELOW the fold (it's good content, wrong place).
```

Keep the copy honest and on-brand — this is a trim, not a rewrite, and none of the
legal-guardrail language changes.

---

# VERIFY

```
 1. JS DISABLED: the homepage hero renders a complete, legible image + caption, and
    all body copy is visible. Nothing is blank pending JS.
 2. Mobile (375): hamburger opens the menu; closing it fully removes the overlay and
    the page is immediately tappable again; repeat 5× with no stuck layer. Works on an
    interior page (/faq) too.
 3. Lighthouse (mobile, throttled) on `/`: LCP < 2.5 s (target ~2.0 s), TBT well down
    from today, CLS ~0. Compare before/after numbers and report them.
 4. Scrolling the homepage on a mid-range phone (or 6× CPU throttle in devtools) is
    smooth — no visible jank while the hero is on screen.
 5. DOM node count on `/` is materially lower than 2,449 (report the new number).
 6. `prefers-reduced-motion: reduce`: no infinite animations run; the hero is a clean
    still; nothing is hidden.
 7. Light AND dark: colors only from brand tokens; no hardcoded hex introduced.
 8. `pnpm test` + `pnpm lint` + `pnpm build` green. `next build` route report shows the
    homepage still statically rendered (or ISR), not forced dynamic.
 9. Visual regression: the site still looks premium — obsidian/brass identity intact,
    just calmer and faster. Screenshot the hero before/after at 375 and 1440.
```

# DO NOT

- Do NOT keep any content hidden pending JS — a still, visible resting state is the
  default; motion is the enhancement.
- Do NOT add framer-motion, GSAP, three.js, or any animation dependency. Hand-rolled
  CSS/rAF is the house style; make it cheap, don't replace it.
- Do NOT ship large-radius `blur()` under an infinite animation. Bake big static blurs
  to an image or a plain gradient.
- Do NOT put the nav gate in `proxy.ts`, and do NOT remove the mobile menu's Radix
  Sheet — fix its close/unmount instead.
- Do NOT touch fonts, video loading, analytics gating, CSP, or the code-splitting that
  the audit already found correct.
- Do NOT rewrite marketing copy or weaken any legal-guardrail language; P2 is a trim.
- Do NOT regress accessibility: focus states, `aria-*`, and reduced-motion all stay.
```
