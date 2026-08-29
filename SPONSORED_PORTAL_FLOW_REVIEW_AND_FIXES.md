# Sponsored portal — flow review & fix prompt

**Reviewed 26 Aug 2026.** I traced the seeded two-party case end to end: the seed script, the fact resolver, the sponsor page render order, the applicant's routing, and the company-form generation you hit an error on.

**Verdict: the architecture is sound and the privacy model holds, but the case cannot currently produce a complete company form — and one required field has nowhere to live at all.** Three blockers, one design question, and a defined running order that does not exist yet.

---

## THE ANSWER TO "IS THERE AN ORDER"

Yes. There are exactly **two hard prerequisites**; everything else is parallel. Today only the first is enforced.

```
1. APPLICANT SIGNS UP            claim-by-email adopts the seeded case
2. APPLICANT GRANTS CONSENT      ← ENFORCED. Sponsor sees nothing before this.
3a. APPLICANT COMPLETES INTAKE   ← NOT ENFORCED. Populates every applicant fact.
3b. SPONSOR COMPLETES COMPANY    ← NOT ENFORCED. Populates every company fact.
    PROFILE  (licence · expiry · custodian · business address/phone/type)
4. Everything else — uploads, rosters, generated documents — in any order
5. Review & sign  →  staff QA  →  CP-5 gate  →  file
```

Steps 3a and 3b are what "the form errored" actually means. **A document that draws on facts must not be generatable before those facts exist.** That is the single missing rule.

---

## BLOCKERS

### B1 — The company form generates from an empty company record

`scripts/seed-sponsor-test.ts:57` creates the sponsor with **only** a legal name:

```js
db.from("sponsors").insert({ legal_name: "Test Guard Co." })
```

`prepareSponsorForm` (`app/sponsor/actions.ts:145`) then resolves and fills:

```
sponsor.agencyLicenseNumber   → null
sponsor.agencyLicenseExpiry   → null
sponsor.custodianName         → null
sponsor.custodianLicenseNumber→ null
```

There is **no guard**. `PrepareCompanyFormButton` is rendered unconditionally, so the sponsor clicks it and gets a form with the licence and custodian blocks empty — the blocks that make the form mean anything.

```
FIX
1. Add a readiness check to prepareSponsorForm: resolve the required facts FIRST
   and return a specific, actionable error naming what is missing —
   "Add your agency licence number and gun custodian before preparing this form."
   Never a generic "Couldn't prepare the form."
2. Disable PrepareCompanyFormButton until those facts exist, with a tooltip
   naming the blocker. A disabled control that says why is better than a live
   control that fails.
3. Define the requirement in one place — reuse the `requires` contract from the
   template registry rather than a second hardcoded list in the action.
```

### B2 — Three required company fields have nowhere to be stored

This is the one that would have bitten you after the demo. The company form maps:

```
businessAddress: f["employer.address.street"]
businessPhone:   f["employer.phone"]
businessType:    f["employer.type"]
```

Those facts resolve **only** from the applicant's own intake (`lib/facts/registry.ts:83–87` → `s.intake.businessStreet` etc). For a sponsored guard **the employer is the sponsor, not something the applicant types.** And the `sponsors` table has no address, phone or business-type columns at all:

```sql
sponsors(id, legal_name, agency_license_number, agency_license_expires,
         custodian_name, custodian_email, custodian_phone,
         custodian_license_number, created_at)
```

So those three fields on the official form **can never be filled**, for any sponsored case. They are also on Pamela's onboarding checklist — she will send them and there is nowhere to put them.

Note the inconsistency that hid this: `employer.name` DOES fall back to the sponsor (`s.sponsor?.legalName ?? s.intake.businessName`); the other six employer facts do not.

```
FIX
1. Migration — add to sponsors:
     business_street · business_city · business_state · business_zip
     business_phone  · business_type · dba_name
     president_owner · qualifying_officer      (both on the company form)
2. Give EVERY employer.* fact a sponsor-first resolution when a sponsorship
   exists:  sponsor value  →  intake.business*  →  null
   Do it uniformly, so employer.name is no longer the odd one out.
3. Surface them in the sponsor's company-profile form alongside the custodian
   fields — one place where Pamela enters the company once.
4. Re-verify the company form fills all 12 mapped fields with a complete record.
```

### B3 — The page puts the dependent control above the control that feeds it

On `app/sponsor/[caseId]/page.tsx`, the SPN-01 row with the "Pre-filled form" button renders at **line 162**. `CustodianForm` — which captures the custodian data that form needs — renders at **line 176**, below it.

The sponsor meets the button before she meets the field.

