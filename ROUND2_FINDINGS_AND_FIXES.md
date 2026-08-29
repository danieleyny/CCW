# Round 2 — where the final document stands

Same method as before: repo at `b96706b` installed in a Linux workspace, real code
paths driven with a complete applicant (every fact, two residence rows, two
employment rows, safeguard block, all twenty disclosures, six letter-of-necessity
statements). **Your suite: 368 passed, 184 skipped.** Still no browser/upload/RLS
coverage — that needs a human pass.

## The numbers moved

```
                          ROUND 1        ROUND 2
Application fields set    64 / 123       70 / 123
Worksheet rows filled     10 / 35        34 / 36
Readiness                 15/15 "ready"  16/16 "ready", with a standing note
                          (dishonest)    (honest)
```

## What the 53 blanks actually are

```
15  deliberate — SSN, the 12 handgun cells, two signature-date blocks
10  not applicable to this applicant — premises sub-type, alias, alien reg,
    renewal licence no., the five out-of-city cells
14  unused history rows 3 and 4 (he has two of each)
10  precinct fields — now a DOCUMENTED deliberate blank (see below)
 4  genuinely unmapped (Part 9, below)
```

So the honest score for a complete applicant is **70 filled, 4 unmapped, 10
deliberately blank, 39 correctly empty.** That is a finished form, not a sparse one.

---

## VERIFIED FIXED

```
✓ PART 1 — the one that mattered. deriveConditionFlags() reads the disclosure store
  and logs which source won. Tested directly:
     Q23=yes, NO wizard → hasArrestHistory:true, anyQuestionYes:true  [disclosure-store]
     Q25=yes            → hasOopHistory:true, anyQuestionYes:true
     all-"no"           → anyQuestionYes:false   (so NO addendum — correct)
     nothing answered   → every flag false, no silent yes
  And rematerializeCase now runs on disclosure save (portal/requirements/actions.ts:92)
  instead of bailing on a missing intake row.

✓ PART 2 — worksheet takes ApplicationValues. 34 of 36 rows carry a real value; the
  two blanks are correct (alien registration, other-NYC-licence — neither applies).

✓ PART 3 — the prepared PD 643-041 is first in the filing pack, with
  stampIncompleteDraft wired for partial cases.

✓ PART 4 — page 4 renders all six Letter of Necessity statements. The standalone
  nypd_letter_of_necessity fills 6/6. Both templates registered; the employer/
  applicant split (1/3/5 vs 2/4/6) is in.

✓ PART 6 — dates are US. DOB renders 04/12/1990; Q29 renders 03/2021, 07/2018.
  usDate/usMonthYear pass non-ISO input through untouched, which is right.

✓ PART 8 — readiness now checks the Letter of Necessity and counts Q20a.

✓ REGRESSION HOLDS — an empty case still sets ZERO Section B keys.
```

---

# BUG — a "yes" on Q20a never reaches the addendum

I filled PD 643-041A with three "yes" answers: Q15, **Q20a**, Q23. **The rendered
form lists 15 and 23 only.** Four text fields applied, not six. Q20a is silently
dropped.

## Root cause: four copies of the Section B list, and one still says 19

```
lib/requirements/questionnaires.ts:145   "20a" present  ✓
lib/forms/templates.ts:473               "20a" present  ✓  (the application fill)
lib/forms/application-readiness.ts:33    "20a" present  ✓
config/application-coverage.ts:308       "20a" present  ✓

lib/forms/templates.ts:80  SECTION_B_NUMBERS = ["10"…"20","21"…"28"]   ✗ NO 20a
                           ↑ used by nypd_disclosure_addendum.build()
```

The old comment on that constant explained itself: *"kept inline here to avoid a
lib/forms → lib/requirements dep."* That duplication is the bug. Part 5 was applied
to four lists and missed the fifth.

**The consequence is the exact failure we have been chasing:** Q20a ticked "yes" on
page 2 of the application, and no explanation anywhere on the addendum. An
unexplained "yes" on a sworn form.

## Fix

```
ONE exported list, imported everywhere. Put it wherever the dependency direction
allows — a tiny lib/forms/section-b.ts is fine — and delete all four copies.

  export const SECTION_B_NUMBERS = ["10","11","12","13","14","15","16","17","18",
    "19","20","20a","21","22","23","24","25","26","27","28"] as const   // 20 items

Then a test that FAILS if any list drifts:
  · length === 20 and includes "20a"
  · the addendum, the application fill, readiness, the worksheet and the coverage
    map all derive from the same import — assert by identity, not by value
  · an addendum built with q20a:"yes" contains a row whose number is "20a"

Do the last one by RASTERISING and reading the row, not by inspecting /V. That is
how this one hid: the fill reported success with four fields applied and nobody
counted that it should have been six.
```

---

# STALE — the coverage map now under-reports itself

`config/application-coverage.ts` still carries `status: "gap"` for:

```
letter_of_necessity    — implemented this round (LON-01 + both templates)
safeguard_ack_form     — implemented (nypd_safeguard_acknowledgement)
```

The map is the thing a future audit reads to know where you stand, and it is now
wrong in the flattering-to-nobody direction: it reports gaps that are closed. Update
both to `ok`, and let `tests/application-coverage.test.ts`'s "known gaps are exactly
the ones we've documented" assertion catch the next drift.

Remaining real gaps in that map, correctly marked: `residence_precinct`,
`certificate_of_relief`.

---

# PART 9 — the four still-unmapped fields, now the only ones left

```
DoYouPosessAnyOtherNYC_handgunLic    coverage says "partial" — we capture the yes/no
OtherNYC_handgunLicType              …but not the type
OtherNYC_handgunLicNo                …or the licence number
HowManyOtherPersonsHaveNYC_handgunLice   Section A Q8 — matters on a guard case
```

Two of these are one small collection: if the applicant holds another NYC handgun
licence, ask for its type and number. The fourth is a single number the sponsor
knows. Either collect them or mark them `at_filing` so they print on the worksheet
as labelled blanks — what they must not do is stay invisible.

---

# PRECINCTS — I think the call you made is right

Part 7 was resolved as a deliberate blank with a standing note on the readiness card:

> "Precinct numbers (residence, employment, business) are left blank — write in your
> NYPD precinct on each row at filing."

A derived-but-wrong precinct on a sworn form is worse than a blank one, and the
applicant knows their own precinct. Leaving it visible and explained is the better
trade. One improvement worth making: put the precinct lookup link
(nyc.gov precinct finder) next to that note so it is a thirty-second job rather than
a homework assignment.

---

# ORDER

```
1. The Q20a addendum bug — one shared list, one drift test. Small, and it is a
   sworn-form correctness fix.
2. The two stale coverage-map statuses.
3. Part 9's four fields — collect or mark at_filing, explicitly.
4. The precinct-finder link.
```

# VERIFY

```
1. Addendum with q20a:"yes" → RENDERS a row numbered 20a with its explanation.
2. All five Section B lists resolve to the same imported constant; a test fails if
   one is redefined locally.
3. Coverage map reports no gap for the letter of necessity or the safeguard
   acknowledgement.
4. Re-run the complete-applicant fill: 74 of 123 once Part 9 lands (70 + 4).
5. Empty case STILL sets zero Section B keys — check this every round.
```
