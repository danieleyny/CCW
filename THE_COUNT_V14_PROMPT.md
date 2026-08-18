# THE COUNT V14 — catch, replace, clear

**Paste this whole file to Claude Code from the repo root.** Scope is one homepage section: `<TheCount />`.

**This supersedes `THE_COUNT_V13_PROMPT.md`.** Delete it. V13 had the lifecycle right but the verdicts were unreadably brief — this revision is about **timing**. Everything else carries over unchanged.

Approved mockup: `mockups/the-count-v14.html` — open it and give it a full minute. Watch ledger row 11 go red → replaced → green. Mockup wins on visuals, this document wins on repo mechanics.

Sibling prompt: `PRODUCT_FEATURE_V9_PROMPT.md`.

---

## 0. Context you must load before writing any code

- `AGENTS.md` — repo conventions and the legal guardrails. **§6 assumes you have read them.**
- `config/brand.ts` — the only source of colour, specifically `paletteLight` + `brandCss()` (§3.1).
- `app/globals.css` — the `@theme inline` mapping and the `.the-count .count-card` block this retires.
- `components/marketing/showcase/the-count.tsx` — the section being replaced.
- `components/marketing/showcase/case-file-showcase.tsx` — read the `ROWS` const; the verdict split is deliberately consistent with it.
- `components/marketing/showcase/case-animation.tsx` — already solves pause-offscreen / pause-on-hidden-tab here.
- `components/ui/reticle-progress.tsx` — the crosshair language. **Do not edit**; shared with the app surface.

Then `pnpm dev` and **watch the section for two full minutes**. A lifecycle that takes 40 seconds to complete cannot be verified from a screenshot, and the interesting failures only appear on the second lap.

---

## 1. Two bugs this fixes first

V12 had sheets randomly flying back in from off-grid during the loop. The cause is a **cascade fight**, and it is worth understanding before you write anything:

- the entrance rule is `.doc-wall[data-play="true"] .doc-cell { animation: doc-deal … }`
- the idle breath is `[data-live="true"] .doc-cell[data-breathe="1"]:not([data-audit="true"]) { animation: breathe … }` — higher specificity, so it wins for those cells
- `data-play` was never removed after the entrance

So the moment the reticle landed on a breathing cell, `:not([data-audit])` stopped matching, the deal rule won the cascade back, and **the cell replayed its 0.6s fly-in from the pile.**

**Fix: remove `data-play` from the wall as soon as the entrance completes.** The resolved drawing is the base CSS, so nothing is lost. Do not solve this by raising specificity — an entrance animation still in the cascade after the entrance is a landmine.

The second bug is timing, and it is covered in §4.2: **a verdict was visible for 430ms and blinked off rather than fading.** Both the numbers and the CSS structure that caused it have changed.

---

## 2. The concept

The left column is a **desk of twenty-four paper documents**, 6 × 4 (4 × 6 on a phone). **One** reticle walks it on a serpentine path, ~1.45s a stop, ~35s a lap.

### 2.1 The lifecycle — this is the whole revision

Each document is in one of five states. The loop is not a status board re-confirming itself; it is the **service, animated**:

| State | On scan | After the reticle moves on |
|---|---|---|
| `ok` | stamps **SATISFIED** | the stamp **holds ~900ms past the head leaving**, then fades over 550ms |
| `wait` / `fix` / `exp` | stamps **CHASING / NEEDS A FIX / EXPIRED** | **the stamp stays**, settled to ~50% |
| `fresh` | stamps **SATISFIED** → becomes `ok` | holds and fades, **and its ledger row turns green** |

A flagged sheet sits on the desk for **~3.4s**, then:

1. it **lifts, rotates and fades out** over the desk (440ms, above its neighbours),
2. the cell **holds a dashed empty slot** so the swap never reads as a document vanishing,
3. a **fresh sheet drops in and draws itself** (500ms + rules/marks inking in), state `fresh` — brass edge, no glyph, "arrived, not yet checked".

