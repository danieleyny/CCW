# Gun License NYC — applicant checklist redesign
### Claude Code prompt

The applicant checklist is one flat list of requirements separated only by hairlines, so a "household" item and a "fees" item look identical and you can't tell where one topic ends and another begins. Redesign it into clearly-bounded, grouped SECTIONS by category — premium, scannable, and fully responsive (a lot of users are on phones).

**Guardrails:** copy stays retail-simple and candor-safe; colors from brand tokens only (no hardcoded hex in components); no guarantee/expedite; keep the three-level status semantics (pending → submitted/in-review → approved, plus needs-fix) and the existing actions. `pnpm build` + `pnpm test` pass. Mobile-first.

Files: components/portal/requirements-checklist.tsx (the list), components/portal/requirement-action.tsx (per-item actions), lib/portal/requirement-view.ts / lib/requirements/actions.ts (data + config), app/portal/checklist/page.tsx.

---

## Phase 1 — Group requirements into categories (data)
```
Requirements need a category so we can group them. Add a data-driven grouping (don't hardcode in the component):
- A `category` per requirement — either a new column on `requirements` (versioned migration + db:types) or a config map
  (req_code → category) in lib/requirements. Categories, in journey order, e.g.:
    "Eligibility", "Identity & residence", "Household & references", "Training", "Your record & history"
    (disclosures/arrests/OOP/DIR), "Safe & storage", "Fees & sign-offs", "Special tracks".
- Each category carries: a label, a short sub-label, an icon name (lucide), and a sort order.
- The requirement-view layer returns requirements GROUPED by category, each group with its computed counts
  (satisfied / applicable) and ordered items. "Not applicable" (na) items stay excluded as today.
```

## Phase 2 — The grouped section UI (match the approved mock)
```
Rewrite requirements-checklist.tsx to render GROUPED sections:

TOP BAR (keep + polish): the All / To do / Completed filter chips (with counts) + an OVERALL progress bar
("Your progress · 3 / 14"). Default to "To do" if anything is outstanding.

EACH CATEGORY = a bounded section CARD (rounded, hairline border, slightly distinct surface) so sections are unmistakably
separate:
- Section HEADER: an icon in a rounded brass-tinted square, the category label (+ a mono sub-label), and a right-aligned
  MINI progress (a small bar + "1/3"). Optional: make the header a collapse/expand toggle (collapsed by default when the
  group is fully complete, so attention lands on what's left).
- Section BODY: the requirement items as clearly-delineated rows/cards inside the section.

EACH REQUIREMENT ITEM:
- A colored left SPINE by priority (CRITICAL = red, HIGH = amber, else none) — a calm way to signal priority without shouting.
- Top row: code chip + priority label on the left; a STATUS PILL on the right — Not started (grey) / In review (signal) /
  Approved (green) / Needs fix (amber). Drive the pill off the real status (incl. the trainer/admin review state where present).
- Title (plain-language), one-line description. Keep citations OUT of the primary view (retail-simple) — a citation can live
  in a subtle "details" affordance, not the main line.
- Actions: the existing primary/secondary buttons (List household / Upload / Complete disclosures / How to get this / etc.),
  and the amber helper "hint" note where one exists — styled as in the mock.
- The upload/questionnaire/obtain affordances come from requirement-action.tsx — keep that logic; only restyle the container.

VISUAL SYSTEM: use brand tokens (surface layers, hairlines, brass, ok/warn/danger, signal). Generous spacing, 12–14px radii,
subtle elevation on section cards, hover state on interactive items. It should feel like organized chapters, not a wall.
```

## Phase 3 — Responsive (desktop AND phone, both first-class)
```
- DESKTOP: single readable column (a checklist reads top-down), comfortable max-width (~760–820px), section cards with
  generous padding; headers can show the mini progress bar inline.
- MOBILE (390px): sections stack; the section header wraps gracefully (icon + label; the mini progress can drop under the
  label if tight); requirement cards go full-width; action buttons become full-width and ≥44px tall; the code/priority/status
  row wraps without overflow; NO horizontal scroll. Collapse/expand is especially useful here — completed sections collapse.
- Filter chips remain reachable and tappable at the top on both.
- Verify at 390px and 1440px; check a long list (14+ items across 6 groups) doesn't feel heavy on either.
```

## Phase 4 — Accessibility & polish
```
- Sections are semantic (headings/regions); collapse toggles are real buttons with aria-expanded; status pills have text
  (not color alone) and AA contrast on the dark theme; the priority spine is decorative (aria-hidden) with the priority also
  in text. Keyboard: chips, toggles, and actions all focusable with visible rings.
- Motion (expand/collapse, hover) respects prefers-reduced-motion.
- Empty/edge states: a group with 0 applicable items doesn't render; "Completed" filter with the section grouping still reads
  cleanly; a fully-complete checklist shows a satisfying "everything's in — here's what's next" state.
```

## Phase 5 — Verify
```
- Requirements are grouped into clearly-separated category sections with headers, icons, and per-group progress; overall
  progress + filters work.
- Status pills reflect real status (incl. review states); priority spine correct; citations off the primary line.
- Fully responsive: clean at 390px (full-width actions, no overflow, collapse works) and 1440px; before/after screenshots both.
- Tokens only (grep for hardcoded hex in the changed components — none); a11y (semantics, aria, contrast, keyboard, reduced-motion).
- Existing actions (upload, questionnaire, manage household/references, fee panel) all still work unchanged.
- pnpm build && pnpm test pass.
Deliver: before/after screenshots at 390px + 1440px, and the category grouping config/migration.
```

---

### Notes for you (not for Claude Code)
- **The core fix is grouping, not decoration.** Bounding each category in its own card with a header + mini-progress is what makes it instantly readable — the polish (spines, pills, icons) rides on top of that structure.
- **Collapse-when-complete** is the small touch that makes a 14-item list feel manageable, especially on a phone: finished sections fold away so the eye lands on what's left.
- **Citations move off the main line.** They're valuable proof of rigor but read as clutter to a nervous first-timer — tucking them into a details affordance keeps the section clean without losing them.
