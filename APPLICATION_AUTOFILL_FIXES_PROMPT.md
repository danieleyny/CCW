# The prepared application comes back 9 fields out of 123 — fix the pipeline

A live test on the "Josh Test" applicant account produced a PD 643-041 draft with
**9 of 123 fields set**. This is not a template problem — the template is correct
and verified. It is a data-plumbing problem, and the shape of what filled tells you
exactly where.

## The evidence — read this before changing anything

```
FILLED (9)                       WHERE IT CAME FROM
1_LastName   = "Test"            clients.full_name
1_FirstName  = "Josh"            clients.full_name
Email Address= "josh@gmail.com"  clients.email
State        = "NY"              HARDCODED DEFAULT — registry.ts `?? "NY"`
SectionB23   = /No               computed from an EMPTY array
SectionB24   = /No               computed from an EMPTY array
SectionB27   = /No               computed from an EMPTY array
SectionB28   = /No               computed from an EMPTY string
LicenseType  = /LimitedCarry     cases.license_track

EMPTY (114)  — including every field sourced from case_facts or intake_sessions
```

**Not one field resolved from `case_facts`. Not one from `intake_sessions`.** Every
value that appeared came from the `clients` row, a hardcoded default, or a default
computed from absent data. Both fact stores are empty for this case.

---

## ROOT CAUSE 1 — the Prepare button is on the one page whose data it cannot have

`components/portal/prepare-application-button.tsx` is rendered **only** from
`app/portal/concierge/page.tsx:151`.

`lib/portal/intake-gate.ts:91` — `if (myCase.service_mode === "concierge") return null`
— means a concierge applicant is **never routed through the intake wizard**.

`lib/forms/application.ts` reads these from `intake` and nowhere else:

```
residenceHistory   employmentHistory   safeguardMethod   safeguardName
safeguardRelation  safeguardAddress    safeguardPhone    questionnaire (q10–q22)
outOfCityLicenseNumber / County / IssuedOn / ExpiresOn
```

`components/portal/intake/intake-wizard.tsx` is the only writer of any of them.

So roughly forty fields — the whole of Q29, Q30, Q31 and Section B 10–22 — are
**structurally unreachable for a concierge case**. No admin action fixes it. Nothing
the applicant does fixes it. The data has no door.

## ROOT CAUSE 2 — the disclosure answers are read from the wrong store

The Section B questionnaire now lives in `requirement_answers` (DSC-01 / QUE-01) —
that is where the compliance work put it. `buildApplicationValues` still reads
`intake.questionnaire`.

Two different stores. The applicant can answer all twenty questions correctly and
q10–q22 still come out blank.

## ROOT CAUSE 3 — the form asserts "No" to questions nobody asked

```js
v.q23 = (intake.arrests?.length ?? 0) > 0 ? "Yes" : "No"
v.q24 = (intake.ordersOfProtection?.length ?? 0) > 0 ? "Yes" : "No"
v.q27 = (intake.domesticIncidents?.length ?? 0) > 0 ? "Yes" : "No"
v.q28 = (intake.aliasName ?? "").trim() ? "Yes" : "No"
```

An absent array is not a "no". This printed **"No — never arrested"** and **"No —
no order of protection"** on a sworn NYPD form for an applicant who was never asked.
Under Penal Law § 210.45 a false written statement is a class A misdemeanour, and
under § 400.00(3) the applicant is the one who swears to it.

This is the most serious defect in this report. A blank field is a prompt; a wrong
tick is a false statement.

## ROOT CAUSE 4 — no readiness gate

`prepareApplication` fills whatever it has and hands back a PDF with no warning. The
applicant cannot tell a finished draft from a 9-field one, and nothing tells them
which screen to go fill.

Related: `/portal/profile` writes **only** `clients.full_name` and `clients.phone`.
`/portal/details` is what writes `case_facts`. A person who "filled in their info"
on the profile page has, correctly and invisibly, populated almost nothing.

## ROOT CAUSE 5 — the details screen renders a group with no facts in it

`app/portal/details/page.tsx:13` lists `"safeguard"` in `GROUP_ORDER`. **No fact in
`lib/facts/registry.ts` has `group: "safeguard"`.** The section renders empty.

---

# FIXES

## FIX A — never infer an answer to a sworn question

