# Document taxonomy + visual hierarchy — Claude Code build prompt

> The applicant sees seventeen near-identical cards in one flat list; the sponsor sees the same plus a company packet. Nothing groups them, and nothing distinguishes a card that needs action from one that is finished. Two separate problems, fixed in that order: **structure first, then visual weight.**
>
> Do not restyle before grouping. Most of the "everything looks the same" complaint is a structure problem wearing a colour problem's clothes — 17 items in one list would read as a wall whatever the palette.

---

## WHAT IS ACTUALLY WRONG — measured

```
STRUCTURE
  lib/concierge/vault.ts:62
    const ORDER = ["IDN-01", "IDN-04", "RES-01", "TRN-01", "RNW-01"]
  Five codes are sorted; every other requirement falls through in view order.
  There is no category on the requirement registry and no `category` column on
  the requirements table. DocumentVault renders one <section> containing a flat
  .map() of uploader cards.

VISUAL — components/portal/document-uploader.tsx:154
  approved     → border-ok/60  bg-gradient-to-br from-ok/15  ring-1 ring-ok/25
  received     → border-ok/40  bg-gradient-to-br from-ok/8   ring-1 ring-ok/15
  outstanding  → border-hairline bg-card

  Three problems in three lines:
  1. States differ ONLY by opacity — 15% vs 8% vs 0% of one colour. On a dark
     ground that is very nearly no difference at all.
  2. THE HIERARCHY IS INVERTED. The finished card gets the ring, the gradient and
     the strongest border. The card that needs the applicant gets a plain
     hairline. The loudest thing on the page should be the thing that needs you.
  3. Received and approved are both green, so "we have it" and "we checked it"
     look the same. This also contradicts the agreed rule that server-confirmed
     receipt is brass and only staff acceptance is green.

UNUSED CAPACITY
  app/globals.css already defines --surface-1 / --surface-2 / --surface-3 and
  --hairline / --hairline-strong. The vault uses bg-card for everything and
  touches none of the elevation system it already has.
```

---

## PHASE 1 — Give requirements a section, in the registry

Grouping must live where the requirement lives, so every surface groups identically. Today the vault, the checklist, `/portal/documents` and the sponsor page each render the same requirement view and would each need their own logic.

```
1. Add to the RequirementAction contract in lib/requirements/actions.ts:
     section: SectionKey
     sectionOrder?: number      // ordering within the section; default by code

2. THE TAXONOMY. Group by what the person must DO and about WHOM — not by
   document type, which is how the database thinks, not how a human does.

   identity       "Who you are"
                  IDN-01 · IDN-02 · IDN-03 · IDN-04
   residence      "Where you live"
                  RES-01
   records        "Records about you"
                  DMV-01 · OOS-01
   credentials    "Your guard credentials"        (armed track only)
                  GRD-01 · GRD-02 · GRD-03 · GRD-04 · FRM-01 · PLE-01 · SCG-01
   training       "Your training"                 (non-armed tracks)
                  TRN-01 · RNW-01
   people         "People we contact for you"
                  REF-01 · REF-02 · COH-01 · SAF-01
   prepared       "We prepare, you sign"
                  AFF-01 · DSC-01 · QUE-01 · ARR-01 · OOP-01 · DIR-01 · SOC-01
   conditional    "Only if it applies to you"
                  MIL-01 · NAM-01 · GMC-01 · PRM-01
   sponsor        "From {company name}"           (SPN-* — see Phase 5)
   admin          hidden from applicants          (FMT-01, ELG-*, FEE-01 …)

3. A requirement with no section is a build error, not a silent fallthrough.
   Add it to the existing template/registry validator: every code in
   REQUIREMENT_ACTIONS has a section, and every section has at least one code
   on at least one track.

4. Sections carry their own copy — a title and one line of context — defined
   once in lib/requirements/sections.ts, not inline in components:
     people:   "You give us names and emails. We invite them, chase them, and
                collect the notarised documents."
     prepared: "We draft these from your answers. You review each one and add
                your signature — nothing is signed for you."
     sponsor:  "{company} handles these. You can see the status; the documents
                themselves are theirs."

5. Delete the ORDER array in lib/concierge/vault.ts. Ordering becomes
   section order, then sectionOrder, then code.
```

## PHASE 2 — Render sections with real separators

```
1. buildVaultItems returns GROUPS, not a flat array:
     { key, title, blurb, items[], counts: { total, outstanding, received, approved } }

2. Each group renders as a labelled band, not just spacing:
     · an eyebrow-weight section title
     · a count on the right — "2 of 4 in" — in tabular figures
     · a hairline rule under the header, full width
     · generous space ABOVE each group, tight space between cards inside it
       (proximity is what makes a group read as a group — currently every gap
       is identical, so the eye sees seventeen peers)

3. EMPTY AND FINISHED GROUPS COLLAPSE.
     · A group where everything is approved renders as a single collapsed row:
       "Who you are — 4 of 4 ✓" with a chevron to expand.
       Collapsed by default. This alone removes most of the wall as a case
       progresses, and it makes finishing a section feel like something.
     · A group with no applicable items does not render at all.

4. ORDER WITHIN A GROUP: outstanding first, then received, then approved. The
   existing sort already does this — keep it, apply it per group.

5. SECTION ORDER is fixed and meaningful, not alphabetical: identity →
   residence → records → credentials/training → people → prepared →
   conditional → sponsor. What only they can do comes before what we do,
   and what depends on other people comes before what depends on nobody.
```

