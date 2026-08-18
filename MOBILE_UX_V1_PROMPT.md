# Gun License NYC — MOBILE V1: the applicant's phone is the product surface
### One Claude Code prompt. Six parts — do them in order; each ends green.

**The premise:** most applicants will do this entire flow on a phone. Today the portal is a
desktop layout that survives at 390px rather than one designed for it. This prompt fixes the
five surfaces that matter — **account creation → intake → the disclosures step → the checklist →
the prepared forms** — and establishes a mobile rhythm the rest of the app inherits.

**Reference mockup:** `mockups/mobile-v1.html` — before/after phones at 390×844 built with the real
`paletteDark` tokens. Open it in a browser before you start. It is the visual target, not a
pixel-contract: match the *structure, rhythm and state language*, then build with the real
components. The panels labelled "Before — today's build" are a hand-written reproduction of the
current code for comparison; they are not a spec for anything. Where the mockup and this document
disagree, **this document wins**.

**How to work:** read this whole file first, then `AGENTS.md`, then the mockup. Do the parts in
order. Do not start a part until the previous one's verify block passes. Report back after each
part with the verify results and a 390px screenshot rather than running all six and presenting a
wall of diff at the end.

---

## Global guardrails (AGENTS.md — hold the line)

- **Compliance unchanged.** No *guarantee / expedite / fast-track / insider / approval rate*
  anywhere in new copy. The standing disclaimer from `config/brand.ts` stays visible at account
  creation (it may be behind a `<details>`, but it must be on the page and reachable without JS).
  We never file on the applicant's behalf; every next-step CTA keeps that framing.
- **Candor-maximizing, never disclosure-minimizing.** Nothing in the disclosures redesign may make
  "No" easier, faster or more default than "Yes". Unanswered stays unanswered — do **not**
  pre-seed answers. The `eligibilityGate` / attorney-review path is untouched.
- **No legal advice.** New microcopy explains *what the form asks*, never *what to answer*.
- **Design system: extend, never replace.** Colors come only from `paletteDark` in
  `config/brand.ts` via the `app/globals.css` tokens. No new hex values, no new font families.
  New utilities go in `app/globals.css` next to `.card-raised` / `.icon-tile` / `.glow-*`, in the
  same commented house style.
- **Motion respects `prefers-reduced-motion`** — every transition you add gets a reduce block, the
  way `.card-raised` already does.
- **Next.js 16 rules** (`AGENTS.md`): `proxy.ts` not `middleware.ts`; `params`/`searchParams`/
  `cookies` are async. Read `node_modules/next/dist/docs/` before reaching for anything you
  half-remember.
- **No behavior changes.** This is a presentation-layer upgrade. Zod schemas, server actions, the
  requirements engine, the CP-5 QA gate, RLS and the privacy firewall are all untouched. If you
  find yourself editing `lib/intake/schema.ts` or `lib/requirements/*`, stop — you've gone
  off-scope.
- `pnpm build` + `pnpm test` + the `scripts/verify-*.ts` harnesses pass after **each** part.
- **Test at 390×844 and 360×740** (iPhone 14/15 and a small Android) with the on-screen keyboard
  open, plus 768px and 1280px to confirm nothing desktop regressed.

---

# PART 0 — The mobile rhythm (do this first; everything else depends on it)

Today's portal has no shared mobile scale. `text-xs` (12px) carries body copy, tap targets range
from 36px to 44px, and vertical gaps are chosen per-component. Establish the scale once.

### 0A — Rhythm tokens in `app/globals.css`
```
Add to the token block, with a comment explaining each (house style — every token earns its line):

  --tap: 48px;        /* minimum comfortable tap target on a phone. 44px is Apple's floor;
                         48px is the floor that still feels good with a thumb in motion. */
  --gutter: 16px;     /* the phone page gutter. Matches the existing px-4 on the portal shell. */
  --stack: 12px;      /* gap between sibling cards inside one list */
  --stack-lg: 20px;   /* gap between SECTIONS — must be visibly larger than --stack */

Do NOT redefine --radius or any color. These are spacing/ergonomics only.
```