When the reticle next reaches it — up to a lap later — it clears.

**Resolving one problem raises a new flag elsewhere**, 5–8s later, on whichever *satisfied* sheet is **furthest from the reticle** so you catch it peripherally. The bucket is whichever is furthest below target (`wait 3, fix 3, exp 1`), which pins the mix near **17 / 3 / 3 / 1** while letting the tallies breathe.

### 2.2 One reticle, not two

V12 ran two heads. **Go back to one.** With this much choreography a second head competing for attention makes the story unreadable — a viewer has to be able to follow a single document from flag to replacement to clearance. Step time is `1450ms`, which keeps a lap around 35 seconds.

### 2.3 The four verdicts, and their words

`SATISFIED` (`--ok`, 17) · `CHASING` (`--signal`, 3) · `NEEDS A FIX` (`--warn`, 3) · `EXPIRED` (`--danger`, 1).

All four are already in this codebase: `satisfied` is the `case_requirements.status` value, "needs a fix" is verbatim ProductFeature copy, "chase" is in this section's own lead, and training expiry is what `lib/reminders/engine.ts` enforces. Seventeen satisfied is the number the ProductFeature card shows, and **document 11 — the expired one — is the 18-hour safety course**, the same certificate that card warns is aging out. The two sections describe one case.

Each verdict keeps its own beat: satisfied stamps clean; chasing sends **two** ping rings; needs-a-fix **flashes twice and shakes the sheet**; expired stamps down from 2.4× and **keeps pulsing**. Do not collapse these into one animation — the variety is what stops the loop feeling like a metronome.

### 2.4 On "rejected" — read before you reach for it

An earlier brief asked for a red **REJECTED** stamp. **Do not build it.** We reject nothing, and only the NYPD decides outcomes; REJECTED on a document reads as an outcome prediction, exactly what `AGENTS.md` forbids. `EXPIRED` gives the red, the cross and the stakes, and is factually what the training-decay rule models.

**The paper must be actual paper** — the light palette from `config/brand.ts` verbatim, via a `.paper` scope. Only place on the site the warm-paper theme appears; it is why the section reads as documents rather than another dark UI panel.

---

## 3. Phase 1 — tokens and utilities

### 3.1 `config/brand.ts`

```ts
export function brandCss(): string {
  const light = varsFrom({ ...paletteLight, ...shadcnFor(paletteLight, paletteLight["surface-1"]) })
  const dark  = varsFrom({ ...paletteDark,  ...shadcnFor(paletteDark, "#0A0C10") })
  // `.paper` re-declares the LIGHT palette on itself, so a subtree inside a
  // `.dark` shell renders as warm paper with no hardcoded colour anywhere.
  return `:root{${light}--app-bg-dark:${paletteDark.bg};} .dark{${dark}} .paper{${light}}`
}
```

**No new hex.** Confirm `/portal`, `/admin`, `/instructor` are untouched.

### 3.2 `app/globals.css`

**Delete** `.the-count .count-card` and its reduced-motion companion. Take the rest from the mockup verbatim, swapping literals for tokens. The things that are easy to get wrong:

**Two elements per document.** `.doc-cell` (grid item — carries the lift/rotate/stagger transform and the swap z-index) and `.doc-sheet` inside it (the paper — carries the shake and the swap animation). They cannot be one element: the needs-a-fix shake, the audit lift and the swap-out are all transforms and would clobber each other.

**Gap and column count are tokens**, because the reticle derives its cell size from the same expression:

```css
:root { --doc-gap: clamp(7px,.85vw,11px); --doc-cols: 6; }
@media (max-width: 600px) { :root { --doc-gap: 7px; --doc-cols: 4; } }

.doc-audit {
  width: calc((100% - (var(--doc-cols) - 1) * var(--doc-gap)) / var(--doc-cols));
  aspect-ratio: 3 / 4;
  transform: translate(calc(var(--c,0) * (100% + var(--doc-gap))),
                       calc(var(--r2,0) * (100% + var(--doc-gap))))
             scale(var(--as, 1.045));
}
```

