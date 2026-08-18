# HERO V4 — two clocks

**Paste this whole file to Claude Code from the repo root.** Scope is the homepage hero only: the `#hero` `<section>` in `app/(marketing)/page.tsx`, plus three new components.

**This supersedes `HERO_V3_PROMPT.md`.** Delete it. V3's skyline and track instrument carry over. **The process line is deleted from the background**, two scrims are added, and the panel's content changes completely.

Approved mockup: `mockups/hero-v4.html` — open it and **click the track tiles**. All three viewports are live.

Siblings: `PRODUCT_FEATURE_V9_PROMPT.md`, `THE_COUNT_V14_PROMPT.md`.

---

## 0. Context you must load before writing any code

- `AGENTS.md` — repo conventions and the legal guardrails. §7 assumes you have read them.
- `config/brand.ts` — the only source of colour.
- `config/stages.ts` — `CASE_STAGES` (13 nodes) **and `JURISDICTION`** (`resident` / `business` / `non_resident`) — both drive this hero.
- `content/facts.ts` — **`FACTS.timeline` and `FACTS.references`.** The panel quotes both; they are attorney-approved and sourced, and the hero must not drift from them.
- `app/(marketing)/timeline/page.tsx` — the *two clocks* framing this panel is built on. Read it before writing panel copy.
- `lib/requirements/generate.ts` + `lib/intake/schema.ts` — **the track-aware reference counts (4 / 2 / 0) that §2.2 puts on screen.** Confirm before shipping.
- `app/globals.css`, `components/marketing/hero-aura.tsx`, `app/(marketing)/page.tsx`.
- `components/marketing/showcase/case-animation*.tsx` — the thing being removed from the hero.

Then `pnpm dev` and look at `/` at 1440, 1180, 820, 390.

---

## 1. What is wrong with the hero that is live

1. **The first thing anyone sees is a crude stick figure firing a handgun.** This is a documents-and-deadlines business; `AGENTS.md` says the register is *"my lawyer's office"* and *"no tactical cosplay."* It undercuts a premium price before a word is read and points at the one part of the job we do not do.
2. **~950px tall and roughly 45% full.**
3. **The headline emphasises the wrong half** — the metallic gradient is on the keyword, leaving **Handled.** as small white text at the end of a four-line rag.
4. **Nothing responds to the visitor**, and nothing answers the only question they arrive with: *is this for me, and what will it take?*
5. **There is no New York in it** — on a brand called Gun License NYC.

---

## 2. The concept

### 2.1 The city — and what is NOT in it

A **Manhattan elevation drawn as a blueprint** along the base: hairline strokes over near-black fill, in **two depth layers** — a dim, compressed far range and a taller, sharper near range with the landmarks (setbacks, a spire, a stepped crown, a tapered tower with a mast), plus a scatter of lit windows and a warm street glow.

**There is no process line, and no tributaries.** V3 had a route crossing the buildings with labelled feeder lines; two competing line systems in the same space read as clutter, and deleting it fixed more than tuning it would have. The journey now lives inside the panel (§2.2), where it is information rather than decoration.

**Two scrims, not one:**

```css
.hero-veil   { background: linear-gradient(180deg, rgba(7,8,11,.74) 0%, rgba(7,8,11,.5) 32%,
                                            rgba(7,8,11,.14) 62%, rgba(7,8,11,.30) 100%); }
.hero-veil-l { background: linear-gradient(98deg, rgba(7,8,11,.94) 0%, rgba(7,8,11,.8) 26%,
                                            rgba(7,8,11,.42) 52%, rgba(7,8,11,.1) 72%, transparent 84%); }
```

A global veil so nothing competes with the type, plus a left-weighted one under the copy column. **Note the global veil lifts to `.14` over the lower band** — the first pass used a uniform scrim and buried the skyline entirely. Tune by looking, not by symmetry.

**Everything is deterministic and index-derived. No `Math.random()`** — the server and the client must draw the same skyline.

### 2.2 The instrument — and this is the point of the revision

The right column is a **live panel**, not a form. One question, three answers, which are the three real tracks in `JURISDICTION`:

