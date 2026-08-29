# End-to-end audit — concierge applicant → filed-ready package

## How this was run, and what it does not cover

I could not literally click through a signup: there is no browser session on the
live site from here, and the app cannot run on your machine's shell (no network to
Supabase). So I did the next most honest thing — I took the repo at
`736c498`, installed it in a Linux workspace, and **drove the real code paths** with
a fully-populated applicant: every editable fact answered, two residence rows, two
employment rows, the safeguard block, and all twenty Section B questions answered
explicitly (two "yes" with explanations).

That exercises `buildApplicationValues` → `fillTemplate` → the real PDF, plus
`computeApplicationReadiness`, `buildWorksheet`, the requirement generator and the
filing-pack assembler. It does **not** cover the browser UI, file upload, storage,
RLS, or the admin screens. Those still need a human pass.

**Your test suite: 358 passed, 184 skipped (the 20 DB suites need a live Supabase).**

---

## WHAT WORKS — and it's the part that mattered most

```
✓ FIX A HOLDS. An empty case sets ZERO Section B keys. No inferred sworn "No"
  anywhere. This was the dangerous one and it is properly fixed.
✓ Readiness on an empty case: ready=false, 1/15, every missing item named and
  linked. Exactly the honest gate that was asked for.
✓ All 22 dual-widget choices applied — Section B, LicenseType, AlienOrCitizen.
  No .check() trap.
✓ fillTemplate reported `missing: []` — every field build() maps exists on the PDF.
✓ Narrow-column font sizing works: "Security officer" fits, Q31 splits across its
  two lines.
✓ Q29 row 1 correctly omits the "To" field (PRESENT is pre-printed).
✓ Reference composition (family caps by track) and ID front-and-back are both in.
```

The complete applicant produced **64 of 123 fields**. Of the 59 empty, ~35 are
correctly empty — SSN, the handgun list, the out-of-city block, alien registration,
history rows 3–4, signature blocks. The rest are the findings below.

---

# BLOCKER 1 — the conditional requirement layer is dead for every concierge case

This is the largest finding and it is not visible from any screen.

```
lib/onboarding.ts:104
  materializeCaseRequirements(admin, kase.id, "nyc", { isCarry: true })
  // comment: "conditional rules refine after intake"

lib/intake/answers.ts:265
  anyQuestionYes: (a.questionnaire ?? []).some((q) => q.yes)
  hasArrestHistory / hasOopHistory / hasDomesticIncident / hasNameChange /
  hasCohabitants / isVeteran  — ALL computed from WizardAnswers only

lib/portal/intake-gate.ts:91
  if (myCase.service_mode === "concierge") return null   // never sees the wizard

lib/requirements/rematerialize.ts:27
  if (!answers || Object.keys(answers).length === 0) return null
```

A concierge case gets the baseline set on day one and **is never refined**, because
refinement reads `intake_sessions`, which for a concierge case is empty by design.
The admin "re-materialize" button you just built (`f870bc7`) returns `null` on
exactly these cases — the escape hatch is disabled on the cases that need it.

**What never spawns for a concierge applicant:**

```
QUE-01  PD 643-041A addendum      ← MANDATORY whenever any answer is "yes"
ARR-01  arrest statements
OOP-01  order-of-protection statement
DIR-01  domestic-incident statement
NAM-01  proof of name change
COH-01/02  cohabitant affidavits
MIL-01  military discharge
```

So: your applicant answers **"yes" to Q23 — arrested** in the disclosure
questionnaire. `anyQuestionYes` reads the wizard store, finds nothing, stays false,
and **no addendum is ever created**. The form's own instruction is that every "yes"
must be explained on PD 643-041A. The application goes to One Police Plaza with a
ticked "yes" and no explanation attached.

**FIX**