```
FIX
Reorder the company packet section so it reads as a sequence:
   1. Company profile     (licence · expiry · custodian · business details)
   2. Then the documents, with SPN-01 and its pre-fill button
Add a short gate line above the documents: "Complete your company profile first —
the forms below are pre-filled from it." Collapse or dim the document rows until
the profile is complete.
```

---

## DESIGN QUESTION — which portal does Chery actually land on?

The seed creates the case with `service_mode: "self_guided"` (`seed-sponsor-test.ts:74`). `/portal/concierge` redirects out unless `service_mode === 'concierge'` **and** a paid `full_concierge` package exists — neither is true here.

**So Chery lands on `/portal`, the self-guided home, and works a self-guided checklist.** Every design decision in the sponsored build assumed the concierge surface: the vault, the control tower, "we handle this for you". None of that is what he will see.

```
DECIDE, then implement:
  (a) Give the sponsored case service_mode='concierge' and let a sponsored case
      satisfy the concierge unlock without a Stripe payment — a sponsorship IS
      the commercial relationship here. RECOMMENDED: it is what the whole build
      was designed around, and it is what you demoed.
  (b) Keep him self-guided deliberately, and accept that the concierge surfaces
      are unused for this case.
Do not leave it as an accident of the seed script.
```

---

## THE INTAKE ANSWER — yes, and the seeded one is thin

Intake is what populates every applicant fact, so it is a real prerequisite. The seed pre-completes it, which is convenient for testing and **hides the question of who completes it in the live flow.** For Chery, nobody has.

The seeded answers also fall well short of what the forms need:

```
SEEDED:  dob · residence · borough · licenseType · legalStreet · legalCity ·
         legalState · citizenship · four prohibitor flags

MISSING, and required by forms already in the packet:
  legalZip · legalApt                 (M-522 · company form)
  middleInitial · maiden/alias        (NYPD application)
  placeOfBirth                        (NYPD application)
  height · weight · sex · hair · eyes (NYPD application)
  phone                               (multiple)
  five-year residence history         (Q29)
  five-year employment history        (Q29)
```

```
FIX
1. Make intake completion an explicit prerequisite on a sponsored case, with a
   clear first-run prompt — not a nudge buried on the home page.
2. Extend the seed's intake to a COMPLETE fixture, so testing exercises full
   forms rather than half-empty ones. A seed that omits fields is a seed that
   hides bugs.
3. Wire the completeness gate (Pass 2 of the merged sequence) so any form whose
   `requires` are unmet is blocked with the missing fields named — the same
   mechanism as B1, applied to the applicant's side.
```

---

## SMALLER, BEFORE YOU DEMO

```
S1  The seeded company is "Test Guard Co." and the applicant is "Test Applicant".
    If this is the account you show anyone, seed the real names — and resolve
    the Chery / Cheryl spelling first (still an open operator blocker).
S2  The name-split logic derives first/last from a single full_name string.
    "Test Applicant" splits cleanly; a two-word surname will not. The child
    support form and the company form both depend on the split.
S3  The seed leaves the sponsorship UNCONSENTED on purpose — good. It means the
    tester experiences the gate. Keep it, and make sure the sponsor's empty
    state explains the wait rather than looking broken (the copy at line 42 does
    this today — verify it still shows).
S4  Re-run the seed after the migration in B2 so the test company has a complete
    record; otherwise B1's new guard will simply block the button instead.
```

---

## VERIFY

```
1. ORDERING: on a fresh seed, the sponsor cannot prepare the company form until
   the company profile is complete, and the disabled state NAMES what is missing.
2. B2: a complete sponsors record fills all 12 mapped fields on the company form.
   Render it and read the business address, phone and type off the page.
3. Employer facts resolve sponsor-first on a sponsored case and intake-first on
   an unsponsored one — test both.
4. PAGE ORDER: company profile appears above the documents that depend on it.
5. INTAKE: an applicant with incomplete intake sees a clear prerequisite, and
   every form whose requires are unmet is blocked with the missing fields named.
6. SURFACE: after the service_mode decision, confirm which portal Chery lands on
   and that it is the intended one — click through as him, not as staff.
7. CONSENT still gates everything: before consent the sponsor sees no file, no
   documents, no facts.
8. FULL DRESS REHEARSAL, in order: seed → applicant signs up → consents →
   completes intake → sponsor signs in → completes company profile → prepares and
   uploads SPN-01 → applicant uploads an ID → both see the right status. Any step
   that errors or dead-ends is a bug, not a caveat.
9. pnpm build && pnpm test green on macOS.
```

## DO NOT

- Do not let a form generate from facts that do not exist — block it and say why.
- Do not ship a generic "Couldn't prepare the form" error.
- Do not leave `service_mode` on a sponsored case as an accident of the seed.
- Do not seed a partial intake — it hides exactly the bugs this test exists to find.
- Do not put a control above the field it depends on.