## PHASE 3 — Make the states actually distinguishable

The rule: **visual weight tracks how much attention the card deserves, not how complete it is.**

```
FOUR STATES, four genuinely different treatments — each differing on at least
THREE axes (border, surface, accent rail, chip, icon), never on opacity alone:

  NEEDS YOU        the loudest card on the page
    · 3px brass left rail (border-l-[3px] border-l-brass)
    · surface-2 — lifted above the page ground
    · hairline-strong border
    · chip: "Needs you" in brass
    · the upload control is visible and primary

  WAITING ON SOMEONE ELSE   (a reference, a cohabitant, the sponsor)
    · dashed hairline border, no rail
    · surface-1 — flat, recessive
    · chip: "With Ellen" / "With ISS Action" — name the person, not the state
    · no control; a "nudge" link where one exists

  RECEIVED — we have it, staff haven't checked it
    · 3px amber/brass-dim left rail
    · surface-2, faint brass wash
    · chip: "Received" + a clock icon
    · control demoted to a quiet "Replace" link

  APPROVED — finished, should recede
    · 2px green left rail, NO ring, NO gradient
    · surface-1, quiet
    · chip: "Approved" + check icon
    · title at normal weight, description hidden
    · this is the QUIETEST card, not the loudest — reverse the current styling

REQUIREMENTS FOR ALL FOUR
  · Colour is never the only signal: every state has a distinct icon AND a text
    label. A user with any colour-vision difference must be able to sort the
    list without the hue.
  · Use the existing --surface-1/2/3 and --hairline-strong tokens. Do not add
    new colours; the palette is not the problem, its application is.
  · Contrast: check label text against its own surface in both themes.
  · Respect prefers-reduced-motion on the state-change transition.
```

## PHASE 4 — A summary strip that answers "what do I actually have to do"

```
Above the groups, one compact row — not a dashboard, one line:

     4 need you  ·  6 with us  ·  3 with others  ·  7 done

Each segment is a filter chip. Clicking "4 need you" collapses everything else.
This is the single highest-value addition: a concierge customer's real question
is "how much of this is mine", and today they must read seventeen cards to
answer it.

Reuse the counts already computed for the groups. Do not add a second source of
truth for progress — the control tower and this strip must agree because they
read the same numbers.
```

## PHASE 5 — Both surfaces, one taxonomy

```
1. THE SPONSOR (app/sponsor/[caseId]) uses the same groups, in this order:
     "Your company packet"  — the SPN-* section, first, because it is the only
                              work that is hers alone
     then the applicant's groups, labelled "Chery's file", each rendered through
     party_scope exactly as now.
   The sponsor's own packet section gets the brass "Needs you" treatment; the
   applicant's groups are informational to her unless her scope allows action.

2. THE APPLICANT sees the sponsor section as "From ISS Action" — status only,
   the waiting-on-someone-else treatment, no controls, no file access. The
   existing applicant_scope='progress' rule already enforces this; the section
   makes it legible.

3. /portal/documents (the read-only review surface) and the self-guided
   checklist use the SAME section definitions. Three surfaces, one taxonomy —
   that is the point of putting it in the registry.

4. Name the sponsor section from the sponsor record, not a hardcoded string. It
   reads "From ISS Action" for this case and correctly for the next one.
```

---

## VERIFY

```
1. A carry_guard case renders as GROUPS, not one list. Count the sections on
   screen and against the taxonomy — no requirement appears outside a section,
   and no section appears empty.
2. Every code in REQUIREMENT_ACTIONS has a section; the validator fails if one
   does not.
3. THE FOUR STATES ARE DISTINGUISHABLE IN A SCREENSHOT. Render the vault with
   one card in each state, convert to greyscale, and confirm you can still tell
   them apart. If you cannot, the treatment is still leaning on hue.
4. HIERARCHY IS RIGHT WAY UP: put an approved card next to an outstanding one.
   The outstanding card must be the one your eye lands on first.
5. Received is brass and approved is green — they are not both green.
6. A fully-approved section collapses to one row and expands on click; state
   survives a refresh if you persist it, and defaults to collapsed if you do not.
7. The summary strip counts equal the group counts equal the control tower.
8. SPONSOR: her packet is first and styled as hers; the applicant's groups carry
   no upload control beyond her scope; the applicant still sees SPN-* as status
   only with no storage path in the payload.
9. Self-guided and concierge cases both group correctly; nothing about an
   existing concealed-carry case regresses.
10. 390px: section headers, counts and chips do not wrap awkwardly; the summary
    strip scrolls horizontally rather than stacking into four lines.
11. pnpm build && pnpm test green.
```

## DO NOT

- Do not restyle before grouping — the wall is a structure problem first.
- Do not group by document_type or by mode. Group by what the person must do.
- Do not put section definitions in components; one registry, three surfaces.
- Do not differentiate states by opacity alone.
- Do not give the finished card more visual weight than the actionable one.
- Do not introduce new palette colours — use the surface and hairline tokens that already exist.
- Do not let colour be the only carrier of state.