Translate percentages resolve against the reticle's own box, which *is* one cell — square at any width, any column count, no measurement, no resize listener. **If the brackets drift, the CSS and the grid disagree about the gap or the column count.**

**`--vedge` for `ok` is `transparent` on purpose.** Satisfied is the boring default; seventeen green rings make the desk read as a green grid with nowhere for the eye to go. Only the seven problem documents get an edge, and their corner glyph is stronger (`.9` vs `.42`).

**Base the verdict children in their FINAL transforms and let opacity do the showing.**
This is the single most important structural rule in the block, and getting it backwards
is why an earlier build blinked instead of faded:

```css
/* An animation with `both` only holds its end state WHILE THE RULE APPLIES. If the
   entrance animations ARE the visible state, then the moment `data-stage` changes or is
   removed, the wash / glyph / label snap back to scale(0) — and no opacity transition can
   fade something that has already collapsed. So: base them shown, hide with opacity. */
.doc-wash  { transform: scaleY(1); transform-origin: bottom; transition: opacity .4s ease; }
.doc-glyph { transform: translate(-50%,-50%) scale(1); }
.doc-label { transform: scaleY(1); transform-origin: bottom; }
.doc-verdict { opacity: 0; transition: opacity .55s ease; }          /* the only switch */
.doc-cell[data-stage="verdict"] .doc-verdict,
.doc-cell[data-stage="flagged"] .doc-verdict { opacity: 1; }
/* the flagged rest state now only has to settle the wash back */
.doc-cell[data-stage="flagged"] .doc-wash  { opacity: .5; }
.doc-cell[data-stage="flagged"] .doc-glyph { opacity: .9; }
.doc-cell[data-stage="flagged"] .doc-ring  { opacity: 0; }
```

The `@keyframes` under `[data-stage="verdict"]` then only add the flourish — they start
from `scale(0)` via `both` and land on the base state, so removing the attribute leaves
everything in place to fade.

**The swap, and the slot that is held open:**

```css
.doc-cell::before { content:""; position:absolute; inset:0; border-radius:4px;
  border:1px dashed var(--hairline-strong); opacity:0; transition:opacity .22s ease; }
.doc-cell[data-swap]::before { opacity: 1; }
.doc-cell[data-swap="out"] { z-index: 8; }   /* lifts above its neighbours */
.doc-cell[data-swap="in"]  { z-index: 7; }

@keyframes doc-out { 0%{opacity:1;transform:translate(0,0) rotate(0) scale(1)}
  35%{transform:translate(2%,-6%) rotate(2deg) scale(1.02)}
  100%{opacity:0;transform:translate(-16%,-30%) rotate(-13deg) scale(.88)} }
@keyframes doc-in  { 0%{opacity:0;transform:translateY(-18%) rotate(3deg) scale(.9)}
  55%{opacity:1} 100%{opacity:1;transform:none} }
```

The incoming sheet re-runs the rule and mark draw-ins (`doc-rule`, `doc-ink`) on a short delay, so a replacement visibly *draws itself*.

**Reduced motion** kills every animation and transition, hides the reticle, forces `.doc-verdict { opacity: 0 }`, and pins any mid-swap sheet to `opacity:1; transform:none` so nothing is left invisible.

---

## 4. Phase 2 — the component

Rewrite `components/marketing/showcase/the-count.tsx`. Keep the exported name **`TheCount`**. Stays `"use client"`.

### 4.1 The model

```ts
type Verdict = "ok" | "wait" | "fix" | "exp"
type State   = Verdict | "fresh"

/** `state` is what the sheet shows. `bucket` is what it counts as in the
 *  tallies — a replacement keeps its old bucket until it has actually been
 *  checked, so "17 satisfied" never counts a document we have not seen. */
type Doc = { i: number; state: State; bucket: Verdict }
```