### 0B — A mobile type floor
```
Rule, applied everywhere you touch in this prompt:
  • Body / descriptive copy: never below 13px on mobile. Today's `text-xs` (12px) descriptions
    become `text-[13px] sm:text-xs`.
  • Question and item text: 14.5–15px with line-height ~1.5 and `text-wrap: pretty`.
  • Form inputs stay at 16px on mobile (components/ui/input.tsx and textarea.tsx already do
    `text-base md:text-sm` — KEEP that; it is what stops iOS zooming on focus). Any bespoke
    <select> or <input> written inline must match it — see 0C.
  • .engraved (11px / 0.22em) is a machined micro-label and stays for section eyebrows, but it is
    NOT a section header on a phone. Add a sibling utility:

      .engraved-sm { font-family: var(--font-mono); text-transform: uppercase;
                     letter-spacing: 0.18em; font-size: 0.65rem; color: var(--text-mid); }

    …and use the section-header ROW pattern (mono label + fading rule + count) that
    requirements-checklist.tsx already uses for categories. Lift that markup into a small shared
    component — components/portal/section-header.tsx — and use it in the intake wizard too, so
    the two screens stop inventing their own section treatment.
```

### 0C — Sweep the sub-48px targets
```
Grep for the offenders and lift them to var(--tap) on mobile (they may stay smaller at sm:+):
  • components/portal/requirements-checklist.tsx — filter chips are min-h-[36px]
  • components/portal/document-uploader.tsx — the "What is this document?" <select> is h-10,
    and it's a raw inline <input>/<select>, so it also needs text-base to avoid iOS zoom
  • components/portal/questionnaire-dialog.tsx — the inline <select> at h-11 and the date inputs
  • Any `size="sm"` Button that is the PRIMARY action of a card

The existing `@media (max-width: 480px) { .card-raised button { min-height: 44px } }` in
globals.css is a blunt patch that catches some of these by accident — raise it to var(--tap) and
keep it as the safety net, but fix the components properly rather than relying on it.
```

**PART 0 verify**
```
- No interactive element inside app/portal is under 48px tall at 390px (audit by hand + a quick
  Playwright pass if a harness exists).
- No text below 13px except: .engraved-sm eyebrows, the req_code footnote, and legal fine print.
- Focusing any input on iOS Safari does not zoom the viewport.
- pnpm build && pnpm test pass; desktop (1280px) is visually unchanged.
```

---

# PART 1 — The portal shell: 5 tabs, one bottom edge, safe areas

**Today (verified):**
- `components/portal/portal-nav.tsx` — `NAV` has **7 entries** (Home, Checklist, Documents,
  People, Messages, License, Appeal). At 390px that's ~55px per tab; "Documents" and "Messages"
  truncate. `PortalBottomNav` rows are `min-h-[3.25rem]` (52px).
- `app/portal/layout.tsx` — `<main>` is `pb-24 md:pb-8` **and** the footer is `pb-24 md:pb-6`, so
  the bottom padding is applied twice. The header has no `env(safe-area-inset-top)`.

### 1A — Five primaries + a More sheet
```
Restructure PortalBottomNav (components/portal/portal-nav.tsx):

PRIMARY (always in the bar, in this order):
  Home · Checklist · Documents · People · More

MORE (a bottom sheet, opened by the 5th tab — use components/ui/sheet.tsx, side="bottom"):
  Messages · Prepared forms (/portal/forms) · Payments · Your license · Appeal ·
  Profile & your data
  Each row: 56px tall, a 38px icon tile, a title, and a status line under it
  ("1 unread from your case team", "Available after issuance", "Only if your application is
  denied"). Rows for stages the applicant hasn't reached render muted but ARE tappable —
  we don't hide the map, we just show where they are on it.

Bar chrome:
  • 60px tall + env(safe-area-inset-bottom), glass-bar background (already opaque — good).
  • Active tab: brass-bright text, a 34×26 rounded tile behind the icon filled with
    color-mix(in oklab, var(--brass) 14%, transparent), and a 22px brass nub on the top edge.
    (Today's active state is signal-colored; brass is the "you are here" color in this system and
    signal is reserved for "needs your attention" — make that consistent.)
  • Unread counts render as a small signal pill on the tab (People, and on More when anything
    inside it is unread). Derive the count from the same source NotificationBell uses.
  • PortalTopNav (desktop, md:+) keeps ALL SEVEN destinations — the More grouping is a phone
    affordance, not an information-architecture cut. Add /portal/forms and /portal/payments to
    the desktop row if they aren't there.

Accessibility: the bar is <nav aria-label="Primary">; the active tab carries aria-current="page";
More is a real button with aria-expanded; the sheet traps focus and closes on Escape.
```

