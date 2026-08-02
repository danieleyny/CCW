# Gun License NYC — checklist: elevated "material" cards
### Claude Code prompt (approved design)

Rework the applicant checklist so each requirement is a standalone, elevated card separated by light and space — not boxes-inside-boxes. The look: Linear / Stripe / Superhuman-grade depth, a top-lit gradient per card, a soft drop shadow, and a status-driven ambient corner glow. Reduce per-card clutter so each reads as one clean, distinct piece.

**Guardrails:** colors from brand tokens only (no hardcoded hex in components — add any new tokens/utilities to config/brand.ts + app/globals.css); retail-simple, candor-safe copy; keep the real three-level status (pending → submitted/in-review → approved, plus needs-fix) and all existing actions/logic; no guarantee/expedite. Mobile + desktop both first-class. `pnpm build` + `pnpm test` pass.

Files: components/portal/requirements-checklist.tsx, components/portal/requirement-action.tsx, lib/portal/requirement-view.ts, lib/requirements (category config), app/portal/checklist/page.tsx, app/globals.css, config/brand.ts.

---

## Phase 1 — Category grouping (lightweight labels, NOT boxes)
```
Keep requirements grouped by category, but DROP the heavy container boxes that caused the boxes-in-boxes clutter. A category
is a lightweight LABEL ROW only: a mono uppercase label + a fading hairline rule + a small "1 / 3" count. No border, no card
around the group.
- Grouping is data-driven: a `category` per requirement (a config map req_code → category in lib/requirements, OR a column —
  config map is fine and lower-risk). Each category: label, sort order. Categories in journey order (Eligibility, Identity &
  residence, Household & references, Training, Your record & history, Safe & storage, Fees & sign-offs, Special tracks).
- requirement-view returns requirements grouped by category with per-group counts (satisfied/applicable); `na` items excluded.
```

## Phase 2 — The elevated card (the core of the design)
```
Rewrite each requirement item in requirements-checklist.tsx as a standalone ELEVATED CARD (match the approved mock):

MATERIAL / DEPTH (this is what makes each card a distinct object):
- Background: a subtle vertical gradient, lighter at the TOP edge → darker at the bottom (e.g. surface-2 → surface-1 range),
  so the card looks lit from above. Add these as tokens/utilities in globals.css (e.g. `.card-raised`) — do not inline hex.
- Border: 1px hairline; plus an INSET top highlight (a faint white top edge) — `box-shadow: inset 0 1px 0 rgba(255,255,255,.06)`.
- Elevation: a soft, wide drop shadow so the card floats off the near-black canvas (e.g. `0 22px 44px -26px rgba(0,0,0,.85)`).
- Radius ~16px. Generous internal padding. A clear GAP between cards (~13–14px) — space, not lines, separates them.
- Subtle hover lift (translateY -1px + slightly stronger shadow); respects prefers-reduced-motion.

STATUS-DRIVEN AMBIENT GLOW (the functional gradient — the signature touch):
- A soft blurred radial glow in the card's top-right corner whose COLOR encodes status:
    not-started → neutral brass (faint)   ·   in-review → signal/cyan   ·   approved → ok/green   ·   needs-fix → warn/amber
- Keep it subtle (low opacity, blurred), aria-hidden, pointer-events-none. Add as a small set of token-based utility classes
  (`.glow-neutral/.glow-review/.glow-ok/.glow-fix`) so it's not ad-hoc. Under prefers-reduced-motion it's static (it already is).

LAYOUT / DECLUTTER (reduce what competes for attention):
- LEADING ICON TILE (44px, rounded ~12px, graphite gradient + inset highlight, a category/requirement lucide icon in it). The
  tile is the card's visual anchor. Optionally tint the icon glyph toward the status color.
- PRIORITY as a small DOT on the tile corner (CRITICAL = danger, HIGH = warn, else none) — NOT a shouted "HIGH" label.
- Title (plain-language, 15–16px, 600) on the left; a clean STATUS PILL on the right (Not started / In review / Approved /
  Needs fix — token colors, text + color, AA contrast).
- One-line description (muted). Keep it to a single line where possible.
- ACTIONS row: ONE primary button (brass) + at most one quiet secondary as a text link (e.g. "How to get this", "Manage").
  The requirement CODE (COH-01) shrinks to a faint mono label pushed to the far right of the actions row — present but recessive.
- CITATION is OFF the card face — move it into an optional subtle "details" affordance (or drop from the applicant view; it
  stays in admin). No §-citations cluttering the card.
- The upload / questionnaire / obtain / manage affordances still come from requirement-action.tsx — keep that logic; only the
  container/styling changes.
```

