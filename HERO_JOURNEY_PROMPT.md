# Build prompt — replace the hero sculpture with the Hero Journey walker

Paste everything below the line into Claude Code, on the `redesign/v2` branch.

---

## Context

You are on branch `redesign/v2` of the CCW repo. The v2 marketing homepage currently
renders a "case file sculpture" hero visual — a stack of paper planes with colourful
ribbons threading behind it. It is being **removed and replaced** with an animated
13-stage journey visual: our shield logo, personified, walks in from off the map,
reaches the applicant where they stalled, and walks them through every remaining
stage to Licensed.

**A fully working, browser-verified prototype already exists in this repo at
`redesign/hero-options.html` — the `<section id="o1">` block ("Option 01 · The Line").**
Read it first. Its CSS lives in the `/* ===== 1 · THE LINE ===== */` block and its JS in
the `// ---- 1 · the line` IIFE. Port it; do not reinvent it. Every timing constant,
easing curve and geometry value in there was tuned against real browser screenshots.

Before writing any code, read `AGENTS.md` and the relevant guide in
`node_modules/next/dist/docs/`. This is Next.js 16 — not the Next.js in your training data.

---

## Phase 0 — read these first

| File | Why |
|---|---|
| `redesign/hero-options.html` | The prototype you are porting (section `#o1`) |
| `components/marketing/v2/hero-sculpture.tsx` | What you are deleting |
| `app/(marketing)/page.tsx` | Lines ~34–70: the hero section that hosts it |
| `app/(marketing)/marketing-v2.css` | Lines ~343–465 and ~1000–1080, ~1180–1205: the CSS to retire |
| `config/stages.ts` | `CASE_STAGES` and `NYPD_CONTROLLED_STAGES` — the SSOT for stage names |
| `app/(marketing)/layout.tsx` | Where marketing CSS is imported |

---

## Phase 1 — the honesty fix (do this first; it changes the copy you port)

**This is the most important instruction in this document. Do not skip it.**

The prototype's readout labels every stage from 07 to 13 as **"handled by us."**
For four of those seven stages that is false, and it is exactly the overclaim this
codebase's guardrails ban.

`config/stages.ts` already declares the truth:

```ts
export const NYPD_CONTROLLED_STAGES: CaseStageKey[] = [
  "filed", "fingerprinting_booked", "under_investigation", "decision",
]
```

…with the comment: *"Stages where the clock belongs to the NYPD, not to us or the
applicant. The timeline marks these honestly — we never imply we can speed them up,
because we can't, and claiming otherwise is exactly the overclaim the guardrails ban."*

So the readout suffix **must be derived from `isNypdControlled(stage.key)`**, not hardcoded:

- `isNypdControlled === false` → `— handled by us`
- `isNypdControlled === true`  → `— NYPD's clock, we track it`