### 1B — Fix the shell's bottom edge and safe areas
```
app/portal/layout.tsx:
  • Delete the duplicated pb-24. Give <main> a single bottom pad expressed as a CSS var so pages
    that add a sticky action bar can extend it:
        --shell-bottom: calc(60px + env(safe-area-inset-bottom));   /* the tab bar */
    <main> gets padding-bottom: calc(var(--shell-bottom) + 24px) on mobile, md:pb-8 as today.
  • The footer (Profile / Your data links) is now duplicated by the More sheet — drop it on
    mobile (hidden md:flex) and keep it on desktop.
  • Header: add padding-top: env(safe-area-inset-top) and keep the h-16; on mobile drop to h-14
    to buy back 8px above the fold.
  • The header wordmark already has the never-wrap fix — keep it.
```

**PART 1 verify**
```
- At 390px and 360px no tab label truncates or wraps; every tab is ≥60px tall and ≥64px wide.
- The More sheet opens, is keyboard-navigable, closes on Escape and on backdrop tap, and every
  destination previously in the bar is reachable in ≤2 taps.
- On a notched device simulation, nothing sits under the home indicator or the status bar.
- No page has 96px of dead space at the bottom (the double-pb bug is gone).
- Desktop nav at 1280px still shows every destination in the top row.
```

---

# PART 2 — Intake: a sticky step header and a sticky action bar

**Today (verified):** `StepRail` (`components/portal/intake/intake-wizard.tsx` ~line 428) renders
the six `INTAKE_STEPS` as `flex flex-wrap gap-1.5 text-xs` chips with full labels
("3. Household & safeguard"). At 390px they wrap to **three ragged rows** and consume ~110px
before any content. Back/Next sit in a plain `flex justify-between` at the very bottom of the step
— on step 4 that's roughly 2,400px down the scroll.

### 2A — StepRail becomes a responsive step header
```
Split StepRail into two presentations of the same data (INTAKE_STEPS from lib/intake/answers.ts —
do not change that array):

MOBILE (< sm): a sticky header that docks under the portal app bar.
  ┌────────────────────────────────────────────┐
  │ STEP 4 OF 6                    [All steps ⌄]│   .engraved-sm, brass
  │ Disclosures                                 │   font-display, 17px, 600
  │ ▬▬▬ ▬▬▬ ▬▬▬ ━━━ ░░░ ░░░                    │   6 segments, 3px, gap 4px
  └────────────────────────────────────────────┘
  • Segments: completed = brass at 62%, current = signal with a soft glow, future = --hairline.
  • position: sticky; top: <app bar height>; background: var(--surface-2); border-bottom hairline.
    z-index below the app bar, above content.
  • "All steps" opens a bottom sheet listing all six with full labels, completion state, and —
    for the current step — a live sub-status ("3 of 13 answered"). Tapping a COMPLETED step
    navigates back to it; future steps are listed but not tappable (the wizard validates forward).
  • Total height ≤ 84px. That is the budget; it replaces 110px of wrapping chips.

DESKTOP (sm:+): keep today's labeled chip rail — it works at that width. Same colors.

Accessibility: the whole thing stays an <ol aria-label="Intake progress"> with
aria-current="step"; the mobile segments are aria-hidden decoration and the "Step 4 of 6 ·
Disclosures" text carries the meaning.
```