Seed: `{4,13,18} → wait`, `{8,16,21} → fix`, `{10} → exp`, rest `ok`. Named cells `{2,6,10,13,21}` carry the five ledger labels; badge shows `i + 1`.

Marks: `markFor(i) = (i + Math.floor(i/6)) % 6` — **the row offset is load-bearing**; `i % 6` alone makes the mark equal the column and the desk renders as six identical stripes. Every SVG stroke carries `pathLength="1"`. Take the **fingerprint verbatim from the mockup** — three shallow arcs read as a wifi icon.

Build the 24 cells **once at module scope**. The loop re-renders this component roughly every 1.25s.

### 4.2 The scheduler

One `setTimeout` chain, plus **per-document timers** for the delayed replacement and the delayed re-flag. Both must be tracked and cleared:

```
STEP       = 1450   // per stop
MOVE       =  360   // reticle travel
VERDICT_AT =  960   // stamp lands — AFTER the 560ms scan finishes, not during it
HOLD_OK    =  900   // a satisfied stamp holds past the head leaving, then fades
SETTLE     = 3400   // a flag sits on the desk before the swap
```

**A verdict must be legible, and 430ms is not legible.** The earlier build landed the
stamp at 820ms into a 1250ms stop and wiped it the instant the head moved on — its own
entrance animation only finished at ~440ms, so it was being erased as it arrived. The
numbers above give **~1.6s of visible verdict**: it lands after the scan completes, the
sheet settles back down but keeps the stamp while the head moves two cells away, and
then it fades over 550ms. If you shorten `STEP`, shorten the lap some other way — do not
claw it back out of `HOLD_OK`.

Per stop: set `--c`/`--r2`/`--as` → at `MOVE` set `data-audit`, restart the scan, 110ms later set `data-read` (the rules light brass in sequence) → at `VERDICT_AT` clear `data-read`, set `data-stage="verdict"`, and if the state is `fresh` promote it to `ok` and schedule a new flag → at `STEP` clear the ledger highlight; if `ok` schedule `data-stage` removal `HOLD_OK` later (**do not remove it now** — that is what made the stamp blink), otherwise set `data-stage="flagged"` and schedule the replacement; advance.

`--as` must match what the cell scales to (`1.12` named, `1.045` plain) or the brackets sit inside the sheet.

**Restart the scan line by remounting it on a `key`**, not with a `void el.offsetWidth` reflow.

**Pause** — IntersectionObserver at `threshold: 0.12` plus `visibilitychange`, matching `case-animation.tsx`. On pause: clear the step chain **and every per-document timer**, strip `data-audit` / `data-read` / `data-swap` / `data-flagging`, and drop `data-stage` only where it is `"verdict"` — a `"flagged"` sheet is a standing state and must survive. **On resume, re-arm the replacement for anything still flagged**, or it will sit flagged forever.

### 4.3 Choosing the next flag

```ts
// Replace the flag in whichever bucket is furthest below target, so the mix
// stays pinned near 17/3/3/1 instead of drifting green over a few laps.
const TARGET = { wait: 3, fix: 3, exp: 1 }
// Land it on the satisfied sheet furthest from the reticle, so the new flag is
// caught in the corner of the eye rather than under the head.
```

### 4.4 The ledger and the tallies

Both are **derived from the live model**, not from a second copy. Each row carries a permanent status dot in its document's bucket colour; `exp` and `wait` dots pulse on a 2.8s cycle. A row lights while the reticle is on its index. **Row 11 going red → replaced → green is the single most valuable thing in this section** — verify it explicitly.

The four tallies recompute from `bucket` on every state change. The status strip is `aria-hidden`; before the loop starts and under reduced motion it reads `24 / 24 · DOCUMENTS TRACKED`.