> **Which one are you?** · NYC resident · NYC business · Non-resident

**What it shows is two clocks, not a document count.** From `content/facts.ts` and `/timeline`, already attorney-approved:

> *"Two clocks run here, not one. The first is yours and starts today. The second is the NYPD's — roughly six months from a **complete** submission to a decision."*

**The NYPD's ~6 months is identical on every track.** What differs is *your* half — and what drives your half is **how many people you have to chase**. That is why the reference count belongs here: it is not trivia, it is the thing that moves your date.

| | Resident | Business | Non-resident |
|---|---|---|---|
| Headline | About 8 months | About 7½ months | About 7 months |
| **Your clock** ⚠ | 8–12 weeks | 6–9 weeks | 4–6 weeks |
| The NYPD's | ~6 months | ~6 months | ~6 months |
| **People to chase** | **4** | **2** | **0** |
| What proves your standing | Proof of NYC residence | Business records & premises | NYC business nexus + home-state license |

Rendered as a **two-segment bar** — cyan for your half, brass for the NYPD's, ending in a small LICENSED seal. Switching tracks resizes the cyan segment and flips the numbers. That resize *is* the insight: you can see the half we compress.

**A row that is identical on every track does not belong in a panel whose job is to differentiate.** The old "13 stages" row is deleted for exactly that reason.

#### ⚠ 2.2.1 The prep ranges are NOT approved — this is blocking

`~6 months` is sourced to the NYPD License Division and attorney-approved in `content/facts.ts`. **The per-track prep ranges (8–12 / 6–9 / 4–6 weeks) are placeholders I invented so the design could be seen.**

Before this ships you must do one of:

1. Replace them with attorney-approved figures, and add them to `content/facts.ts` with a source — **not** as literals in a component; or
2. Drop the numeric ranges and use the qualitative language `/timeline` already carries: *"People who work at it steadily tend to measure this in weeks. People who start and stop tend to measure it in months."* The bar can still differ by track using the chase count as its proportion.

Do **not** ship invented durations on a page for a legally sensitive service. The panel already carries the footnote *"Prep range is an estimate, not a promise"* — that footnote is a minimum, not a substitute for sign-off. The headline totals (About 8 / 7½ / 7) derive from the prep ranges and fall under the same rule.

### 2.3 The headline — same words, different weight

**Do not change one character of the H1.** `The whole NYC gun license process. Handled.` is a ranking asset. Re-set as **three lines**, `Handled.` alone on the last, in `.text-prestige`, at full size, weight **500**. The metallic fill moves off the keyword and onto the promise. SEO-neutral, highest-leverage change in the file.

### 2.4 One CTA

The panel adds **no second button**. Picking a track updates the single brass CTA's `href` (`/eligibility?track=…`), so the choice carries into the quiz instead of asking twice. The panel's only link is a quiet `See every requirement for this track →` to `/requirements`.

Below the fold line, a three-cell **proof strip** gives the hero a floor: where we work / what we run / how we work.

---

## 3. Phase 1 — three components

Create `components/marketing/hero-skyline.tsx`, `hero-route.tsx`, `hero-track-panel.tsx`.

### 3.1 Bake the skyline

The mockup builds the two layers from spec arrays at runtime. **Do not ship that.** Generate once, commit the resulting path data so both SVGs are static server-rendered markup with no runtime work.

### 3.2 The two things that will silently break

**The proof strip is a SIBLING of the hero, not a child.** The city layers are `position:absolute; bottom:0` of the hero. With the strip inside, the hero's bottom is *below* the strip and the skyline renders behind it.

**Below 1060px the city layers need FIXED-PIXEL heights, not percentages.** The hero grows tall when the copy and panel stack, so a `44%` band on a 2400px hero is ~1050px tall; `xMidYMax slice` then scales a 1440-wide viewBox by ~2.5× and you see roughly 190px of skyline. Use `clamp(150px,34vw,210px)` / `clamp(124px,28vw,175px)` below the breakpoint.