### 2B — A sticky action bar
```
Move the Back / Next / "Generate my requirements" row out of the document flow into a sticky
footer bar on mobile:

  • Layout: [← 52px square ghost] [ Next: Carry & history →  flex-1, 52px, brass primary ]
    The Next label NAMES the next step — momentum, and it tells someone how much is left.
    On step 6 it becomes the full-width "Generate my requirements" button.
  • Implementation: `position: sticky; bottom: 0` INSIDE the scrolling page (not `fixed`) — sticky
    behaves correctly when the iOS keyboard opens, fixed gets shoved. Background var(--surface-2),
    top hairline, padding-bottom: env(safe-area-inset-bottom).
  • Hide PortalBottomNav on /portal/intake. Intake is a focused task flow and the soft intake gate
    (lib/portal/intake-gate.ts) already keeps a new applicant there — two stacked bars at the
    bottom of a phone is one too many. Add an `intake` variant to the portal layout, or render the
    nav conditionally on pathname. Keep an obvious "Save & exit" affordance in the app bar so
    nobody feels trapped — answers already save per step.

  • The `stepErrors` block becomes a compact pill docked ABOVE the action bar:
        ⚠ 10 questions still unanswered            JUMP →
    Tapping it runs the existing scroll-to-first-error logic. Keep the full list available — put
    it in a collapsible under the pill, or expand the pill on tap. Do NOT silently drop the detail;
    the current list is `role="alert"` and must stay announced.
  • CRITICAL: the wizard's scroll-to-first-error (`document.querySelector("[data-intake-invalid]")`
    + scrollIntoView({block:"center"})) must still land the field in view. Add
    `scroll-margin-top: calc(<app bar> + <step header> + 12px)` to any element carrying
    data-intake-invalid so the sticky header never covers the field it just jumped to.
```

**PART 2 verify**
```
- At 390px the step header is ≤84px, never wraps, and stays visible while scrolling step 4.
- Back/Next are reachable without scrolling on every step, at 390×844 with the keyboard open.
- Submitting an invalid step scrolls the first bad field into view, fully clear of the sticky
  header, and focuses it; the error list is still announced to a screen reader.
- The intake route has exactly one bottom bar; "Save & exit" returns to /portal with progress kept.
- sm:+ still shows the labeled six-chip rail. Desktop step navigation is unchanged.
```

---

# PART 3 — The disclosures step (the one that prompted this)

**Today (verified):** `StepDisclosures` (~line 860). Thirteen `QUESTIONNAIRE` items (Q10–Q22 from
`lib/intake/answers.ts`) render as `rounded-md border border-hairline p-2.5 text-sm` inside a
`space-y-2` stack. `--hairline` is `rgba(255,255,255,0.08)`; a 1px 8%-white border with 10px
padding and 8px gaps is not enough separation at 390px — the thirteen rows read as one grey mass.
Arrest entries use `grid gap-2 sm:grid-cols-3`, so on mobile they're three placeholder-only
inputs with no labels. **This is the screen the client called out. Get it right.**

### 3A — The candor callout
```
The intro paragraph is doing legal work — give it the weight. Replace the bare <h2> + <p> with a
brass-edged callout (reuse the .brass-edge treatment already in globals.css):

  ┌ 🛡  Tell us everything ───────────────────────┐
  │ Disclose EVERY matter — even sealed or        │
  │ dismissed. An item we didn't disclose that    │
  │ turns up in the background check is far more  │
  │ damaging than the event itself.               │
  └───────────────────────────────────────────────┘

Shield icon (lucide ShieldAlert or Shield), brass stroke. Copy stays candor-maximizing — tighten
it, never soften it. Keep "Every yes needs a written explanation before filing" — but move it to
where it's actionable (3C reveals the field inline, so say it there).
```