### 4.5 Pointer parallax — never in React state

Write `--px` / `--py` straight to the wall node inside a `requestAnimationFrame`, guarded by `(hover: hover)` and `prefers-reduced-motion`. 60fps pointer position through component state would re-render 24 cells per mouse move.

### 4.6 Accessibility

The sheets carry no text, so `role="img"` with a descriptive `aria-label` on the wall is correct here — and the label must mention the verdict split, since colour carries information. (Contrast with the ProductFeature artifact, whose panel carries real text and must **not** use `role="img"`.) Reticle, lamp, chips, edges, slot and strip are `aria-hidden`. **One tab stop in the whole section: the `/how-it-works` link.** No click handler on the desk in production.

Verdict is never carried by colour alone — every state has a distinct glyph (check / spinner / exclamation / cross) and a word in the label band.

### 4.7 The one copy change — needs sign-off

H2 unchanged, five labels unchanged. Lead currently repeats the H2 verbatim; proposed:

> Only some of them are yours to write. **Four come from people who know you**, one from your instructor, others from a court or an agency. We hold, track, and chase every one — so you never have to keep the list in your head.

**Do not ship until approved.** If rejected, keep the original verbatim and build everything else.

---

## 5. Phase 3 — responsive

**≥1180px** two columns, art LEFT: `grid-template-columns: minmax(0,1.08fr) minmax(0,.92fr)`, areas `"art head" "art tail"`, `min-content` rows, `align-content:center`.
**<1180px** one column, `"head" "art" "tail"` so the desk sits above the ledger; tilt eases to `-1deg`; drop `perspective`; wrapper capped at 660px between 700–1179.
**≤820px** `We track every one.` becomes `display:block`.
**<600px** **four columns, not six** — 24 sheets at six columns is 54px each, too small to carry a wash, a glyph and a label; four columns gives ~84px without lying about the count. `ORDER` and the entrance deal offsets both depend on the column count and must be rebuilt on the breakpoint change.
**≤320px** no horizontal overflow.

---

## 6. Hard constraints

**Legal.** No *guarantee / expedite / fast-track / insider / approval rate*, and **no REJECTED / DENIED / APPROVED anywhere** (§2.4). `CHECKING` and `SATISFIED` describe a document checklist, which is what `lib/qa-gate.ts` does — do not escalate to language implying legal review or an outcome. The provenance column must never imply we obtain, produce or file third-party documents on a client's behalf. No statutes on the five items; the citation-grade list lives on `/how-it-works`, which is what the CTA points at.

**SEO.** Snapshot and diff `/`: heading outline, JSON-LD, canonical, title, meta description, internal `href`s. H2 unchanged; five labels unchanged. H2, lead and all five labels must remain in the server-rendered HTML.

**Tokens.** Every colour through `config/brand.ts`. Paper via `.paper` + `paletteLight`. No inline hex.

**Do not touch** `/admin`, `/portal`, `/instructor`, `/auth`, `app/api/**`, `lib/seo.ts`, `content/**`, `components/ui/reticle-progress.tsx`, or any other marketing section.

**Rhythm.** `ProductFeature` uses `clamp(104px,11vw,168px)`; this uses `clamp(88px,9.5vw,140px)`.

**Performance — it runs forever.**
- At most **one** cell scanning at a time, plus at most one mid-swap.
- Always-on animations are capped: 1 expired pulse, ~3 chasing chips, 8 breathing cells, 1 lamp. Do not extend the breath to all 24.
- No `will-change` on the cells. Pointer position never in React state. Cells built once.
- **Every timer is tracked and cleared** — the step chain, each document's replacement timer, each re-flag timer. A leaked timer here fires forever on a page the user has scrolled past.
- The loop is **stopped**, not merely hidden, off-screen and on a hidden tab.
- Everything animated is `transform`, `opacity`, `filter` or `stroke-dashoffset`. No images, no new dependency, no new font, no animation library. CLS < 0.05.

