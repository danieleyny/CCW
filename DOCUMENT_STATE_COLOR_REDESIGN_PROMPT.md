# Document state colours — make "Received" and "Needs you" unmistakable

> An uploaded document and an outstanding one currently look the same. Fix it by giving each state a different **hue family**, a different **chip construction**, and a different **surface elevation** — not different opacities of one colour.

---

## THE DIAGNOSIS — why they look identical

`components/portal/document-uploader.tsx:159–169`:

```
needsYou  →  border-l-[3px] border-l-brass       bg-surface-2   border-hairline-strong
received  →  border-l-[3px] border-l-brass/60    bg-surface-2   border-hairline
```

and the chips at `:184–190`:

```
received  →  <StateChip icon={Clock}  label="Received"  className="text-brass-bright" />
needsYou  →  <StateChip icon={Upload} label="Needs you" className="bg-brass/15 text-brass-bright" />
```

**Both states are brass. Both sit on surface-2.** The four differences are a 40% opacity change on a 3px rail, a hairline weight, a 15% chip fill, and the icon. Every one is a *degree of the same thing* rather than a difference in kind — so the eye reads one state, not two.

The earlier spec said each state must differ on at least three axes and never on hue alone. Four axes were used, but all four are micro-variations inside a single hue. The letter was followed; the intent was not.

---

## THE RULE THAT FIXES IT

**Brass means "your turn." Nothing else uses brass.**

The moment a document arrives, the card stops being the applicant's problem — so it must stop being brass. That one rule does most of the work, because brass is the colour his eye is already trained to hunt for.

---

## THE SPEC

```
STATE              RAIL              SURFACE     CHIP                       TITLE
─────────────────────────────────────────────────────────────────────────────────────
Needs you          3px solid brass   surface-2   FILLED                     medium
(nothing yet)                        (lifted)    bg-brass                   full colour
                                                 text-obsidian (dark ink
                                                 on bright fill)
                                                 icon: Upload

Changes requested  3px solid warn    surface-2   FILLED                     medium
(rejected)                           (lifted)    bg-warn / text-obsidian    full colour
                                                 icon: AlertTriangle

Received           2px solid signal  surface-1   OUTLINE                    normal
(we have it,                         (flat)      border border-signal       text-foreground
 unreviewed)                                     text-signal, NO fill
                                                 icon: Clock

Approved           2px solid ok      surface-1   GHOST                      normal
(staff accepted)                     (flattest)  text-ok, no fill,          text-text-mid
                                                 no border                  description hidden
                                                 icon: CheckCircle2

Waiting on         none —            surface-1   GHOST muted                normal
someone else       1px dashed                    names the PERSON,          text-text-mid
                   hairline border               not the state
```

**`--color-signal` and `--color-signal-dim` already exist** in the token set. No new colours are introduced — signal-cyan is simply put to work, and it is the furthest hue from brass in the palette, which is exactly what this needs.

---

## THE PART THAT ACTUALLY MATTERS — chip construction

Hue alone is not enough. Brass and cyan sit at similar lightness, so in greyscale — or to a colour-blind user, or in peripheral vision — they would still collide.

What separates them is **mass**:

```
FILLED   a solid block of colour with dark text punched out of it.
         High visual mass. Reads as a button, a demand.
         → Needs you · Changes requested

OUTLINE  a thin ring, transparent centre, coloured text.
         Low mass. Reads as a label, a status.
         → Received

GHOST    text and icon only, no border, no fill.
         Almost no mass. Reads as a footnote.
         → Approved · Waiting on someone else
```

Filled → outline → ghost is a mass gradient that survives greyscale, survives colour blindness, and survives a glance. **Build the chip as three variants of one component**, not as ad-hoc className strings at each call site — that is how the current drift happened.

```
<StateChip variant="filled"  tone="brass"  icon={Upload}       label="Needs you" />
<StateChip variant="outline" tone="signal" icon={Clock}        label="Received" />
<StateChip variant="ghost"   tone="ok"     icon={CheckCircle2} label="Approved" />
```

---

## SUPPORTING CHANGES

```
1. SURFACE ELEVATION CARRIES WEIGHT TOO.
   Needs-you and changes-requested sit on surface-2 — lifted off the page.
   Received, approved and waiting sit on surface-1 — flat, receding.
   Today received shares surface-2 with needs-you; that alone makes them
   read as peers. Moving it down is half the fix.

2. THE CONTROL FOLLOWS THE STATE.
   Needs you        → the upload control is the primary action, full size.
   Received         → demote to a quiet "Replace" text link. He should not
                      feel invited to re-upload something we already have.
   Approved         → "View" only. No replace.
   The screenshot shows Replace and View at equal weight on a received card —
   that competes with the real next action further down the page.

3. TITLE AND DESCRIPTION RECEDE AS STATE PROGRESSES.
   Needs you → medium weight, full colour, description shown.
   Received  → normal weight, description shown.
   Approved  → normal weight, muted, description hidden (already correct).

4. THE INLINE GREEN "smart document" NOTE stays green — it is a helpful
   confirmation about coverage ("one passport covers three requirements"),
   not a state. But check it does not read as an approval on a card that is
   only Received. Consider re-toning it to signal so green stays reserved
   for staff acceptance alone.
```

## APPLY EVERYWHERE, FROM ONE SOURCE

```
The same state vocabulary must render identically on:
  · the concierge vault (components/portal/document-uploader.tsx)
  · the sponsor surface (app/sponsor/[caseId] + SponsorApplicantFile)
  · the read-only application review (/portal/documents)
  · the self-guided checklist and document library

Put the state → treatment mapping in ONE module (e.g. lib/ui/doc-state.ts)
returning { rail, surface, chipVariant, chipTone, icon, label } for a given
status, and have every surface consume it. Right now the classes are inline
strings in the uploader, which is why the sponsor view and the applicant view
can drift apart.
```

---

## VERIFY

```
1. THE GREYSCALE TEST — the one that matters. Screenshot a vault containing one
   card in every state, convert to greyscale, and confirm you can still name each
   one. If Needs-you and Received collapse, the chip mass gradient was not built.
2. THE SQUINT TEST: blur the screenshot heavily. The needs-you cards should be
   the only bright blocks left.
3. Upload a document and watch the transition: the rail changes hue brass→signal,
   the chip changes construction filled→outline, and the card drops from
   surface-2 to surface-1. Three simultaneous changes — it should be obvious that
   something happened.
4. NO BRASS ANYWHERE except needs-you. Grep the vault surfaces for `brass` and
   confirm every hit is an action-required state or brand chrome, never a status.
5. Staff approve it: rail signal→ok, chip outline→ghost, description hides.
6. All four surfaces render the same state identically — compare the applicant's
   vault and the sponsor's view of the same document side by side.
7. Contrast: filled chips need dark text on the bright fill; check the brass and
   warn fills against text-obsidian, and every chip label against its surface.
8. prefers-reduced-motion respected on the transition.
9. 390px: chips do not wrap or truncate their labels.
10. pnpm build && pnpm test green.
```

## DO NOT

- Do not distinguish states by opacity of a single hue.
- Do not use brass for anything except "your turn".
- Do not leave received on surface-2 with needs-you.
- Do not write chip styles as inline classNames at the call site — one component, three variants.
- Do not give a received card an equally prominent Replace control.
- Do not introduce a new colour; signal is already in the token set.