### 3B — Arrests & summonses
```
Section header row (the shared SectionHeader from 0B): "Arrests & summonses" · fading rule · count.

Each entry becomes a card (surface-2 → surface-1 gradient, 1px hairline, 14px radius, the same
inset-highlight + soft shadow recipe as .card-raised — factor a lighter `.card-soft` utility in
globals.css rather than copy-pasting the shadow):

  MATTER 1                                    🗑 Remove
  ─────────────────────────────────────────────────────
  Date it happened          [ 2018-04-22            ]
  Court or jurisdiction *   [ e.g. Kings County …   ]
  How it ended *            [ e.g. dismissed, ACD   ]
  What happened, in your words
  [ multi-line …                                    ]
  [ ✦ Help me draft this ]        ← existing DisclosureAssistant, when aiEnabled

  • Every field gets a REAL <Label> above it. Placeholders are examples, never the only label —
    a placeholder vanishes the moment someone taps in, which is exactly when they need it.
  • Full-width stacked on mobile; keep sm:grid-cols-3 for desktop.
  • Keep the invalidAttrs / data-intake-invalid markers on jurisdiction and disposition exactly as
    they are — disclosureStepIssues still blocks on them.
  • Empty state: a dashed 58px "＋ Add arrest / summons" tile (full width), with one line under it:
    "Most people have none. If you do, sealed and dismissed matters count." — NOT a lonely
    outline button floating under a heading.
  • Filled state: the tile becomes "＋ Add another matter" below the last card.
```

### 3C — The Section B questionnaire — the core of this part
```
Section header: "Section B · Q10–22" · fading rule · "3 / 13"

Directly under it, a progress meter (its own small surface-2 row, 12px below the header):
    3 of 13 answered   ▬▬▬░░░░░░░░░░░░
Thirteen legal questions with no sense of progress is where people abandon. Show the progress.

EACH QUESTION IS A CARD — .card-soft, 14px radius, 14px padding, gap 12px between them
(var(--stack)). This is the fix for "they look jumbled": separation comes from SURFACE, not from a
1px line. Structure:

  ┌ [Q10]  Had or ever applied for a Handgun License issued by any  ┐
  │        Licensing Authority in N.Y.S.?                            │
  │                                                                  │
  │  ┌──────────────────┬──────────────────┐                        │
  │  │       Yes        │        No        │   48px, full width      │
  │  └──────────────────┴──────────────────┘                        │
  └──────────────────────────────────────────────────────────────────┘

  • The index badge: "Q10" in mono at 10.5px, brass, in a 30×22 rounded chip with a
    12%-brass fill and 22%-brass border, top-aligned in its own column. It gives the eye a rail to
    scan thirteen cards by.
  • Question text: 14.5px / 1.52 / text-wrap: pretty. Parenthetical instructions ("List doctor's
    name, address, telephone number in your explanation") drop to 13px --text-low so the QUESTION
    reads first and the instruction reads second. Keep the PD 643-041 wording verbatim — it is
    quoted from the form. You may re-punctuate the parenthetical for readability; you may not
    change what is being asked.
  • Yes/No becomes ONE segmented control: FULL WIDTH, 48px, 11px radius, a 1px hairline-strong
    border on --surface-3, a hairline divider down the middle, and a sliding 8px-radius thumb
    (transform: translateX, 0.18s cubic-bezier(.22,1,.36,1)) — with a prefers-reduced-motion block
    that drops the transition.

    Read this twice, it is the single most-noticed detail on the screen: today the control is
    `<div className="flex gap-2">` holding two `min-w-16` buttons, so roughly 55% of a 318px row is
    empty space to the right of "No". It looks unfinished and it puts both targets on one side of
    the screen. The replacement is a 50/50 grid — `grid-template-columns: 1fr 1fr` — where each
    half IS the target. There must be no leftover track, no trailing gap, and no container that is
    wider than the two options inside it. Yes occupies exactly the left half, No exactly the right
    half, edge to edge.

STATE LANGUAGE — this is what makes thirteen questions scannable:
  • UNANSWERED (default): card border picks up a 22%-signal tint and the segmented control's
    border goes dashed at 30% signal. Both buttons neutral. NOTHING IS PRESELECTED — do not
    change the existing "don't pre-seed No" behavior; that comment in the code is load-bearing.
  • ANSWERED "No": thumb slides right, fills --surface-2, "No" goes --text-hi, and the whole card
    drops to opacity .72 and its index chip goes quiet. It recedes so the eye finds the
    unanswered ones. (Opacity only — contrast on the remaining text must still pass AA. Verify.)
  • ANSWERED "Yes": 3px brass left border, a faint brass wash on the card, a .glow-neutral corner
    glow, thumb slides left and fills brass with ink text — and the explanation field REVEALS
    INLINE below a dashed separator:

        YOUR EXPLANATION · REQUIRED BEFORE FILING
        [ What happened, when, and how it resolved.        ]
        [ ✦ Help me draft this ]

    This is the biggest functional win in the part. Today a "yes" produces no visible consequence
    and the applicant meets a wall of required narratives at the review step. Capture it in the
    moment. Persist it to the SAME place the review step reads (`questionnaire[].narrative` in
    WizardAnswers — the shape already exists; `setQ` currently preserves `cur?.narrative`, so wire
    the textarea to it). The narrative stays OPTIONAL at this step (the review step remains where
    it's enforced) — but say plainly that it's required before filing.
  • A "Jump to next unanswered" affordance: the docked error pill from 2B does this. Make its
    count live ("10 questions still unanswered") and have it jump to the first unanswered card
    with the same scroll-margin treatment.

Accessibility: each card is a <fieldset> (or role="radiogroup") with the question as its <legend>
/ aria-label; the two options are real radio inputs styled as the segmented control, or buttons
with role="radio" + aria-checked. Keyboard: arrow keys move between Yes/No. Announce the reveal
(aria-live="polite" on the explanation region, or aria-expanded on the control).
```