---

## 7. Verification — run it, do not claim it

1. `pnpm lint && pnpm test && pnpm build` pass.
2. **Watch two full laps (~60s)** at 1440. No sheet ever re-flies in from off-grid — if one does, `data-play` is still on the wall (§1).
3. **Follow one document end to end.** Pick the expired one (11): it stamps EXPIRED, the reticle leaves, **the flag stays ~3.4s**, the sheet lifts away, the slot shows a dashed outline, a fresh sheet draws itself in, and a lap later it clears to SATISFIED **and ledger row 11 turns green.**
4. **Time a satisfied stamp.** From first visible to fully faded it must be **≥1.5s**, and it must *fade*, not blink. If it disappears the instant the head moves on, `HOLD_OK` is missing or the verdict children are still based at `scale(0)` (§3.2).
10. **The four beats are visibly different** — satisfied clean, chasing double-ping, needs-a-fix shakes and double-flashes, expired hard stamp plus lasting pulse.
5. **The desk does not go all-green.** After three laps the tallies are still roughly 17 / 3 / 3 / 1, and new flags are appearing away from the reticle.
6. **Brackets land square** at 1440, 820 and 390, including across the 600px column-count switch. **No stripes.** **The fingerprint reads as a fingerprint.**
7. **Satisfied sheets are the quietest thing on the desk.** If it reads as a green grid, `--vedge` for `ok` is not `transparent`.
8. **Performance profile.** 60s in DevTools: no layout thrash, no long tasks, GPU memory flat, CPU near idle between stops. Scroll off-screen → activity drops to zero. Hide the tab → same. Return → the loop resumes and **anything still flagged gets replaced** rather than sitting forever.
9. **The hole test.** JS disabled, and `prefers-reduced-motion: reduce`: fully drawn static desk, no reticle, nothing mid-stamp, nothing invisible mid-swap.
10. **Overflow** `scrollWidth === clientWidth` at 1440 / 1024 / 820 / 390 / 320. **Keyboard:** one tab stop. **SEO diff** clean or additive. Lighthouse mobile: performance ≥ 90, a11y 100, CLS < 0.05.

---

## 8. Definition of done

- No sheet ever re-flies in from off-grid.
- A flagged document keeps its stamp, is replaced on the desk, and clears on the next pass — with its ledger row turning green.
- Clearing a problem raises a new one elsewhere; the mix holds near 17 / 3 / 3 / 1 across many laps.
- One reticle. The four verdicts are four different events.
- Six columns on desktop, four on a phone, brackets square across the switch.
- The loop stops dead off-screen and on a hidden tab, resumes cleanly, and leaks no timers.
- Under `prefers-reduced-motion` the section is a still, fully-drawn desk with verdicts as persistent edges and glyphs.
- REJECTED / DENIED / APPROVED appear nowhere.
- `.paper` is the only mechanism producing the light surface; no hex hardcoded.
- The lead-paragraph change is approved and shipped, or not shipped and the original kept verbatim.
- `THE_COUNT_V13_PROMPT.md` is deleted. `/portal`, `/admin`, `/instructor` unchanged. All ten checks in §7 pass, with a screen recording of **two** full laps in the PR.

---

## 9. How to work

Build in this order and show me each: **(1)** `.paper` and one sheet rendering as paper inside the dark shell; **(2)** the static 24-sheet desk with its persistent edges and glyphs — *this must look right at rest before anything moves*; **(3)** one reticle, the scan, and the four verdicts; **(4)** the flagged-stays behaviour; **(5)** the swap and the held-open slot; **(6)** fresh → clear, with the ledger; **(7)** re-flagging; **(8)** entrance, lamp, parallax. Motion last, always. After each step post what changed, screenshots at 1440 and 390, and the check output. If a rule here fights the brand or the content, say so and propose the alternative rather than silently deviating.