```
Build the generator's condition bundle from the SAME canonical stores the
application now reads — case_facts + requirement_answers — not WizardAnswers.

  anyQuestionYes     ← any q10…q28 === "yes" in the disclosure store
  hasArrestHistory   ← ARR-01 answers / an explicit q23 === "yes"
  hasOopHistory      ← q24 | q25 | q26 === "yes"
  hasDomesticIncident← q27 === "yes"
  hasNameChange      ← q28 === "yes" (or the name-change fact)
  isVeteran          ← q15 === "yes"
  hasCohabitants     ← the cohabitant roster, not intake

Then RE-MATERIALIZE ON EVERY DISCLOSURE SAVE, not just at intake. Answering "yes"
to Q23 should make the addendum and the arrest-statement requirements appear on the
checklist within the same request.

And make rematerializeCase work with no intake row: fall back to the canonical
stores rather than returning null. A concierge case is the normal case now.
```

---

# BLOCKER 2 — the Filing Pack's "what to type in" worksheet is empty

`lib/packet/filing-pack.ts:57` reads `intake_sessions.answers` and passes it to
`buildWorksheet`, which reads `WizardAnswers` only.

Measured, for an applicant who has filled everything on `/portal/details` and
answered all twenty disclosures:

```
WORKSHEET: 10 of 35 rows carry a real value.

"— not answered yet —" printed for:  M.I. · Citizen/Alien · Alien Registration ·
Place of Birth · Date of Birth · Age · Height/Weight/Sex/Hair/Eyes · ALL of
Section B Q10–Q22 · both five-year histories (Q29) · Q30 · Q31
```

This is the 9-of-123 bug, unfixed, in the document you actually hand the applicant
to type from. **FIX:** `buildWorksheet` takes resolved facts + the disclosure store,
same as `buildApplicationValues`. One resolver, three consumers.

---

# BLOCKER 3 — the prepared application is not in the filing pack

`assembleFilingPack` merges the front matter (worksheet + upload guide) with
`assemblePacket` (uploaded and generated documents). **The filled PD 643-041 is not
in it.** It lives behind a separate button, as a separate download, on a different
card.

The applicant's mental model is "download my package and go." They will download the
pack, not find the application, and file without it — or not realise the prepared
draft exists at all. **FIX:** the prepared application is the first document in the
pack, immediately after the front matter.

---

# BLOCKER 4 — the Letter of Necessity is missing for carry applicants

Three separate problems stacked:

```
1. Page 4 of the prepared application renders COMPLETELY BLANK. templates.ts reads
   v.lop1…lop6; buildApplicationValues never sets them. I rendered it — six empty
   boxes on a carry application.

2. assets/form-templates/letter-of-necessity.pdf IS NOT REGISTERED in
   lib/forms/templates.ts. The file is on disk and unreferenced.
   (Same for public-records-exemption.pdf.)

3. The only letter-of-necessity requirement is SPN-02 — a SPONSOR requirement,
   conciergeScope "hidden", mode "obtain", asking for "a letter on company
   letterhead."
```

The form's own words: **"In ALL CASES the form provided must be used."** A letter on
letterhead is not the form. And a non-sponsored concealed-carry applicant — my test
case — gets no letter of necessity from anywhere at all.

**FIX:** register the template; add a non-sponsor requirement for the carry tracks;
collect the six statements (the employer supplies 1, 3 and 5 on a sponsored case);
fill page 4 of the application from the same six values.

---

# HIGH 5 — Q20a can never be answered

```
questionnaires.ts:112  "Q20 folds the form's 20 and 20a (both ask about corporate licences)."
```

They are not the same question:

```
Q20  Has any CORPORATION OR PARTNERSHIP of which you are an officer, director or
     partner ever applied for or been issued a licence by the Police Dept?   → the ENTITY
Q20a Has any OFFICER, DIRECTOR OR PARTNER ever applied for or been issued a
     licence by the Police Department?                                       → the PEOPLE
```

An applicant whose company holds no licence but whose business partner personally
holds one answers **no** to 20 and **yes** to 20a.

`templates.ts` correctly includes `"20a"` in its fill loop, so the plumbing is
ready — but nothing ever produces `q20a`, so `SectionB20a` renders `/Off`: an
unanswered sworn question. And `application-readiness.ts:26` omits `20a` from
`SECTION_B_NUMBERS`, so the gate reports **"0 of 19"** and calls a case with an
unanswered Q20a *ready*.