**PART 3 verify (this is the one the client will look at)**
```
- Screenshot /portal/intake step 4 at 390×844. Thirteen questions must be individually legible as
  discrete objects with no squinting. Put the before and after side by side.
- The Yes/No control spans the full card width on every question, with no empty track to the right
  of "No" at 390px, 360px or 430px. Measure it — don't eyeball it.
- Answering "No" visibly recedes the card; answering "Yes" reveals the explanation field in the
  same tap and persists what's typed across a step save + reload.
- Nothing is preselected on a fresh intake; disclosureStepIssues still blocks on a missing
  court/disposition and still scrolls to the offending field.
- The 3-of-13 meter is accurate and updates live.
- Screen reader: each question announces its number, its full text, and its current answer.
- Contrast: every text/background pair in the recedes-at-.72 state passes WCAG AA.
- Verbatim check: diff the rendered question strings against QUESTIONNAIRE in lib/intake/answers.ts
  — the legal wording must be unchanged.
```

---

# PART 4 — The checklist on a phone

**Today (verified):** `components/portal/requirements-checklist.tsx` is the strongest screen in the
app — `.card-raised`, per-requirement glyphs, tone glows, category label rows. The problems are
purely mobile-fit:
- Filter chips are `min-h-[36px]`.
- Title + `LadderBadge` share a `flex-wrap items-center justify-between` row, so at 390px the badge
  frequently drops to its own line and orphans the title.
- Descriptions are `text-xs` (12px) with `line-clamp-2`.
- `RequirementAction` renders 2–4 `size="sm"` buttons in a `flex flex-wrap gap-2`, which becomes a
  ragged two-row cluster.
- The "x of y satisfied" bar and the filters scroll away immediately.