```
Leave q23/q24/q27/q28 UNSET unless the applicant actually answered.

Distinguish three states everywhere: answered-yes, answered-no, not-asked.
An empty collection means "we never asked", not "no".

Only an explicit recorded answer sets /Yes or /No. Anything else leaves the widget
/Off and the question shows in the readiness report as outstanding.
```

Do this fix first and independently of the rest. It is a correctness fix on a sworn
document and it should not wait on the plumbing work.

## FIX B — one source for Section B

```
Read the disclosure answers from requirement_answers (DSC-01 / QUE-01) — the store
the compliance work made canonical.

Fall back to intake.questionnaire ONLY for legacy cases that still have it, and log
when the fallback fires so the tail is visible.

Map by the NYPD question number, not by array position. Q20a is a distinct key and
sorts between 20 and 21 — do not let it become index 11.
```

## FIX C — give the unreachable data a door

The histories, the safeguard and the out-of-city licence must be collectable by a
concierge applicant. Pick ONE and apply it uniformly:

```
PREFERRED — promote them to the fact layer.
  · Add safeguard facts: safeguard.method · safeguard.name · safeguard.relation
    · safeguard.address · safeguard.phone   (group "safeguard" — the details screen
    already has the slot and currently renders it empty)
  · Add residence and employment history as repeatable fact collections, or as their
    own section on /portal/details with add/remove rows
  · buildApplicationValues then reads facts first, intake as fallback
  → Everything lands in case_facts, one store, reusable across every form, and the
    concierge and self-guided flows both work with no branching.

ALTERNATIVE — route concierge cases through the wizard steps that collect them.
  Narrower change, but it reintroduces two stores for the same facts and the
  employer.* work already went the other way. Only take this if the fact-collection
  UI is genuinely too large right now — and if so, say so rather than half-doing it.
```

Whichever you pick, `Q30` keeps its validation: *"Location outside of N.Y. State is
unacceptable"*, and the Q31 safeguard must be a New York State resident.

## FIX D — a readiness gate on the button

```
Before preparing, compute what is missing and show it.

· The button reports readiness inline: "Ready — 118 of 123 fields" or
  "Not ready — 11 items still needed", with the missing items named and each one
  LINKED to the screen that collects it.
· Below a readiness floor, the primary action becomes "Finish your details" and the
  prepare action is demoted to a secondary "Prepare a partial draft anyway",
  labelled as partial.
· A partial draft is watermarked DRAFT — INCOMPLETE and carries a first-page cover
  sheet listing every unanswered field by its NYPD question number. Nobody should
  be able to walk into One Police Plaza with a 9-field form and not know it.
· Keep the existing continuation-sheet warning for >4 history rows.
```

## FIX E — point people at the right screen

```
/portal/profile saves your name and phone. It is not where the application data
lives. Add a line to that screen saying so, linking to /portal/details.
```

---

# VERIFY

```
1. A case with NOTHING entered: q23/q24/q27/q28 come back /Off, not /No. This is the
   one that matters most — assert it explicitly and keep the test.
2. A case where the applicant answered "no" to Q23: it renders /No. Answered-no and
   never-asked are distinguishable in storage and on the form.
3. Answer all 20 disclosure questions in the concierge requirement flow, prepare the
   application: SectionB10 … SectionB28 all set, 20a correct, none shifted by one.
4. Fill /portal/details completely on a concierge case: every identity, address,
   contact, physical and employer field lands on the PDF.
5. Enter residence + employment history and the safeguard on a CONCIERGE case —
   without touching the intake wizard — and confirm Q29/Q30/Q31 fill.
6. The details screen's "safeguard" group renders real fields, not an empty section.
7. An incomplete case shows "not ready" with named, linked missing items; any PDF it
   still produces is watermarked and carries the missing-field cover sheet.
8. A complete case reaches ≥118 of 123 — everything except the SSN and the handgun
   list, which are deliberately left for filing.
9. RASTERISE the output and look at it. Field values in /V are not evidence; the
   template's field-level /DA problem means text can store and render blank. Assert
   on the rendered page.
```

# DO NOT

- Do not tick a Section B box from an empty collection. Ever.
- Do not read disclosure answers from two stores without logging which one won.
- Do not hand back a PDF that looks finished when it is not.
- Do not solve this by hiding the Prepare button — the applicant needs the draft;
  they need it to be honest about what is missing.