```css
.hero-city-far  { height: 62%; opacity: .55; -webkit-mask-image: linear-gradient(180deg, transparent, #000 40%); }
.hero-city-near { height: 54%;               -webkit-mask-image: linear-gradient(180deg, transparent, #000 22%); }
@media (max-width: 1060px){
  .hero-city-far  { height: clamp(170px,30vw,320px); }
  .hero-city-near { height: clamp(140px,25vw,270px); }
}
@media (max-width: 640px){
  .hero-city-far  { height: clamp(150px,34vw,210px); }
  .hero-city-near { height: clamp(124px,28vw,175px); }
}
```

### 3.5 The panel

`"use client"` — it owns the track state. Everything else in the hero is a server component.

- Three `<button aria-pressed>` in a `role="group"`. **Not radios styled as cards** — these change a view, they do not submit.
- Default track `resident`, **server-rendered**, so the panel is complete in the HTML and LCP is unaffected.
- Number changes animate with a short flip (`translateY(-8px)` → 0, 360ms). Do not animate the descriptive sentences.
- The two-clock bar is two flex children with `flex-grow` transitioning over 550ms `cubic-bezier(.22,1,.36,1)`. **Transition `flex-grow`, not `width`** — the seal sits outside the bar and must not move.
- `0` in the chase row renders in `--ok` green at a smaller size, with the copy *"No character references — but a home-state license and a documented NYC business nexus."* Zero is good news here; do not style it as a warning.
- Glass surface: `backdrop-filter: blur(18px) saturate(130%)`, hairline border, brass rim glow. It sits **over** the city — that overlap is the depth cue.
- The source footnote is not optional: `NYPD timing: NYPD License Division · reference rule: 38 RCNY ch. 5. Prep range is an estimate, not a promise.`

---

## 4. Phase 2 — the section

Rewrite `#hero` in `app/(marketing)/page.tsx`. **Remove `<CaseAnimationLazy />` from the hero.** Leave the component in the repo but note in your summary that nothing else imports it. **Do not move the shooting illustration anywhere else on the marketing surface.**

```tsx
<section id="hero" className="hero-shell relative isolate flex flex-col overflow-hidden">
  <HeroSky />            {/* aura pools, stars, blueprint grid — aria-hidden */}
  <HeroDefs />           {/* zero-size SVG, §3.3 */}
  <HeroSkyline />        {/* aria-hidden */}
  <HeroRoute />          {/* desktop route + band — aria-hidden */}
  <div className="hero-wrap"> <Copy /> <HeroTrackPanel /> </div>
  <span aria-hidden className="hero-spacer" />   {/* <1100px only, so the band has room */}
</section>
<div className="hero-strip">…three cells…</div>   {/* SIBLING */}
```

Height `min(calc(100svh - var(--nav)), 960px)` — `svh`, not `vh`, or mobile chrome pushes the CTA below the fold. **The H1 must not sit inside anything that delays its paint** — it is the LCP element.

---

## 5. Phase 3 — responsive

**≥1060px** — two columns: copy left (max 620), panel right (412). Skyline full-bleed across the base under both scrims.

**<1060px** — one column: copy, then panel. The hero switches to `min-height:auto` plus a spacer (`clamp(180px,22vw,240px)`) so the skyline has room above the strip, and the left scrim becomes a vertical one. City heights go fixed-pixel (§3.2).

**<640px** — full-width CTA, secondary link beneath, panel padding down, track tiles stay **three-up** (they fit; do not stack them), and the clock legend goes **one column** so `8–12 weeks` and `~6 months` each get a full line. Proof strip 2-up, then 1-up below 420px.

**≤320px** — no horizontal overflow.

---

## 6. Motion

Three aura pools, the seal halo on the clock bar (4s), the bar's `flex-grow` transition, and the number flips. That is all. Everything is `transform` or `opacity`. Under `prefers-reduced-motion` all of it stops and **the track panel still works** — the bar resizes instantly rather than easing.

---

## 7. Hard constraints