**FIX:** unfold them. Twenty questions, twenty answers, in all three lists
(questionnaires, readiness, worksheet).

---

# HIGH 6 — ten precinct fields are never filled

```
ResidencePrecinct1–4 · EmploymentPrecinct1–4   no mapping in build() at all
Res Pct                                        maps to v.resPct — never set
Bus Pct                                        no mapping at all
```

The form asks for a precinct on every residence and employment row. All ten come
out blank, on every application, for every applicant.

**FIX:** derive the precinct from each address (the NYC precinct-finder dataset, or
a borough+ZIP table) and leave it editable — a wrong precinct is a correction, a
blank one is homework. If you'd rather not derive it, collect it as a field; what
you cannot do is ship the form with the column empty and call it ready.

---

# HIGH 7 — dates print in ISO format on a government form

Rendered from the real fill:

```
Date of Birth      1990-04-12      should be 04/12/1990
Q29 From / To      2021-03         should be 03/2021   (column reads "MONTH AND YEAR")
```

Every date on the form is affected. **FIX:** format at the boundary — store ISO,
render US. One helper, applied in `build()`, plus a test that asserts the rendered
string.

---

# MEDIUM 8 — the readiness gate is over-optimistic

My complete applicant scored `ready: true, 15/15` while the Letter of Necessity was
blank, ten precinct fields were blank, and Q20a was unanswered. The gate counts 15
things; the form has considerably more that matter.

It is not wrong the way the old one was — it is honest about what it checks. But it
should check the track-mandatory items too: letter of necessity on a carry track,
Q20a, and either precincts or an explicit "you'll fill these in by hand" note.

# MEDIUM 9 — unmapped Section A fields

```
DoYouPosessAnyOtherNYC_handgunLic · OtherNYC_handgunLicType · OtherNYC_handgunLicNo
HowManyOtherPersonsHaveNYC_handgunLice   (Section A Q8 — matters on a guard case)
LicenseNumber_renewal_applicant          (renewals)
Issued By                                (out-of-city block; the other four map)
```

None are collected, none are filled. Decide for each: collect it, or mark it
deliberately at-filing so it shows on the worksheet as a labelled blank rather than
silently vanishing.

# MEDIUM 10 — public-records-exemption.pdf is on disk but not offered

We agreed hand-fill for v1 — but it isn't registered, isn't in the requirement set,
and is never mentioned to the applicant. It's a genuine concierge value-add that
costs one checkbox and a printed page. At minimum, offer it.

---

# SUGGESTED ORDER

```
1. BLOCKER 1  — conditional requirements from the canonical stores + re-materialize
                on disclosure save. Nothing else matters if the addendum is missing.
2. BLOCKER 2  — worksheet from resolved facts.
3. BLOCKER 4  — letter of necessity, all three parts.
4. HIGH 5/7   — Q20a unfold; date formatting. Both small, both on a sworn form.
5. BLOCKER 3  — application into the filing pack.
6. HIGH 6     — precincts.
7. MEDIUM 8/9/10.
```

# VERIFY

```
1. Concierge case, no intake row, answer "yes" to Q23 in the disclosure
   questionnaire → QUE-01 and ARR-01 appear on the checklist in the same request.
2. Same case: the generated PD 643-041A lists question 23 with its explanation, and
   an all-"no" case generates no addendum at all.
3. Filing pack Part 1 for a complete concierge applicant: 35 of 35 rows carry a real
   value, except the deliberate at-filing blanks.
4. The filled PD 643-041 is the first document after the front matter in the pack.
5. A carry applicant's page 4 has all six letter-of-necessity statements.
6. Q20 = no, Q20a = yes renders SectionB20 /No and SectionB20a /Yes. Readiness says
   "20 of 20".
7. DOB renders 04/12/1990; Q29 renders 03/2021.
8. Precinct columns are populated (or explicitly flagged as hand-fill).
9. RASTERISE every one of these and look at the page. Field values in /V are not
   evidence — this template stores text that renders blank if appearances aren't
   generated with an embedded font.
10. Re-run the complete-applicant harness: expect ≥100 of 123 set, up from 64.
```
