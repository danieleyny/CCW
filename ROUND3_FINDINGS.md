# Round 3 — the pipeline is done. Two items left.

Repo at `2f1637d`, same method: real code paths, complete applicant.
**Suite: 381 passed** (was 368), 184 skipped.

```
                        R1        R2        R3
Application fields      64/123    70/123    70/123
Worksheet rows          10/35     34/36     35/36
Addendum (3 "yes")      —         4/6 ✗     6/6 ✓
Section B lists in repo 5 copies  5 copies  1 shared constant
```

## The Q20a bug is fixed, and fixed properly

`lib/forms/section-b.ts` is now the one exported list; `templates.ts` and
`application-readiness.ts` import it, and `tests/section-b-list.test.ts` fails if a
consumer redefines it, drops `20a`, or misplaces it relative to 20 and 21. It also
asserts the addendum builder actually emits a `20a` row.

I rendered it: **15, 20a, 23 — three rows, in form order, each with its
explanation.** The right fix, not a patch on the symptom.

## Everything else from rounds 1 and 2 still holds

```
✓ Q23=yes with NO wizard row → hasArrestHistory, anyQuestionYes  [disclosure-store]
✓ all-"no" → anyQuestionYes false, so no addendum
✓ empty case → ZERO Section B keys, readiness 1/16 with 15 named items
✓ page 4 letter of necessity 6/6 · standalone LON 6/6
✓ dates US · worksheet 35/36 (the one blank is alien registration — correct)
✓ prepared PD 643-041 leads the filing pack, watermarked when not ready
✓ precinct note now carries the nyc.gov find-your-precinct link
```

Coverage map: **24 ok · 8 at_filing · 5 partial · 2 gap** across 39 fields. Part 9's
four fields were resolved as `at_filing` with notes — surfaced on the worksheet as
labelled blanks rather than silently missing. That was the right call.

The application still reads 70/123 because those four became deliberate blanks, not
new fills. For a complete applicant the 53 empties are now: 15 deliberate, 10 not
applicable, 14 unused history rows, 10 precinct (documented + linked), 4 at_filing.
**Nothing is unaccounted for.** That is a finished form.

---

# 1. Certificate of Relief from Disabilities — the last real documentary gap

```
config/application-coverage.ts:423   status: "gap"
  "Original Certificate of Relief from Disabilities (if ever convicted of a felony
   or a serious offense per P.L. §265.00(17))"
  notes: "Named in the arrest instructions and in ARR-01's help text, but not a
   tracked requirement with its own document."
```

An applicant with a qualifying conviction is *told* about it in help text and has
**no slot to upload it**, so nothing tracks it and nothing blocks assembly without
it. The NYPD checklist requires an original, signed certificate for a felony or a
serious offence — this is a filing-blocking document for the population that needs
it most, and it is the one thing in the package a concierge service exists to catch.

```
Add CRD-01 (or fold it into ARR-01 as a conditional sub-document):
· Conditional on a conviction, not merely on an arrest — Q23 "yes" alone is not
  enough. ARR-01's per-arrest capture should record disposition; a felony or serious
  offence conviction is what spawns it.
· mode "obtain". ORIGINAL, signed — say so in the help text; a copy is refused.
· Blocking on the tracks where it applies (carry, premises, special carry).
· Surface it in the filing pack's upload guide like any other document.
```

# 2. The coverage map now describes the previous architecture

Not a functional bug — the fill is correct and verified. But this is the document a
future audit reads to know where you stand, and it has drifted:

```
23 of 39 entries declare  capture: { kind: "intake", ref: <WizardAnswers key> }
 0 of 39 declare          capture: { kind: "fact",   ref: <fact key> }
```

Among those 23: `dob`, `placeOfBirth`, `heightInches`, `safeguardMethod`,
`safeguardName`, `residenceHistory`, `employmentHistory`, `questionnaire`, `arrests`,
`ordersOfProtection`, `domesticIncidents`. **Every one of those now lives in
`case_facts` or `requirement_answers`.** The map says wizard.

Worse, its own guard asserts the stale shape: *"every intake-captured field points at
a real WizardAnswers key"* passes **because** the map still describes the old world.
A test that locks in the wrong architecture is how the next Q20a hides.

```
· Add a "fact" capture kind and a "requirement_answers" kind.
· Re-point each of the 23 at the store the code actually reads.
· Change the guard: a fact-ref must exist in the FACTS registry; a
  requirement_answers ref must be a real req_code; only genuinely legacy fields may
  still declare intake.
· Same pass fixes q24_26_orders_of_protection, whose note still says Q25/26 "isn't
  separately structured" — the disclosure store carries q24, q25 and q26 separately
  and deriveConditionFlags reads all three.
```

---

# WHERE THIS LEAVES THE PRODUCT

The automatic-once-the-info-is-in goal is met for the application itself. A complete
concierge applicant now gets a filled PD 643-041 leading a filing pack, a worksheet
that matches it, an addendum that carries every "yes", a letter of necessity on the
NYPD's own form, and an honest readiness gate that names what is missing and links to
where to fix it.

Item 1 is the last thing I'd call required. Item 2 is hygiene — but it is the
hygiene that keeps the next round honest.

Still outside anything I can test from here: **the browser flow, uploads, storage and
RLS, and the 20 skipped DB suites.** Those need a live run before you put a real
applicant through this.

# VERIFY

```
1. An applicant with a felony conviction sees a Certificate of Relief requirement,
   blocking, with "original, signed" in the help text; an applicant with a dismissed
   arrest does not.
2. Coverage map: no entry claims an intake ref for a field the code reads from
   case_facts or requirement_answers; the guard enforces it.
3. Re-run the complete-applicant fill: still 70/123, addendum still emits 20a,
   empty case still sets zero Section B keys.
```
