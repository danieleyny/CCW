# Finish the concierge application pipeline

Ten findings from an end-to-end run of the real code paths at `736c498` with a
fully-populated applicant. The prepared PD 643-041 came back **64 of 123 fields**,
and the readiness gate called it **ready**.

**Read this first — it collapses four of the findings into one.** The compliance
work moved the canonical stores to `case_facts` (identity, address, employer,
safeguard) and `requirement_answers` (Section B disclosures). `buildApplicationValues`
was updated to read them. **Three other consumers were not**, and still read
`WizardAnswers`, which is empty by design for a concierge case:

```
lib/intake/answers.ts:265      the requirement generator's condition bundle
lib/requirements/worksheet.ts  the filing-pack "what to type in" sheet
lib/requirements/rematerialize.ts:27   returns null when intake_sessions is empty
```

Parts 1, 2 and 3 below are that one migration finished. Do them together.

---

# PART 1 — Conditional requirements must read the canonical stores

## The failure

`lib/onboarding.ts:104` seeds the baseline with `{ isCarry: true }` and leaves the
rest to "refine after intake." `lib/portal/intake-gate.ts:91` means a concierge case
never sees intake. `lib/intake/answers.ts:265` computes every condition flag from
`WizardAnswers`. So for a concierge applicant every flag is permanently false.

**Nothing conditional ever spawns:**

```
QUE-01  PD 643-041A addendum      ← MANDATORY whenever any Section B answer is "yes"
ARR-01  arrest statements
OOP-01  order-of-protection statement
DIR-01  domestic-incident statement
NAM-01  proof of name change
COH-01/02  cohabitant affidavits
MIL-01  military discharge
```

An applicant answers **"yes" to Q23 — arrested**. `anyQuestionYes` reads the wizard
store, finds nothing, stays false, and no addendum is created. The application is
filed with a ticked "yes" and no explanation attached. That is the single most
consequential defect in the system right now.

## Do this

```
Build the condition bundle from the canonical stores, not WizardAnswers:

  anyQuestionYes      ← any q10…q28 === "yes" in requirement_answers (DSC-01/QUE-01)
  hasArrestHistory    ← q23 === "yes"  (or ARR-01 answers)
  hasOopHistory       ← q24 || q25 || q26 === "yes"
  hasDomesticIncident ← q27 === "yes"
  hasNameChange       ← q28 === "yes", or the name-change fact
  isVeteran           ← q15 === "yes"
  hasCohabitants      ← the cohabitant roster, not intake

Keep WizardAnswers as a fallback for legacy cases. Log which source won, the same
way buildApplicationValues already does.

RE-MATERIALIZE ON EVERY DISCLOSURE SAVE — not only at intake. Answering "yes" to
Q23 must make the addendum and arrest-statement requirements appear on the checklist
in the same request. A requirement that only appears if you happened to pass through
a wizard is not a requirement.

FIX rematerializeCase: `if (!answers || Object.keys(answers).length === 0) return null`
must not bail. Fall back to the canonical stores. A concierge case is the normal
case now, and the admin re-materialize button is currently a no-op on exactly the
cases that need it.
```

---

# PART 2 — The filing-pack worksheet reads the wrong store

Measured, for an applicant who filled everything on `/portal/details` and answered
all twenty disclosures: **10 of 35 rows carry a real value.** It prints
"— not answered yet —" for M.I., citizenship, place of birth, date of birth, age,
the whole physical description, **all of Section B Q10–Q22**, both five-year
histories, Q30 and Q31.

This is the 9-of-123 bug, unfixed, in the document you hand the applicant to type
from.

```
buildWorksheet takes resolved facts + the disclosure store, exactly like
buildApplicationValues. One resolver, three consumers — the application, the
worksheet, and the requirement generator — reading the same values.
```

---

# PART 3 — The prepared application is not in the filing pack

`assembleFilingPack` merges front matter with `assemblePacket`. The filled PD 643-041
is not in it — it lives behind a separate button on a different card.

The applicant's model is "download my package and go." They will file without it, or
never learn the prepared draft exists.

```
Put the prepared application first in the pack, immediately after the front matter,
under its own heading. Keep the standalone button as well.
```

---

# PART 4 — The Letter of Necessity is missing for carry applicants

Three problems stacked:

```
1. Page 4 of the prepared application renders COMPLETELY BLANK. templates.ts reads
   v.lop1…lop6; buildApplicationValues never sets them.
2. assets/form-templates/letter-of-necessity.pdf IS NOT REGISTERED in
   lib/forms/templates.ts. On disk, unreferenced. Same for public-records-exemption.pdf.
3. The only LON requirement is SPN-02 — sponsor-only, conciergeScope "hidden",
   mode "obtain", asking for "a letter on company letterhead."
```

The form's own words: **"In ALL CASES the form provided must be used."** A letter on
letterhead is not the form. And a non-sponsored concealed-carry applicant gets no
letter of necessity from anywhere at all.

```
· Register nypd_letter_of_necessity against letter-of-necessity.pdf
  (fields: LetterOfNecessity1…6, LetterOfNecessitySignatureDate)
· Add a letter-of-necessity requirement to the CARRY tracks, not only sponsored ones
· Collect the six statements. On a sponsored case the employer supplies 1, 3 and 5;
  the applicant supplies 2, 4, 6 and signs
· Fill page 4 of the application from the same six values — one source, two surfaces
```

---

# PART 5 — Q20a can never be answered

