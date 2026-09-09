# One surface, one card, one source — and four Letter of Necessity defects

You noticed that "all the corrections landed in the checklist instead of the
concierge." That is exactly what happened, and it has a single cause worth fixing
properly rather than by copying code across.

---

# PART A — There are two parallel surfaces, and the concierge applicant is on the wrong one

```
/portal/checklist   renders  <RequirementsChecklist>   ← every improvement landed here
                             the "How to get this" panels, the DMV steps, the
                             training steps, the residence-proof picker, the
                             per-requirement cards

/portal/concierge   renders  <DocumentVault> + <DataAsksSection> + <DisclosuresSection>
                             a DIFFERENT set of components that never received any of it
```

And from `components/portal/portal-nav.tsx`:

```
SELF-GUIDED nav:  Home · Checklist · Documents · People
CONCIERGE   nav:  Concierge · Your application · Messages · Forms      ← no Checklist
```

So a concierge applicant has no Checklist tab, never sees `RequirementsChecklist`,
and every card improvement we shipped is invisible to them. Meanwhile
`lib/concierge/data-asks.ts` links two cards to `/portal/checklist`, which throws
them onto a page that is not in their navigation — that is the "reverting to the
checklist" you saw. `/portal/checklist` even detects a concierge case and shows a
"Go to your concierge dashboard" banner, which is the page apologising for existing.

## The fix — one renderer, two hosts

```
· EXTRACT the requirement card out of RequirementsChecklist into ONE shared component
  (components/portal/requirement-card.tsx) that owns: the title, the status pill, the
  Upload / action control, the "How to get this" panel, the smart-document picker,
  and any per-requirement extras.
· BOTH surfaces render THAT component. DocumentVault becomes a layout around it, not
  a second implementation of it.
· A requirement's presentation is then defined ONCE, in the registry, and any future
  improvement lands on both surfaces automatically. That is the actual defect here —
  not that we edited the wrong file, but that editing one file could ever mean only
  half the users see it.
· DELETE the duplicated card markup in document-vault.tsx rather than leaving it
  unused.
```

## Where the applicant lives

```
· For a CONCIERGE case, /portal/concierge is home. Nothing should ever navigate them
  to /portal/checklist. Redirect /portal/checklist → /portal/concierge for concierge
  cases instead of showing a banner.
· For a SELF-GUIDED case, /portal/checklist stays home, unchanged.
· Audit every link in the portal for /portal/checklist and make it resolve per
  service mode. lib/concierge/data-asks.ts is the one I know about; there are others
  (welcome-card.tsx, intake-wizard.tsx).
```

---

# PART B — Make the cards look like the good ones

The checklist cards read well: a clear title, a muted one-line description, a
right-aligned status pill, a primary action, and a collapsible "How to get this".
The concierge sections don't match — different padding, different type scale,
different status treatment.

```
· Adopt the checklist card as THE card. Same border, radius, padding, title size,
  description tone, pill placement and disclosure affordance.
· Apply it to every block on the concierge page: the data-ask cards, the vault items,
  the disclosures section, the review-and-file block.
· Keep the state colours already agreed: brass = your turn, signal = received,
  ok = approved, dashed = waiting on someone else. One StateChip, not per-card
  classNames.
· The two pages should be indistinguishable in style. A person moving between them
  should not be able to tell they are different templates.
```

---

# PART C — The concierge-only helpers are missing from the concierge view

Both were built into the checklist's cards, which concierge users never see. Once
Part A lands they come along automatically — verify both:

```
· DMV-01 "Request help"  — concierge only, outline button in the signal tone, sits
  beside the "NYS DMV — driving records" link. Opens a request to the case team.
· TRN-01 "Find me an instructor" — replaces the "NYPD required documents" button,
  emails gunlicensenyc@gmail.com with the applicant's name, account email and case
  reference, confirms in a modal, logs the activity, disables for 7 days.
· While in TRN-01's copy: it currently says "16 classroom hours and the 2-hour
  live-fire session". Lead with the total — 18 hours (16 classroom + 2 live-fire) —
  because 18 is the number the portal uses.
```

---

# PART D — Remove the address split confirmation entirely

The "Building number & street name — please confirm we got it right" card is asking
the applicant to audit our parser. It is work we invented for them.

```
· DELETE components/portal/facts/address-splits.tsx and its section on the details
  page.
· DELETE the *.streetConfirmed facts (home, mailing, employer, safeguard) and the
  confirmed branch in resolveStreetSplit().
· Derive the building number and street name at RENDER time with splitStreet(), on
  the worksheet only. Staff sees the split; the applicant never does.
· Staff can correct a bad split at entry time — they are looking at the address
  anyway. That is a better place for the check than in front of the customer.
```

---

# PART E — The history prefill was never built

The employment and residence histories still come up empty after the employer
section is filled. This was specced and did not land.