```
4A — Sticky progress + filters
  Lift the count, the progress bar and the filter chips out of the page body into a sticky header
  that docks under the app bar (same pattern as the intake step header, same z-order):
      Your checklist                       7 / 19 done
      ▬▬▬▬▬▬▬░░░░░░░░░░░░░░░░
      [To do 12] [All 19] [Completed 7] [Needs notary 3]
  Filter chips: 38px tall, 14px horizontal padding, in a horizontally scrollable rail with a
  mask-image edge fade on the right so it's obvious there's more. Active chip = brass (matching
  the nav's "you are here" language from Part 1).
  Move the page <h1> and the intake-complete banner from app/portal/checklist/page.tsx into (or
  above) this header so there's one heading, not two stacked ones.

4B — The requirement card at 390px
  Restructure the card head — the badge gets its OWN row above the title so nothing orphans:
      [FIX NEEDED]                                     RES-01
      [icon] Prove where you live
             A utility bill, lease or bank statement in your name,
             dated within the last 60 days.
  • Icon tile 42px on mobile (44px at sm:+), gap 12px.
  • Title 16px font-display 600, leading 1.3 — it's the object's name, let it be a name.
  • Description 13px / 1.55 / text-wrap: pretty, line-clamp-3 (12px + 2 lines truncates too much
    of a sentence that's telling someone what to go get).
  • req_code moves to the top row, far right, at 9.5px --text-low/72 — present for support calls,
    invisible to everyone else.
  • The reviewer-note and not-currently-required callouts keep their warn/signal treatment; bump
    to 12.5px and give them a 10px inset.

4C — One primary action
  In components/portal/requirement-action.tsx, on mobile:
  • The PRIMARY action of each requirement becomes a full-width 48px button (Upload, Replace
    document, Fill this out, Review & sign — whichever the mode dictates).
  • Secondary actions (Download, Read the draft, View, request-letter) become a single row of
    compact outline buttons beneath it, or collapse behind a "⋯ More actions" when there are more
    than two. Never a ragged wrap of four sm buttons.
  • Keep the existing mode logic (generate / obtain / attest / roster / fee) exactly as-is — this
    is layout only.
  • The "Official requirement" <details> + citation becomes a single 12px footer row with a
    chevron, separated by a hairline.

4D — Modals become sheets on a phone
  components/portal/questionnaire-dialog.tsx uses DialogContent with max-h-[90dvh] sm:max-w-2xl —
  on a phone that's a floating card with rounded corners and a visible gap. Below sm it should be a
  full-height bottom sheet: rounded top corners only, flush to the bottom edge, its own sticky
  submit bar, and padding-bottom: env(safe-area-inset-bottom). Same for SignDocument and any
  document-preview dialog. Use components/ui/sheet.tsx below sm and keep Dialog at sm:+.
```

**PART 4 verify**
```
- At 390px no requirement-card title wraps under its badge; no action row wraps raggedly.
- The progress bar and filters remain visible while scrolling a 19-item checklist.
- Every questionnaire/signing modal fills the phone screen with its submit control reachable and
  above the safe area, with the keyboard open.
- Filter counts and grouping are unchanged; the unenforced-rule and not-applicable sections still
  render with the same legal copy.
- Desktop checklist at 1280px is visually unchanged.
```

---

# PART 5 — Account creation and the prepared forms

### 5A — Auth (`app/auth/layout.tsx`, `app/auth/sign-up/page.tsx`, `login`, `forgot-password`)
```
Today the auth layout is `min-h-svh items-center justify-center py-12` with a max-w-sm card. On a
phone the centered card jumps when the keyboard opens and the disclaimer sits below the fold.

  • Below sm: top-align (justify-start, pt-6/pt-8) and let the page scroll. Keep centering at sm:+.
  • Add a 3-bead journey strip above the heading — ACCOUNT · INTAKE · CHECKLIST, first bead brass
    and ringed. Account creation is step 1 of a real process; today it reads as a dead end. The
    strip is decorative (aria-hidden) with a visually-hidden "Step 1 of 3" for screen readers.
  • Subhead: "Two minutes here, then a guided interview builds your personalized document
    checklist." — sets the expectation and matches what Part 1 of the intake fast-path actually
    does. No claims about outcomes, speed of approval, or NYPD.
  • Fields: 48px, real labels above (not floating), 16px text, autoComplete already correct —
    add inputMode="email" and autoCapitalize="none" to the email field.
  • Password: a show/hide eye button (48px target, aria-pressed, aria-label toggles) and a 4-segment
    strength meter with a one-word label. Show Supabase's minimum inline BEFORE submit rather than
    as a post-submit error.
  • Primary button: full width, 52px.
  • A trust strip under the button: "Encrypted" · "No card required" · "You always file your own
    application". That third one is a compliance point AND a differentiator — keep the wording
    exactly, it mirrors the AGENTS.md posture.
  • The brand.disclaimer moves into a <details> labeled "Important legal notice — read before you
    continue", pinned to the bottom of the card. It stays in the DOM, stays selectable, stays
    readable without JS (a <details> is fine — it renders open-able server-side). Do not shorten
    or paraphrase brand.disclaimer.
  • Keep the SEC-06 honeypot input exactly as it is.

Apply the same field/button/layout treatment to login, forgot-password and reset-password so the
three screens are one family.
```