**Legal.** No *guarantee / expedite / fast-track / insider / approval rate*. The route ends at `LICENSED` because that is the last value in `CASE_STAGES` — it is **a map of the process, not a prediction of outcome**, and no copy near it may imply otherwise. The panel shows *requirements*, never an eligibility determination: picking "NYC resident" must never read as "you qualify." No durations anywhere in the hero without a sourced figure and attorney sign-off. **No firearm imagery** — that is the change this document exists for.

**The numbers must be true.** Every figure in the panel comes from the requirements engine. Verify 4 / 2 / 0 against `lib/intake/schema.ts` before shipping; if it disagrees, the hero changes.

**SEO — this is the homepage H1.** Snapshot before you start: heading outline, JSON-LD, canonical, title, meta description, every internal `href` on `/`. The H1 text is unchanged; the lead is unchanged. `/how-it-works` and `/requirements` are **additive** links. Verify the H1 and lead survive in `curl`'d HTML — the panel is a client component, the copy is not.

**Tokens.** Every colour through `config/brand.ts`. No inline hex.

**Do not touch** `/admin`, `/portal`, `/instructor`, `/auth`, `app/api/**`, `lib/seo.ts`, `components/ui/reticle-progress.tsx`, or any marketing section other than the hero.

**Performance — this is the LCP surface.** No images, no new fonts, no new dependency, no animation library. Baked coordinates: no runtime measurement, no resize listener, no layout shift. Removing `CaseAnimationLazy` should *reduce* above-the-fold JS — confirm it does. Mobile Lighthouse: performance ≥ 90, **LCP < 2.5s**, CLS < 0.05.

---

## 8. Verification — run it, do not claim it

1. `pnpm lint && pnpm test && pnpm build` pass.
2. Screenshots at **1440×900, 1180×860, 820×1000, 390×844, 320×640**.
3. **The skyline reads at every width** — not buried by the scrim, and not scaled to a 190px sliver on mobile (§3.2). Check 390 specifically.
4. **Nothing crosses the copy.** With both scrims in place the headline, lead and CTAs sit on near-flat ground.
5. **Click each track at 1440 and at 390.** The headline total, your-clock figure, chase count, chase sentence and standing line all change; the cyan bar visibly shrinks; the CTA href gains the right `?track=`; the seal does not move.
6. **The prep ranges are approved or replaced** (§2.2.1). This is blocking — do not ship invented durations.
7. **The source footnote is present** and cites the NYPD License Division and 38 RCNY ch. 5.
8. **The H1 is three lines** at 1440, 1180 and 390 with `Handled.` alone on the last, and the metallic fill on that word only.
9. **LCP element is the H1 text**, not an SVG. `curl -s http://localhost:3000 | grep -c "The whole NYC gun license process"` ≥ 1, and the default panel state is in that HTML.
10. **Reduced motion:** nothing moves, the route reads as complete, the seal is lit, **the panel still switches.** **Overflow** `scrollWidth === clientWidth` at all five widths. **Keyboard:** three track buttons plus two CTAs plus the panel link, all with visible `focus-visible` rings, in a sensible order. **SEO diff** clean or additive.

---

## 9. Definition of done

- No firearm imagery. `CaseAnimationLazy` gone from the hero.
- A recognisable Manhattan elevation along the base, under two scrims, readable at every width — **and no process line anywhere in the background.**
- The panel switches all three tracks, the two-clock bar resizes, and every number it shows is either sourced or approved (§2.2.1).
- One brass CTA, carrying the chosen track.
- H1 three lines, text unchanged, `Handled.` carrying the metallic fill.
- LCP is the H1. Mobile performance ≥ 90, CLS < 0.05. SEO diff clean.
- `/portal`, `/admin`, `/instructor` untouched.

---

## 10. How to work

Build in this order and show me each: **(1)** the skyline alone at 1440 — *if the city is not beautiful standing still, nothing after it matters*; **(2)** the two scrims, with the copy over them; **(3)** the panel, static, on the default track; **(4)** the track switching and the bar resize; **(5)** the sub-1060px layout with fixed-pixel city bands; **(6)** the aura and halo, last. After each step post screenshots at 1440 and 390 and the check output. If a rule here fights the brand or the content, say so and propose the alternative rather than silently deviating.