```
WHEN employer.employed = Yes AND employer.startDate is set AND the employment
history is empty, seed row 1:
    From = employer.startDate · To = Present
    Business = employer.name · Occupation = applicant.jobTitle

THEN, with the real date in the copy:
  · start date MORE than 5 years ago →
      "This job covers the full five years. Nothing else needed here."
  · start date WITHIN 5 years →
      "This covers back to 3/1/2022. Add anything before that."

RULES
  · Seed only into an EMPTY history. Never duplicate a row the applicant entered.
  · Mark the row as seeded. Once edited, later employer changes must not overwrite
    it — offer to re-sync, don't silently rewrite a sworn history.
  · Residence: we hold no move-in date, so there is nothing to seed. Leave it, and
    don't fake it.
```

Also still outstanding from the last round and worth confirming in the same pass:
the history section must **autosave per row on blur**, not depend on "Save history".

---

# PART F — The Letter of Necessity: four separate defects

## F1 — It demands a field it never showed you

```
lib/forms/templates.ts   nypd_letter_of_necessity
    requires: ["LetterOfNecessity1", "LetterOfNecessity3"]
```

`LetterOfNecessity1` is the employment description. Its questionnaire field `lop1`
carries `lonScope` that **hides it on a concealed-carry track** — correctly, because
the portal only asks a CC applicant for statements 2, 3 and 5 of its five. So the
applicant is told they are missing a field they were never asked for.

```
Derive `requires` from the SAME lonScope gating that decides which questions render.
One source. A required field the applicant cannot see is a bug by construction.
```

## F2 — It generates anyway

`app/portal/requirements/actions.ts` —

```ts
const filled = await fillTemplate(action.templateKey, fillValues)
incompleteFields = filled.missingRequired
// …then straight on to storeGeneratedDocument()
```

`missingRequired` is captured and never acted on. Only `filled.missing` (a mapping
bug) throws, and only outside production. So the applicant sees "this form isn't
complete yet" **and receives the document.**

```
· If missingRequired is non-empty, DO NOT generate, DO NOT store, DO NOT return a
  document. Return the missing list.
· Apply this to EVERY generate-mode requirement, not just the LON. A partially
  filled government form must never present as done — that rule is already written
  in fill.ts's own header comment and is not being enforced.
```

## F3 — The visible numbering jumps 3, 4, 6

A concealed-carry applicant sees questions numbered **3, 4, 6**. It reads as though
the form lost some.

```
Number the questions the applicant is actually asked, contiguously: 1, 2, 3.
If the official box number is useful, show it as quiet secondary context
("Form box 3"), never as the primary label.
```

## F4 — The generated form asserts things we never asked, and one of them is wrong

The rendered PDF has box 1 empty and boxes 2, 3, 4, 5 filled — because `prefill()`
pre-populates the acknowledgements regardless of track, the modal hides the
out-of-scope ones, and `build()` prints them all.

For a personal-protection concealed-carry applicant, box 2 prints:

> *"I acknowledge that the handgun may be carried only during the course of, and
> strictly in connection with, my job, business, or occupational requirements."*

**That is not true of their licence, and they were never shown it.** Box 5 (employer's
disposal responsibility) is the same problem.

```
· Prefill must respect lonScope. Do not populate a statement that is out of scope
  for the track.
· build() must not print an out-of-scope box. Leave it blank.
· Nothing may appear on a form the applicant signs that they were not shown and did
  not adopt. This is the same rule as "never infer a sworn answer" — it applies to
  prefilled prose exactly as it applies to a Yes/No.
```

---

# VERIFY

```
 1. A concierge applicant sees the same card design, the same "How to get this"
    panels and the same residence-proof picker as a self-guided one.
 2. Nothing in the portal navigates a concierge case to /portal/checklist; visiting
    it directly redirects to /portal/concierge.
 3. RequirementsChecklist and DocumentVault render the SAME card component — the
    duplicated markup is deleted, not orphaned.
 4. "Request help" appears on DMV-01 in the concierge view, and not for self-guided.
 5. "Find me an instructor" appears on TRN-01 in the concierge view and sends the
    email; the copy leads with 18 hours.
 6. The address split confirmation card is gone; the worksheet still shows a correct
    building/street split.
 7. Filling the employer with a start date 2 years ago seeds one employment row and
    asks for anything before that date; a start date 7 years ago says the window is
    covered. Editing a seeded row survives a later employer edit.
 8. A history row typed and abandoned without clicking anything is still there on
    reload.
 9. A concealed-carry LON shows three contiguously numbered questions and NEVER
    reports LetterOfNecessity1 as missing.
10. A generate with anything missing produces NO document and a clear, styled alert
    naming what is needed and where to enter it.
11. The generated LON for a concealed-carry case leaves the out-of-scope boxes
    BLANK — no prefilled "carried only for my job" text.
12. Both surfaces agree on which requirements exist for the case. A requirement
    visible on one is visible on the other.
```

# DO NOT

- Do not fix this by copying the checklist components into the concierge page. One
  component, two hosts.
- Do not leave `/portal/checklist` reachable as a dead end for concierge cases.
- Do not require a field the applicant was never shown.
- Do not store a generated document when a required field is missing.
- Do not print prefilled prose on a signed form that the applicant did not see.
- Do not ask the applicant to verify our own parsing.