Never write the string "handled by us" against stages 09–12. Never introduce the words
*guarantee, expedite, fast-track, insider,* or *approval rate* anywhere in this component
(guardrail #4 in `AGENTS.md`).

Give the four NYPD-controlled stations a visual tell as well, so the distinction is
legible without reading: render their node with `stroke-dasharray: 3 3` (a dashed ring)
while our stages get a solid ring. Same size, same colour — the dash alone carries it.

---

## Phase 2 — new component `components/marketing/v2/hero-journey.tsx`

Create a **client component** (`"use client"`) exporting `HeroJourney`.

### Stage data — derive, never retype

```ts
import { CASE_STAGES, isNypdControlled } from "@/config/stages"
```

Use `CASE_STAGES` (13 entries, already ordered) as the source. Use each stage's `short`
field for the readout where it exists and is legible; fall back to `label`. Do **not**
paste a literal array of stage names into this component — that is precisely the
copied-list drift this codebase has already shipped a bug from (see the header comment
in `config/portal-steps.ts`).

`HERE = 6` (stage 6 = `document_collection`) is the stalled stage. Keep it a named
constant with a comment saying it is an illustrative default, not live case data.

### Structure

Port the prototype's markup verbatim in shape:

- One `<svg viewBox="0 100 640 190">` with `role="img"` and an `aria-label` describing
  the whole journey in a sentence.
- Three copies of the same `<path d="...">`: `#ghost` (dotted planned route),
  `#route` (drawn to stage 06), `#route2` (filled under the walker's feet).
- `<g id="stops">` — populated in an effect.
- `<g id="confetti">` — populated in an effect.
- `<g id="walker">` — the shield character (skyline crown, two eyes with pupils, gold
  check, two arms, two legs), built exactly as in the prototype.
- A `<p className="hj-readout">` sibling below the SVG, populated in an effect.

Use **`useRef` + `useEffect`** for the generated nodes. Do not build the stations,
confetti or readout rows during render — they depend on `path.getTotalLength()` and
`getPointAtLength()`, which require a laid-out DOM node. Generate them in an effect
that runs once, and guard against React 18 StrictMode double-invocation by clearing
the containers at the top of the effect.

### Motion

- The route draw, station pops, leg/arm swings, bob, confetti and readout crossfades are
  **all pure CSS animations**, gated on a `.is-playing` class on the root. That is how
  the prototype does it and it is why replay is a single class toggle.
- **Only the walker's travel uses the Web Animations API**, because it needs keyframes
  sampled from the path at constant arc-length speed. Port the `frames(from, to, lead)`
  helper unchanged.
- Start playback on mount for the hero (it is above the fold). Use an
  `IntersectionObserver` only to **avoid** starting while off-screen if the user deep-links
  mid-page; once it has played, do not loop and do not replay on re-entry.
- Cancel every WAAPI animation in the effect's cleanup.

### Colour — tokens only, no hex

The prototype hardcodes hex because it was a standalone file. In the app, every colour
must come from the `.mkt2` custom properties already defined at the top of
`marketing-v2.css`, which match the prototype exactly:

| Prototype hex | Token |
|---|---|
| `#5BE7F6` | `var(--cyan)` |
| `#3978F6` | `var(--electric)` / `var(--blue)` |
| `#7659FF` | `var(--violet)` |
| `#E24BAE` | `var(--magenta)` |
| `#FF8A43` | `var(--tangerine)` |
| `#FFFEFA` | `var(--paper)` |
| `#0A1019` | `var(--ink)` |
| `#767D87` | `var(--ink-muted)` |
| `#D7D3C9` | `var(--rule)` |

The shield body (`#4B4F55`) and the gold check (`#E0A93F`) come from the actual logo
(`public/logo.png`) and are **not** in the v2 palette. Add exactly two new tokens for
them in the new stylesheet — `--shield: #4B4F55` and `--shield-gold: #E0A93F` — and
reference those. Do not approximate them with existing tokens; they are brand marks.

The SVG gradient must be `gradientUnits="userSpaceOnUse" x1="40" x2="600"` spanning the
**whole** route, so the travelled portion only shows the cool end and the warm end reads
as colour the applicant has not earned yet. This is deliberate — do not "fix" it to span
the drawn portion.

---

## Phase 3 — stylesheet `app/(marketing)/hero-journey.css`

Do **not** hand-edit `marketing-v2.css` to add these rules. Its header says it is a
generated port of `redesign/homepage-visual-spec.html` and must be regenerated rather
than hand-edited rule-by-rule. Put the new rules in their own file and import it in
`app/(marketing)/layout.tsx` on the line after `import "./marketing-v2.css"`.

Scope every selector under `.mkt2 .hero-journey` so it cannot leak into the portal,
admin or instructor surfaces.

### Four bugs already found and fixed in the prototype — do not reintroduce them

These were all found by rendering real screenshots. If you rewrite any of this from
scratch you will hit them again.

1. **Dash-pattern wrap.** `#route` uses `stroke-dasharray: var(--done) var(--gap)` where
   `--gap` is `pathLength + 2`. If the gap is only `pathLength - done`, the repeated dash
   wraps back onto the far end of the route and paints a phantom coloured tail — it looks
   like stages 8–13 are already complete while stage 3 is still drawing.

2. **Odd-count `stroke-dasharray`.** SVG repeats an odd-length dash list, which turns what
   you think is the 3rd value into a visible 5th dash. `#route2` must use a **four-value**
   list: `0 var(--done) 0 var(--gap)` animating to `0 var(--done) var(--rest) var(--gap)`.

3. **Zero-length dashes + `stroke-linecap: round` render as dots.** With the four-value
   list above, the only zero-length dash lands at distance 0 and at `--done`, both of
   which sit underneath station circles (which are `fill: var(--paper)`), so they are
   hidden. Keep the station `<g>` **after** both route paths in DOM order.

4. **`fill: "both"` on the second walker animation swallows the first.** The walk-across
   animation must use `fill: "forwards"`. With `"both"` it back-applies its start pose
   from t=0 and the entire walk-in phase silently never renders.

Also: `.halo` and every rotating limb need `transform-box: fill-box` — without it, SVG
transforms resolve against the SVG's user-space origin and the element flies off-screen.

### Timeline (from the prototype — keep these in sync with the JS constants)

```
120ms   dotted planned route fades in
260ms   coloured route draws to stage 06        (900ms)
300ms   stations 01–06 pop in sequence
1180ms  walker fades in off-stage left
1350ms  walker walks in, legs + arms swinging   (700ms)
2060ms  walker holds a hand out to you          (400ms)
2300ms  walker walks you across                 (1750ms)
        · route fills under its feet
        · each station lights as its foot lands
        · readout names the stage it is standing on
4050ms  arrival hop, arms up, eyes squint
4110ms  confetti bursts                          (~1.4s)
4310ms  readout settles on Stage 13 · Licensed
```

Total ~5.5s, plays **once**, then stops. Nothing loops. No `requestAnimationFrame` loop
anywhere. The only continuous cost after 5.5s is zero.

### Responsive + accessibility

- Must not overflow at 390px. The prototype is verified clean at that width; the readout
  wraps to two lines there and needs `height: 40px` and `font-size: 9px` below 560px.
- `@media (prefers-reduced-motion: reduce)` must disable **every** animation in the file
  with `!important` and render the finished state: route fully drawn, all stations lit,
  walker at stage 13, readout showing the final row, confetti hidden. Port the
  prototype's reduced-motion block; it already does this.
- The SVG carries the whole meaning in its `aria-label`. The readout `<p>` should be
  `aria-live="off"` — it is decorative narration of a visual, and announcing seven stage
  changes in five seconds would be hostile to a screen-reader user.

---

## Phase 4 — remove the old sculpture

1. **Delete** `components/marketing/v2/hero-sculpture.tsx`.
2. In `app/(marketing)/page.tsx`: replace the `HeroSculpture` import and its `<HeroSculpture />`
   usage (~line 61) with `HeroJourney`.
3. In `marketing-v2.css`, **delete** every rule for these now-dead selectors — they have
   no other consumer, so leaving them is dead weight in the critical CSS:
   `.hero-visual`, `.case-sculpture`, `.case-scroll-layer`, `.paper-sheet`, `.case-file`,
   `.case-top`, `.stage-number`, `.progress-track`, `.progress-fill`, `.next-step`,
   `.next-label`, `.case-stat`, `.ribbon`, `.ribbon-back`, `.ribbon-front`, `.ribbon-loop`,
   `.sculpture-note`, and the `@keyframes deal-in`, `@keyframes plane-fan-out`,
   `@keyframes case-drift`.
   Check the mobile blocks around lines 1180–1205 and the reduced-motion block near 1303
   as well — they carry overrides for the same selectors.
   **Before deleting each one, grep the whole repo for it.** `.case-file` in particular
   appears in a long shared `:hover` reset rule near line 1264; remove it from that
   selector list rather than deleting the whole rule.
4. The `view-timeline-name: --hero-exit` declaration around line 263 exists to drive
   `plane-fan-out`. If nothing else consumes `--hero-exit` after the deletions, remove it too.

---

## Phase 5 — the `hero-progress` strip

`app/(marketing)/page.tsx` around line 63 renders a strip reading
**"Your path · 01 of 05 … Next: eligibility check"** with a 5-segment track.

This now directly contradicts the new visual, which says thirteen stages and shows the
applicant at stage 06. Two numbers describing the same journey differently, 200px apart,
is worse than either alone.

**Remove the `hero-progress` strip and its CSS** (`.hero-progress`,
`.hero-progress-label`, `.hero-progress-track`, `@keyframes hero-progress-in`). The new
visual supersedes it completely. Verify nothing else references those classes first.

---

## Phase 6 — verify (required; do not report success without this)

1. `npm run build` — must pass clean. Zero new TypeScript errors, zero new lint warnings.
2. `npm run dev`, then **drive a real browser** (Playwright/Chromium) against
   `http://localhost:3000/` and:
   - Screenshot the hero at **1200ms, 2200ms, 3200ms, 4400ms and 5200ms**. Attach them.
     Confirm by eye: route stops at 06 · walker walks in · hand out · line fills under it ·
     stations light in order · confetti · arms up.
   - Assert `document.documentElement.scrollWidth === 390` at a 390px viewport.
   - Assert `pageerror` and `console.error` are both empty for the whole 6 seconds.
   - Assert the readout text for stages 09–12 contains `NYPD` and does **not** contain
     `handled by us`.
3. Emulate `prefers-reduced-motion: reduce` and screenshot: the finished state must be
   visible and static, with no walker mid-stride and no confetti.
4. Confirm the four bug classes above are absent: no phantom coloured tail during the
   draw, no stray dots on the route, the walk-in phase actually renders.

## Out of scope

Do not merge to `main`. Do not touch the portal, admin or instructor surfaces. Do not
change `config/stages.ts`. Commit to `redesign/v2` only.
