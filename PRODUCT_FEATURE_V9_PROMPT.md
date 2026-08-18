# PRODUCT FEATURE V9 — rebuild the "You'll never wonder what's next" section

**Paste this whole file to Claude Code from the repo root.** Scope is deliberately narrow: **one homepage section**. Do not start a sitewide redesign. Work the phases in order; do not skip Phase 0.

There is an approved visual mockup at `mockups/product-feature-v9.html` (open it in a browser — it renders the target at 1440 / 820 / 390 in real viewports). **Match it.** Where this document and the mockup disagree, the mockup wins on visuals, this document wins on repo mechanics.

---

## 0. Context you must load before writing any code

- `AGENTS.md` — repo conventions and the legal guardrails. Non-negotiable.
- `config/brand.ts` — the ONLY source of colour. Never hardcode a hex outside this file.
- `app/globals.css` — the `@theme inline` token mapping and every signature utility (`.glass-premium`, `.card-raised`, `.brass-edge`, `.engraved`, `.tech-grid`, `.noise`, `.section-void`, `.section-panel`, `.product-tilt`, the `.ca-*` set).
- `components/marketing/product-feature.tsx` — the section being replaced.
- `components/marketing/showcase/case-file-showcase.tsx` — the current artifact.
- `components/marketing/media-frame.tsx`, `components/marketing/ambient-video.tsx`, `components/marketing/reveal.tsx`, `components/shared/section-eyebrow.tsx`, `components/ui/reticle-progress.tsx`.
- `config/stages.ts` — `CASE_STAGES`, `stageMeta`, `stageIndex`, `stageProgress`. The new artifact reads its stage numbers from here; it does not hardcode them.
- `app/(marketing)/page.tsx` — specifically what sits either side of `<ProductFeature />` (`<Ticker />` above, `<TheCount />` below).

Then run it and look at it: `pnpm dev`, screenshot `/` at 1440, 820, and 390. That is your verification loop for every phase.

---

## 1. What is actually wrong with the current section

Not taste — these are structural.

1. **The claim and the artifact are about different things.** The headline promises *direction* ("what's next"). The artifact is a *status dashboard* — a progress meter, three vitals, three requirement rows. Nothing in it points at a next action. The section's central promise is unproven.
2. **The left column is ~90% empty.** At 1440 the copy block is roughly 470 × 200 inside a column that is ~470 × 780. Everything else is flat `#07080B`.
3. **The `MediaFrame` renders as a black rectangle.** `AmbientVideo` at `opacity-60` under an `absolute inset-0 bg-black/55` scrim resolves to near-flat black. Two media files are downloaded to produce a dark grey box.
4. **The 13-node `ReticleProgress` rail is illegible at that scale.** At ~600px panel width each node is ~2.5px with ~1px connectors. It reads as dust, not a progress rail.
5. **`product-tilt` skews the readable content.** `rotateY(-7deg)` is applied to the panel that holds all the text, so the type is the thing being distorted.
6. **The section is a dead end.** No CTA, no internal link, nothing to do next — on the section whose entire subject is knowing what to do next.
7. **Mobile is inherited, not designed.** The tilt disables and the artifact stacks, but nothing about the artifact's density, type scale, or tap targets changes.

---

## 2. The concept — do not relitigate this

**The artifact must show one next move.** Everything else in it is supporting evidence.

The new composition, left to right at ≥1180px:

| Column | Contents |
|---|---|
| **Left (0.86fr)** | brass rule → eyebrow → H2 → lead → a `24 → 13 → 1` proof ladder → a text CTA into `/how-it-works` |
| **Right (1.14fr)** | a layered case-file artifact: a **ghost panel** rotated behind and cropped by the section edge, a **flat, sharp main panel** in front, and a **floating "You do / 1 thing / this week" chip** over its bottom-right corner |

Inside the main panel, top to bottom: instrument bezel → stage readout with a brass track and a glowing signal head → **the "Your next move" card** (brass-edged, elevated — the visual hero) → an "Already handled" ledger → the standing footnote.

Three rules that make it work:

- **The readable panel never rotates.** Perspective comes from the ghost panel behind it. Only a ≤3° settle-on-hover tilt is allowed on the main panel, and only at ≥1280px.
- **The proof ladder narrows: 24 → 13 → 1.** It ends on the payoff — one thing on your plate — and that number is the only `--signal` cyan in the copy column.
- **Brass is committed to a surface once** (the "next move" card's tinted field + edge). Not sprinkled.

---

## 3. Phase 1 — tokens and utilities

Everything visual resolves through `config/brand.ts` + `app/globals.css`. No page or component may ship a one-off hex.

### 3.1 `config/brand.ts`

Add to `paletteDark`:

```ts
// V9 — the raised section surface. A real step above --bg (#07080B) so a
// section boundary is visible without relying on a 1px hairline alone.
"sec-raised": "#0E1117",
```

**Gotcha:** `type Palette = Record<keyof typeof paletteDark, string>` and `brandCss()` builds both themes. You **must** add a matching key to `paletteLight` in the same commit or TypeScript fails:

```ts
"sec-raised": "#F4F2EE",
```

### 3.2 `app/globals.css` — map the token

In the `@theme inline` block, beside the other brand utilities:

```css
--color-sec-raised: var(--sec-raised);
```

### 3.3 `app/globals.css` — new utilities

Append near the existing `.section-void` / `.section-panel` block:

```css
/* ── V9 section surface + edge ───────────────────────────────────────────
   A section boundary must be signalled by at least TWO of: a surface step,
   a lit edge, a shadow spill, a full-bleed divider. `.section-raised` gives
   the step + the lit top edge + the dark underside; pair it with
   `.divider-horizon` for the third. */
.section-raised {
  background: var(--sec-raised);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.055),
    0 -1px 0 rgba(0, 0, 0, 0.65);
}

/* Full-bleed section rule that brightens toward the centre and carries brass.
   Replaces a bare border-hairline as a SECTION separator (hairline stays
   correct for cards and list dividers). */
.divider-horizon {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.14) 18%,
    color-mix(in oklab, var(--brass) 38%, transparent) 50%,
    rgba(255, 255, 255, 0.14) 82%,
    transparent
  );
}

/* Warm radial over a section so the page has temperature without leaving dark.
   Host must be `position: relative`. Max two per page. */
.wash-brass::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 78% at 66% -6%, color-mix(in oklab, var(--brass) 10%, transparent), transparent 58%),
    radial-gradient(70% 55% at 8% 100%, color-mix(in oklab, var(--signal) 5%, transparent), transparent 62%);
}

/* Blueprint grid, masked to a soft pool so it never tiles edge to edge. */
.tech-grid-pool {
  background-image:
    linear-gradient(var(--hairline) 1px, transparent 1px),
    linear-gradient(90deg, var(--hairline) 1px, transparent 1px);
  background-size: 44px 44px;
  opacity: 0.3;
  -webkit-mask-image: radial-gradient(80% 60% at 62% 30%, #000, transparent 72%);
          mask-image: radial-gradient(80% 60% at 62% 30%, #000, transparent 72%);
}

/* The instrument panel: a lit top edge, a hard contact shadow, a wide ambient
   shadow, and a whisper of brass in the rim. All three shadows are load-bearing
   — drop one and it flattens into a box. */
.panel-instrument {
  border: 1px solid var(--hairline-strong);
  background: linear-gradient(180deg, #12151B, #0C0E13);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 4px 10px -4px rgba(0, 0, 0, 0.7),
    0 60px 120px -46px rgba(0, 0, 0, 0.95),
    0 0 0 1px color-mix(in oklab, var(--brass) 7%, transparent);
}

/* The one committed brass surface in the section — the "next move" field. */
.field-brass {
  border: 1px solid color-mix(in oklab, var(--brass) 42%, transparent);
  background: linear-gradient(
    180deg,
    color-mix(in oklab, var(--brass) 8.5%, transparent),
    color-mix(in oklab, var(--brass) 2%, transparent) 42%,
    color-mix(in oklab, var(--surface-2) 90%, transparent)
  );
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--brass) 10%, transparent),
    0 22px 46px -26px rgba(0, 0, 0, 0.9),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

/* Progress head: a signal dot that pings outward at the current stage. */
@keyframes track-ping {
  0%, 100% { box-shadow: 0 0 0 3px color-mix(in oklab, var(--signal) 16%, transparent), 0 0 14px var(--signal); }
  60%      { box-shadow: 0 0 0 9px transparent, 0 0 14px var(--signal); }
}
.track-head { animation: track-ping 2.6s ease-out infinite 1.1s; }

/* Track fill scales in from the left once, on mount. */
@keyframes track-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.track-fill { transform-origin: left; animation: track-grow 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both; }

/* The "next move" lock-on reticle. */
@keyframes next-lock { 0% { transform: scale(0.7); opacity: 1; } 70% { transform: scale(1.45); opacity: 0; } 100% { opacity: 0; } }
.next-reticle { animation: next-lock 2.4s ease-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .track-head, .next-reticle { animation: none !important; }
  .track-fill { animation: none !important; transform: none; }
}
```

**Do not modify** `.section-void`, `.section-panel`, `.card-raised`, `.glass*`, `.product-tilt`, or the `hairline` token values. `/portal`, `/admin`, and `/instructor` consume the same tokens and this change must not reach them.

---

## 4. Phase 2 — the components

### 4.1 New file: `components/marketing/showcase/case-file-artifact.tsx`

A **server component** (no `"use client"`). Everything in it is server-rendered text — it is real content for crawlers, and it must not become a client island.

```
export function CaseFileArtifact()
```

**Data.** Extend the existing shape rather than inventing a parallel one. Keep it as a module-level const in this file:

```ts
/** The one next action — the visual hero of the artifact. Sourced from the
 *  training-decay rule the reminders engine already enforces (see
 *  lib/reminders/engine.ts): a course certificate must be under six months
 *  old on the filing date. */
const NEXT_MOVE = {
  flag: "Your next move",
  when: "This week",
  title: "Refresh your safety certificate",
  body: "Your 18-hour course certificate ages out Sep 3 — it has to be under six months old on the day you file.",
  handled: "We already found a refresher near you — Saturday 9:00 AM, Queens.",
  action: "Confirm this slot",
  effort: "Takes about 2 minutes",
} as const

const HANDLED = [
  { plain: "Character references — notarized",         meta: "4 / 4", status: "satisfied" },
  { plain: "A statement from everyone you live with",  meta: "3 / 3", status: "satisfied" },
  { plain: "Interview packet — assembling",            meta: "on us", status: "in_progress" },
] as const
```

**Stage numbers come from `config/stages.ts`, not from string literals:**

```ts
const STAGE: CaseStageKey = "document_collection"
const meta  = stageMeta(STAGE)          // → label "Document Collection"
const order = meta.order                // → 6
const total = CASE_STAGES.length        // → 13
const pct   = stageProgress(STAGE)      // → 46
```

Render `STAGE {padStart(order,2)} / {total}` and drive both the track fill width and the head position from `pct`. A stage rename or reorder must move this artifact automatically.

**Structure:**

```
<figure class="relative" >                          ← .art host, perspective at ≥1280
  <div aria-hidden class="artglow" />               ← brass radial pool behind
  <div aria-hidden class="ghost" />                 ← the rotated back panel (see 4.2)

  <div class="panel-instrument rounded-2xl overflow-hidden relative z-10">
    <header class="bezel">◎ mark · "Case file · NYC carry" · <Badge>Mid-journey</Badge></header>
    <div class="p-5">
      <div class="stagerow">STAGE 06 / 13 // Document collection … 46%</div>
      <div class="track"><span class="track-fill"><span class="track-head" /></span></div>
      <div aria-hidden class="ticks">13 tick marks, 5 brass, 1 signal at current, 7 dim</div>

      <div class="field-brass rounded-xl p-4 mt-4">     ← THE HERO
        <p class="flag"><span class="next-reticle" /> Your next move … This week</p>
        <h3>Refresh your safety certificate</h3>
        <p>…ages out <strong class="text-warn">Sep 3</strong>…</p>
        <p class="handled"><Check /> We already found a refresher near you…</p>
        <div><span class="pseudo-btn">Confirm this slot</span><span>Takes about 2 minutes</span></div>
      </div>

      <div class="lhead">Already handled … 17 / 24</div>
      <ul class="ledger">…HANDLED rows…</ul>
      <p class="foot"><CircleDashed /> We track every requirement. Nothing files until it's ready.</p>
    </div>
  </div>

  <div class="chip">You do · 1 thing · this week</div>   ← floats over the bottom-right corner
  <figcaption class="sr-only">Illustration of the Gun License NYC case file …</figcaption>
</figure>
```

**Accessibility — this matters and is easy to get wrong:**

- `Confirm this slot` is **not a `<button>`**. It is a `<span>` styled to look like one. This is an illustration of the product, not the product; a keyboard user must not be able to tab into a control that does nothing. Same for every other control-looking element in the artifact.
- The only tabbable element in the whole section is the CTA link in the copy column.
- The artifact is a `<figure>` with an `sr-only` `<figcaption>`. All text stays real text in the DOM (crawlers read it); do not set `role="img"` with an `aria-label`, which would hide it from screen-reader users while leaving it visually present.
- Decorative layers (`artglow`, `ghost`, `ticks`, the reticle, the `◎` mark) all carry `aria-hidden`.
- Every text colour must clear its surface: body ≥ 7:1, secondary ≥ 4.5:1. `text-text-low` on `#12151B` is the tightest pair in the artifact — verify it, and step to `text-text-mid` if it misses.

### 4.2 The ghost panel

A pure-decoration second panel that gives the composition depth without skewing readable type.

```
absolute; top:-58px; left:30%; right:-32%; height:104%;
border-radius:18px; border:1px solid var(--hairline-strong);
background: linear-gradient(180deg,#1A1E26,#0F1218);
transform: rotateY(-14deg) rotateX(2deg) rotateZ(1.2deg) translateZ(-70px);
transform-origin: left center;
opacity:.62;
box-shadow: 0 50px 100px -36px rgba(0,0,0,.95), inset 0 1px 0 rgba(255,255,255,.06);
mask-image: linear-gradient(90deg,#000 62%,rgba(0,0,0,.55) 88%,transparent);
```

Contents: a faux bezel strip (one brass dot + one grey bar) and ~13 skeleton rows at `rgba(255,255,255,0.11)`, the first one brass. It reads as "there is a whole ledger behind this."

`right: -32%` is what makes it **cropped by the section edge** — the parent `<section>` must be `overflow-hidden` and the artifact must not be inside a `max-w` container that clips it early. Hidden entirely below 1180px.

### 4.3 Rewrite: `components/marketing/product-feature.tsx`

Keep the **exported name `ProductFeature`** so `app/(marketing)/page.tsx` is untouched. Server component. Delete the `MediaFrame` + `AmbientVideo` usage from this file.

```tsx
<section className="section-raised wash-brass relative overflow-hidden py-[clamp(104px,11vw,168px)]">
  <span aria-hidden className="divider-horizon absolute inset-x-0 top-0" />
  <div aria-hidden className="tech-grid-pool absolute inset-0" />

  <div className="relative z-10 mx-auto max-w-[1200px] px-6">
    <div className="pf-grid">
      <div className="pf-head">
        <span aria-hidden className="block h-0.5 w-[34px] rounded-full bg-brass shadow-[0_0_12px_var(--brass-glow)]" />
        <SectionEyebrow className="mt-3.5">What you actually get</SectionEyebrow>
        <h2 className="mt-4 max-w-[14ch] text-balance font-display font-semibold leading-[1.04] tracking-[-0.022em] [font-size:clamp(2rem,3.4vw,3.05rem)]">
          You&apos;ll never wonder what&apos;s next.
        </h2>
        <p className="mt-5 max-w-[44ch] text-pretty text-[1.0625rem] leading-[1.7] text-text-mid">
          We keep the whole application organized and on schedule, so you always know what&apos;s done
          and what&apos;s next — without chasing any of it yourself.
        </p>
      </div>

      <div className="pf-art"><CaseFileArtifact /></div>

      <div className="pf-tail">
        <ul className="beats">…24 / 13 / 1…</ul>
        <Link href="/how-it-works" className="cta">See how the whole process works <ArrowRight /></Link>
      </div>
    </div>
  </div>

  <span aria-hidden className="divider-horizon absolute inset-x-0 bottom-0" />
</section>
```

**The H2 text and the lead paragraph are copied verbatim from the current file.** Do not reword either. Everything else in this section is additive.

**The proof ladder** — new content, three items, `<ul>` with hairline top rules, no boxes. The number is `font-display`, `tabular-nums`, `text-brass-bright`; the third is `text-signal` and carries a 2px signal rule on its left. Copy:

| # | Label | Detail |
|---|---|---|
| 24 | requirements tracked | Every rule that applies to your case, carrying the citation it comes from. |
| 13 | stages, start to licensed | You always know which one you're in — and what closes it. |
| 1 | thing on your plate | We surface the single next action. The rest is ours to chase. |

`24` is the registry count already shown in the artifact. `13` is `CASE_STAGES.length` — **read it, don't type it.**

### 4.4 Leave `case-file-showcase.tsx` alone

Its `simplified` branch becomes unused, but the citation-grade variant is the intended `/how-it-works` artifact. Do not delete it and do not refactor it in this pass. Note the now-dead `simplified` prop in your summary so it can be cleaned up deliberately later.

### 4.5 `AmbientVideo` in this section

Remove it. It rendered under a `bg-black/55` scrim at `opacity-60` — flat black for two media downloads. `PlacemakingBand` still uses `AmbientVideo`, so the component and the media files stay; only this usage goes.

If you want the clip back later, the correct form is a full-section backdrop at `opacity-[0.18]` behind a radial mask — **not** a scrimmed rectangle behind the panel. Do not build that now.

---

## 5. Phase 3 — the responsive spec

The grid uses named areas so the mobile order differs from the desktop layout with no DOM reorder.

**≥1180px — two columns**

```css
.pf-grid{
  display:grid; gap:54px 60px;
  grid-template-columns:minmax(0,.86fr) minmax(0,1.14fr);
  grid-template-rows:min-content min-content;
  grid-template-areas:"head art" "tail art";
  align-content:center;
}
.pf-head{grid-area:head} .pf-tail{grid-area:tail} .pf-art{grid-area:art;align-self:center}
```

`min-content` rows + `align-content:center` are what keep the copy block tight and optically centred against the taller artifact. With `auto` rows the two copy blocks stretch apart and you get a ~110px hole between the lead and the ladder — that regression is exactly what this section is being rebuilt to fix.

**≥1280px only** — the main panel gets `rotateY(-3deg) rotateX(1deg)`, settling to flat on `:hover` over 0.6s `cubic-bezier(.22,1,.36,1)`. Never on touch/portrait, never under `prefers-reduced-motion`. The mockup's value is `-3deg`; the old `.product-tilt` `-7deg` is too much for a panel holding this much type.

**<1180px — one column, order changes**

```css
grid-template-areas:"head" "art" "tail";  /* artifact promoted above the ladder */
```

The artifact is the proof; on a narrow screen it must land before the reader has to scroll past three list items to reach it. Also: ghost panel `display:none`, `perspective:none`, and the floating chip **stops floating** — it becomes a static ruled readout under the panel (`YOU DO · 1 thing / this week ————`), which removes every overlap risk against the ledger rows.

**700–1179px** — the proof ladder becomes a three-up row (`repeat(3,1fr)`, number above label, top rule per column, signal rule on the third). A half-width two-line list in an 820px viewport wastes the right half of the screen.

**<600px**

- Section padding drops to `72px`, gutters to `18px`.
- Bezel, stage row, and ledger all step down: bezel label `9.5px/.16em`, badge `9px`.
- `// Document collection` and the 13 tick marks are **hidden** — at 390px they are noise. `STAGE 06 / 13` and `46%` stay.
- The `Confirm this slot` pseudo-button goes **full width, `min-height:46px`**, with `Takes about 2 minutes` centred beneath it. Every tap target clears 44px per the existing `.card-raised button { min-height: 44px }` precedent in `globals.css`.
- H2 `clamp(1.75rem, 6.2vw, 2.4rem)`, `max-width:16ch`.
- Ladder columns `52px 1fr`, number `1.4rem`.

**≤320px** — must not overflow horizontally. Verify: `document.documentElement.scrollWidth === clientWidth`.

---

## 6. Motion

- **The resolved state is the default.** Every element is visible and correctly positioned with no JS, before any observer fires, and under `prefers-reduced-motion`. Animation may only remove a temporary offset.
- Only three things animate, all `transform`/`opacity`: the track fill scaling in once on mount, the signal head pinging, the next-move reticle pulsing. Nothing else moves.
- Durations 220–420ms for entrances (the track fill is the one exception at 1100ms — it is a readout, not a transition). Easing `cubic-bezier(0.22, 1, 0.36, 1)`.
- Wrap the two copy blocks and the artifact in the existing `<Reveal>` (`delay` 0 / 120 / 200). Do not add a new animation library.
- This section is below the fold and must not affect hero LCP.

---

## 7. Hard constraints — a violation is a failed build

**Legal (from `AGENTS.md` — these can kill the company).**
The words *guarantee, expedite, fast-track, insider, approval rate* appear nowhere. The artifact must never imply we file on a Self-Guided client's behalf or that we represent anyone before the License Division. "We already found a refresher near you" is fine — booking training through the instructor marketplace is a thing we actually do. Do not invent a citation, a statute, or a deadline that is not already in the codebase; `Sep 3` is illustrative sample data inside a mock and must read as such.

**SEO must not regress.** Snapshot before you start and diff after: the full heading outline (H1–H4 text and order), every JSON-LD block, the canonical, `<title>`, meta description, and the set of internal `href`s on `/`. The H2 text is unchanged. The lead paragraph is unchanged. The `/how-it-works` link is **additive** and is the only new internal link. Never move copy into a client component that removes it from server-rendered HTML — this section stays a server component.

**Tokens.** Every colour resolves through `config/brand.ts`. If you need a value that does not exist, add it to **both** palettes. No inline hex anywhere outside `config/brand.ts`.

**Do not touch** `/admin`, `/portal`, `/instructor`, `/auth`, `app/api/**`, `lib/seo.ts`, `next.config.ts`, `content/**`, or any other marketing section. `components/ui/reticle-progress.tsx` is shared with the app surface — **do not edit it**; the artifact draws its own track.

**Rhythm.** `<Ticker />` sits above and `<TheCount />` (`py-24 sm:py-32`) below. This section uses `clamp(104px, 11vw, 168px)`, which is a visibly different quantity at every width. Do not change either neighbour's padding.

**Performance.** No new font families (Geist, Space Grotesk, JetBrains Mono only). No new dependency. Icons come from the `lucide-react` set already in use. Removing `AmbientVideo` from this section should *improve* below-the-fold bytes — confirm it does.

---

## 8. Verification — run it, do not claim it

1. `pnpm lint && pnpm test && pnpm build` all pass.
2. Playwright screenshots of `/` at **1440×900, 1024×800, 820×1180, 390×844, 320×640**, scrolling in 400px steps through this section. Review them yourself.
3. **Overflow:** at every width above, `scrollWidth === clientWidth` on `<html>`.
4. **Squint test:** re-render the 1440 shot at 25% brightness with an 8px gaussian blur. The top and bottom boundaries of this section must still be locatable. If it merges into `<Ticker />` or `<TheCount />`, add the missing second signal.
5. **Ink coverage:** no 400px frame inside this section falls below 12% of pixels differing from the section background by >3%. This is the test that catches the black voids.
6. **Keyboard:** tab through the section. Exactly one stop — the `/how-it-works` link — with a visible `focus-visible` ring. If `Confirm this slot` takes focus, you built it as a `<button>`; fix it.
7. **Reduced motion:** with `prefers-reduced-motion: reduce`, the track is full, nothing pulses, the panel is flat, and every element is in its final position.
8. **Contrast:** sample every text/surface pair in the artifact. Body ≥ 7:1, secondary ≥ 4.5:1.
9. **SEO diff** from §7 is clean, or additive only.
10. Lighthouse mobile on `/`: performance ≥ 90, a11y 100, CLS < 0.05.

---

## 9. Definition of done

- `/` at 1440 matches `mockups/product-feature-v9.html` — layered artifact, cropped ghost panel, brass "next move" field, floating chip over the bottom-right corner, `24 → 13 → 1` ladder.
- At 390 the artifact sits directly under the lead, the chip is a static ruled readout, and the confirm control is full-width and ≥46px tall.
- The section's stage numbers change automatically if `config/stages.ts` changes.
- Nothing in `/portal`, `/admin`, or `/instructor` moved by a pixel.
- The SEO diff is clean, all ten checks in §8 pass, and you post before/after screenshots at 1440 and 390 in the commit body.

---

## 10. How to work

Do Phase 1 completely and show me the tokens + utilities rendering before you build the components. Then Phase 2, then Phase 3. After each phase post: what changed, before/after screenshots at 1440 and 390, and the output of the checks in §8. If a rule here fights the brand or the content, say so and propose the alternative — do not silently deviate.
