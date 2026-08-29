# Two updates, one pass

> **Part A** — make "Received" and "Needs you" unmistakable on a document card.
> **Part B** — capture how long each reference has known the applicant, in both places, and steer toward long-standing references.
>
> Independent of each other; ship together.

---
---

# PART A — Document state colours

## The diagnosis

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

**Both states are brass. Both sit on surface-2.** The four differences — a 40% opacity change on a 3px rail, a hairline weight, a 15% chip fill, and the icon — are each a *degree of the same thing* rather than a difference in kind, so the eye reads one state.

## The rule that fixes it

**Brass means "your turn." Nothing else uses brass.** The moment a document arrives it stops being the applicant's problem, so it must stop being the colour his eye is trained to hunt for.

## The spec

```
STATE              RAIL              SURFACE     CHIP                    TITLE
──────────────────────────────────────────────────────────────────────────────────
Needs you          3px solid brass   surface-2   FILLED                  medium
                                     (lifted)    bg-brass                full colour
                                                 text-obsidian
                                                 icon Upload

Changes requested  3px solid warn    surface-2   FILLED                  medium
                                     (lifted)    bg-warn / text-obsidian full colour
                                                 icon AlertTriangle

Received           2px solid signal  surface-1   OUTLINE                 normal
                                     (flat)      border-signal           foreground
                                                 text-signal, NO fill
                                                 icon Clock

Approved           2px solid ok      surface-1   GHOST                   normal
                                     (flattest)  text-ok only            text-mid
                                                 icon CheckCircle2       description hidden

Waiting on         none —            surface-1   GHOST muted             normal
someone else       1px dashed                    names the PERSON        text-mid
```

`--color-signal` and `--color-signal-dim` already exist. No new colours — signal is simply put to work, and it is the furthest hue from brass in the palette.

## Chip construction — the part that actually matters

Hue alone is not enough: brass and signal sit at similar lightness, so in greyscale, to a colour-blind user, or in peripheral vision they would still collide. What separates them is **mass**.

```
FILLED   solid block of colour, dark text punched out. High mass — a demand.
OUTLINE  thin ring, transparent centre, coloured text. Low mass — a label.
GHOST    text and icon only. Almost no mass — a footnote.
```

Build it as **three variants of one component**, not ad-hoc classNames at each call site — inline strings are exactly how the current drift happened.

```
<StateChip variant="filled"  tone="brass"  icon={Upload}       label="Needs you" />
<StateChip variant="outline" tone="signal" icon={Clock}        label="Received" />
<StateChip variant="ghost"   tone="ok"     icon={CheckCircle2} label="Approved" />
```

## Supporting changes

```
1. SURFACE CARRIES WEIGHT. Needs-you and changes-requested on surface-2 (lifted);
   received, approved and waiting on surface-1 (receding). Received currently
   shares surface-2 with needs-you — moving it down is half the fix.

2. THE CONTROL FOLLOWS THE STATE.
   Needs you → upload control is primary, full size.
   Received  → demote to a quiet "Replace" text link.
   Approved  → "View" only, no replace.

3. TITLE RECEDES AS STATE PROGRESSES — medium/full → normal → muted with the
   description hidden.

4. The inline green smart-document note ("one passport covers three
   requirements") is a coverage confirmation, not a state. Re-tone it to signal
   so green stays reserved for staff acceptance alone.

5. ONE SOURCE. Put the state → treatment mapping in lib/ui/doc-state.ts returning
   { rail, surface, chipVariant, chipTone, icon, label }, consumed by the vault,
   the sponsor surface, /portal/documents, and the self-guided library. Inline
   strings in the uploader are why the surfaces can drift.
```

---
---

# PART B — Reference tenure

## Read this before writing the copy

**The five-year rule is not an NYPD requirement.** I checked the governing text. 38 RCNY Chapter 5 as amended (NYPD emergency revisions, 24 Aug 2022) states:

> *"The applicant must submit a minimum of four (4) character references who can attest to the applicant's good moral character and that the applicant has not engaged in any act or made any statement that suggests the applicant is likely to engage in conduct that would result in harm to themself or others. Two (2) of these reference must be non-family members."*

**No minimum acquaintance period appears anywhere** — not in the rule, not on the required-documents checklist. (The existing UI copy — four references, two may be family, two must be non-family — is correct and should stay.)

So a warning worded as *"the NYPD requires five years"* would assert a rule that does not exist. Three costs: it discards references the applicant could legitimately use; it damages our credibility the moment anyone checks; and in a regulated service, being caught inventing an agency requirement is worse than the problem it solves.