`lib/requirements/questionnaires.ts:112` says *"Q20 folds the form's 20 and 20a
(both ask about corporate licences)."* They are not the same question:

```
Q20   Has any CORPORATION OR PARTNERSHIP of which you are an officer, director or
      partner ever applied for or been issued a licence by the Police Dept?  → the ENTITY
Q20a  Has any OFFICER, DIRECTOR OR PARTNER ever applied for or been issued a
      licence by the Police Department?                                      → the PEOPLE
```

An applicant whose company holds no licence but whose business partner personally
holds one answers **no** to 20 and **yes** to 20a.

`templates.ts` already includes `"20a"` in its fill loop, so the plumbing is ready —
but nothing produces `q20a`, so `SectionB20a` renders `/Off`: an unanswered sworn
question. And `application-readiness.ts:26` omits `20a`, so the gate reports
**"0 of 19"** and calls such a case ready.

```
Unfold them. Twenty questions, twenty answers, in ALL THREE lists:
questionnaires.ts SECTION_B_QUESTIONS · application-readiness.ts SECTION_B_NUMBERS ·
the worksheet's Section B rows. templates.ts is already correct.
```

---

# PART 6 — Dates render in ISO on a government form

From the real fill:

```
Date of Birth    1990-04-12     must be 04/12/1990
Q29 From / To    2021-03        must be 03/2021   (the column reads "MONTH AND YEAR")
```

Every date on the form is affected.

```
Format at the boundary: store ISO, render US. One helper applied in build(), and a
test that asserts the RENDERED string, not the stored value.
```

---

# PART 7 — Ten precinct fields are never filled

```
ResidencePrecinct1–4 · EmploymentPrecinct1–4    no mapping in build() at all
Res Pct                                          maps to v.resPct — never set
Bus Pct                                          no mapping at all
```

The form asks for a precinct on every residence and employment row. All ten come out
blank on every application.

```
Derive the precinct from each address (NYC precinct dataset, or a borough+ZIP table)
and leave it EDITABLE — a wrong precinct is a correction, a blank one is homework.
If you won't derive it, collect it. What you cannot do is ship the column empty and
report the form ready.
```

---

# PART 8 — Make the readiness gate check what actually blocks a filing

A complete applicant scored `ready: true, 15/15` with the Letter of Necessity blank,
ten precinct fields blank, and Q20a unanswered. The gate isn't dishonest — it just
counts fifteen things, and the form has more that matter.

```
Add to the checked set:
  · letter of necessity, on the carry tracks (blocking)
  · Q20a (part of the Section B count once Part 5 lands — "20 of 20")
  · precincts — either populated, or an explicit "you'll write these in" note that
    appears on the readiness card rather than silently passing
```

---

# PART 9 — Unmapped Section A fields

```
DoYouPosessAnyOtherNYC_handgunLic · OtherNYC_handgunLicType · OtherNYC_handgunLicNo
HowManyOtherPersonsHaveNYC_handgunLice   (Section A Q8 — matters on a guard case)
LicenseNumber_renewal_applicant          (renewals)
Issued By                                (out-of-city block; the other four map)
```

For each: collect it, or mark it deliberately at-filing so it appears on the
worksheet as a labelled blank instead of silently vanishing. Silence is the problem —
either choice is fine, made explicitly.

---

# PART 10 — Offer the public records exemption

`public-records-exemption.pdf` is on disk, unregistered, in no requirement, never
mentioned. Hand-fill is fine for v1 — but offer it, with a plain explanation of what
PL § 400.00(5)(b) does. It costs a checkbox and a printed page and it is a real
concierge value-add.

---

# ORDER

```
1. PARTS 1–3   the finished store migration. Nothing else matters if the
               addendum is missing and the worksheet is blank.
2. PART 4      letter of necessity, all three pieces.
3. PARTS 5–6   Q20a and date formatting. Small, and both on a sworn form.
4. PARTS 7–8   precincts, then the gate that reports on them.
5. PARTS 9–10  explicit decisions on the remainder.
```

# VERIFY

```
1. Concierge case, NO intake row, answer "yes" to Q23 → QUE-01 and ARR-01 appear on
   the checklist in the same request.
2. The generated PD 643-041A lists question 23 with its explanation. An all-"no"
   case generates NO addendum at all.
3. Filing-pack Part 1 for a complete concierge applicant: 35 of 35 rows carry a real
   value, except the deliberate at-filing blanks.
4. The filled PD 643-041 is the first document after the front matter in the pack.
5. A carry applicant's page 4 carries all six letter-of-necessity statements.
6. Q20 = no and Q20a = yes renders SectionB20 /No and SectionB20a /Yes. Readiness
   reads "20 of 20".
7. DOB renders 04/12/1990. Q29 renders 03/2021.
8. Precinct columns are populated, or explicitly flagged on the readiness card.
9. An empty case STILL sets zero Section B keys. Do not regress this while wiring the
   new stores — it is the one thing that is currently right.
10. Re-run a complete-applicant fill: expect ≥100 of 123 set, up from 64.
```

# DO NOT

- Do not read a condition flag from `WizardAnswers` without a canonical-store path
  in front of it and a log line saying which won.
- Do not infer a Section B answer from an empty collection. That fix is in; keep it.
- Do not report a form ready while a track-mandatory document is blank.
- Do not assert on `/V` — rasterise the page and check the rendered text. This
  template stores values that render blank without embedded-font appearances.