## Phase 3 — Responsive (desktop + phone both first-class)
```
- DESKTOP: single readable column, comfortable max-width (~760–820px), full card treatment (icon tile + inline title/pill,
  actions in a row). Generous vertical rhythm between cards.
- MOBILE (390px): cards full-width; icon tile stays; the title/status-pill row wraps gracefully (pill can drop below the title
  if tight); description one–two lines; actions become full-width, ≥44px tall, stacked if needed; the faint code label wraps
  without overflow. NO horizontal scroll. The ambient glow scales down so it never bleeds past the card.
- Filter chips (All / To do / Completed) + overall progress bar stay pinned at the top on both; default to "To do" when anything
  is outstanding.
- Verify at 390px and 1440px with a long list (14+ items across 6 categories) — it must feel calm and premium at both.
```

## Phase 4 — Accessibility & polish
```
- Status conveyed by TEXT (the pill label) not color alone; AA contrast on the dark gradient; the priority dot is decorative
  (aria-hidden) with priority also available in text (e.g. sr-only or the details). Icon tiles decorative/aria-hidden.
- Section labels are semantic headings; the checklist is a list; cards are list items; actions are real buttons/links with
  visible focus rings. Keyboard fully navigable.
- Motion (hover lift, any expand) respects prefers-reduced-motion.
- States: a fully-satisfied card reads calmly (green pill, check) without shouting; the "Completed" filter looks clean; a
  fully-complete checklist shows a satisfying "everything's in — here's what's next" state.
```

## Phase 5 — Verify
```
- Each requirement is a standalone elevated card: top-lit gradient, inset top highlight, soft shadow, generous gap — clearly a
  separate piece. No group container boxes remain (sections are label rows only).
- The ambient corner glow correctly encodes status (neutral/cyan/green/amber) and is subtle; priority shows as a tile dot;
  the code is recessive; citations are off the card face.
- Tokens only: grep the changed components for hardcoded hex/rgba — none; new gradient/glow/shadow live as utilities in
  globals.css driven by brand tokens.
- Fully responsive: clean and premium at 390px (full-width actions, no overflow, glow contained) and 1440px.
- a11y: text-based status, AA contrast, semantics, focus rings, reduced-motion.
- All existing actions still work (upload, questionnaire, manage household/references, fee panel, how-to-get-this).
- pnpm build && pnpm test pass.
Deliver: before/after screenshots at 390px + 1440px (a few cards across 2–3 categories, showing at least one of each status),
and the category config.
```

---

### Notes for you (not for Claude Code)
- **The depth is doing the separation, so it must be real.** The top-lit gradient + inset highlight + soft shadow together make each card read as a physical object — if any one is dropped it flattens back out. The verify step checks all three are present.
- **The glow is a feature, not decoration:** it encodes status, so keep it subtle but never remove it — it's what lets someone feel a card's state before reading it.
- **Most of the "less jumbled" win is decluttering:** one icon, one title, one line, one primary action, a recessive code, no citation. If a card ever feels busy again, that's the lever to pull first.
- New shadow/gradient/glow values live as globals.css utilities tied to brand tokens, so a rebrand or theme change carries them along — nothing hardcoded in the component.