**Build it as guidance, worded as ours.** A long-standing reference genuinely does carry more weight with an investigator — that is worth saying, honestly, in our own voice.

```
IF the operator can cite a source for a five-year rule, flip it: change the copy
to name the citation and make it a hard block. Leave a clearly marked constant so
that is a one-line change, not a redesign.
```

## B1 — Capture it as a number, in both places

`lib/references/questions.ts:10` currently has:

```
{ key: "knownDuration", label: "How long have you known the applicant?", type: "text", required: true }
```

Free text — "3 years", "since college", "a while" — cannot be checked reliably.

```
1. Replace it with a STRUCTURED field: years (whole number, 0–80), with an
   optional months companion. Keep the same key so existing rows still resolve,
   or migrate them; do not silently reinterpret old free-text values as numbers.
2. Add the SAME field to the applicant's add-a-reference form
   (components/portal/collectors.tsx): "How long have you known them?" — years,
   required, sitting beside Relationship.
3. This becomes a case fact on the reference party record, so the two forms agree
   and the applicant's answer PREFILLS the reference's own form — the reference
   confirms rather than retypes. If they disagree, the reference's answer wins;
   it is their sworn letter.
```

## B2 — The warning, in both places, non-blocking

```
TRIGGER: years < 5

APPLICANT-SIDE (adding the reference)
  Inline, below the field, warn-toned, appears as they type. Does NOT block
  "Add reference".
    "References who have known you five years or more carry noticeably more
     weight with the License Division. This one still counts toward your four —
     but if you have someone who has known you longer, use them."

REFERENCE-SIDE (the token form)
  Same trigger, same non-blocking behaviour, worded for a stranger doing a favour
  and phrased so it never reads as an accusation:
    "Thanks — that's fine to submit. Applications are strongest when references
     have known the applicant five years or more, so we'll flag this to their
     case team."
  They must still be able to complete and submit. Never dead-end a third party
  who is doing the applicant a favour.

ADMIN
  Surface it on the case: a quiet flag on the reference row showing the stated
  tenure, so staff can advise the applicant to add a longer-standing reference
  before the packet is assembled. This is where the value actually lands.
```

## B3 — Do not block, and be careful what you count

```
1. NON-BLOCKING, both sides. A short-tenure reference still counts toward the
   four. Blocking would invent a requirement AND lose a valid reference.
2. Do not aggregate the warning into the CP-5 gate or make it a filing blocker.
3. Roll it into the existing family / law-enforcement rules rather than adding a
   fourth separate warning — one advisory line covering all the reference quality
   rules reads better than three stacked callouts.
4. Store the number so it can be reported on later. If the operator's experience
   is right, you will eventually be able to check outcomes against tenure — which
   is how this becomes evidence rather than folklore.
```

---
---

## VERIFY — both parts

```
PART A
1. GREYSCALE TEST: one card in every state, converted to greyscale — can you
   still name each one? If Needs-you and Received collapse, the mass gradient was
   not built.
2. SQUINT TEST: heavily blur the screenshot. Needs-you should be the only bright
   blocks left.
3. Upload a document: rail brass→signal, chip filled→outline, surface 2→1. Three
   simultaneous changes.
4. NO BRASS except needs-you — grep the vault surfaces and confirm every hit is
   action-required or brand chrome, never a status.
5. Approve it: rail signal→ok, chip outline→ghost, description hides.
6. All four surfaces render the same state identically — compare the applicant's
   vault against the sponsor's view of the same document.
7. Filled chips: dark text on bright fill, contrast checked in both themes.

PART B
8. Applicant adds a reference at 3 years → warning shows, "Add reference" still
   works, the reference is created.
9. The reference opens their link → the years field is prefilled from what the
   applicant entered; changing it to 2 shows the reference-side notice and the
   form still submits.
10. At 5+ years neither side shows anything.
11. The letter still generates correctly with the structured value.
12. Existing references with free-text durations still load without crashing —
    check "since college" and an empty value.
13. Copy check: nothing anywhere claims the NYPD requires five years.
14. Staff see the tenure and the flag on the case.

BOTH
15. pnpm build && pnpm test green. 390px on the vault and both reference forms.
```

## DO NOT

- Do not distinguish document states by opacity of a single hue.
- Do not use brass for anything except "your turn".
- Do not leave received on surface-2 with needs-you.
- Do not write chip styles as inline classNames — one component, three variants.
- Do not tell anyone the NYPD requires a five-year acquaintance. It does not.
- Do not block a reference, on either side, for short tenure.
- Do not silently reinterpret existing free-text durations as numbers.