### 5B — Prepared forms (`app/portal/forms/page.tsx`, `components/portal/forms-signing.tsx`)
```
  • The filing-pack Card is `flex flex-wrap items-center justify-between` — on a phone the button
    column lands under a five-line paragraph. Restructure for mobile: title, two-line summary,
    then a full-width 48px "Download filing pack" button, with "Just the documents" as a 44px
    secondary text button (today it's an 11px underline — an unhittable target).
  • FormsSigning rows become cards on the same rhythm as Part 4: title 15px, one-line description
    13px, notarize/filed state as a badge on its own row, and one full-width primary action.
  • The "notarize before filing" and "the person you named signs it in front of a notary — don't
    sign it yourself" instructions get a warn-toned inset callout, not a run-on description. That
    safeguard-designation sentence is the single most misread instruction in the product — give it
    its own visual weight.
  • components/portal/document-uploader.tsx: the "What is this document?" <select> goes to 48px
    and text-base; the "A passport also covers…" confirmation stays exactly as-is (it's good) but
    moves above the upload button so it's read before the tap, not after.
```

**PART 5 verify**
```
- Sign-up at 390×844 with the keyboard open: heading, all three fields and the submit button are
  reachable without the layout jumping; the disclaimer is present and expandable.
- brand.disclaimer renders verbatim from config/brand.ts.
- Show/hide password works with a screen reader and by keyboard.
- The filing-pack CTA and every FormsSigning action are ≥48px; "Just the documents" is tappable.
- Uploading from a phone camera still works (the uploader's capture="environment" is unchanged).
```

---

# FINAL PASS — prove it

```
1. Playwright (or manual, documented) screenshots at 390×844 and 360×740 of:
     /auth/sign-up · /portal · /portal/intake steps 1–6 · /portal/checklist ·
     /portal/documents · /portal/forms · /portal/people
   Put the step-4 before/after side by side in the PR description. That's the money shot.
2. Keyboard-open check on the three screens with a sticky bottom bar (intake, any sheet, sign-up).
3. `prefers-reduced-motion: reduce` — the segmented-control thumb, the sheet, and every new
   transition go still.
4. Axe or equivalent on /portal/intake and /portal/checklist: no new violations; contrast passes
   AA including the .72-opacity answered state.
5. pnpm build && pnpm test && the scripts/verify-*.ts harnesses.
6. Desktop regression at 1280px on every screen touched.
7. Grep the diff for: new hex colors (there should be none), the banned words
   (guarantee/expedite/fast-track/insider/approval rate), and any edit to lib/intake/schema.ts,
   lib/requirements/*, lib/qa-gate.ts or supabase/migrations/* (there should be none).
```

---

## Notes for you (not for Claude Code)

- **Order matters, and Part 0 is not optional.** The rhythm tokens and the type floor are what
  keep Parts 2–5 from each inventing their own spacing. If you only ship two parts, ship 0 and 3 —
  0 fixes the system, 3 fixes the screen you flagged.
- **Part 3 is the deliverable.** Everything else is the setting it sits in. The three changes that
  do the work: cards instead of hairline rows (separation from surface, not lines), a full-width
  segmented Yes/No (the whole row is the target), and revealing the explanation on "Yes" (the
  answer has a visible consequence in the moment). The 72%-opacity recede on "No" is the trick that
  makes thirteen questions scannable — but watch the contrast check on it; if AA fails, dial it to
  .8 and rely on the quieted index chip instead.
- **One deliberate call in Part 1:** brass becomes "you are here" and signal becomes "needs your
  attention", consistently. Today the bottom nav's active state is signal, which competes with the
  in-review badges on the checklist. If you'd rather keep signal for the nav, say so and drop 1A's
  color note — but then the checklist's "in review" badge should move off signal.
- **One deliberate call in Part 2:** hiding the tab bar during intake. It's the right call for a
  focused flow, and the intake gate already keeps new applicants there — but it's a real IA
  decision, so the "Save & exit" affordance is non-negotiable if you take it.
- **The mockup is structure, not spec.** `mockups/mobile-v1.html` is static HTML with hardcoded
  states. Claude Code should build with the real components, real data and real server actions —
  and where the mockup and this document disagree, this document wins.
