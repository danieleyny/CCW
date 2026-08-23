# Case facts + form completeness — Claude Code build prompt

> **Run this AFTER `FORM_ENGINE_FIXES_PROMPT.md` has fully landed and its validator is green.** That prompt fixes what is broken; this one fixes what is missing. Two goals:
>
> 1. **Nothing on a generated form is blank except the signature.** If the NYPD asks for a value, our questionnaire asks for it and our map writes it.
> 2. **A fact is entered once and reused everywhere.** Name, date of birth, address, employer — captured once, propagated to every form that needs it, editable, with the edit flowing back everywhere unless the applicant says otherwise.
>
> **Non-negotiables carry forward.** § 400.00(3) — only the applicant signs, swears and adopts. Notarised forms are never digitally signed. We fill the REAL official PDF. The sponsor draft/adopt split stays.

---

## WHY THIS IS NEEDED — the current state, measured

A live M-522 generated from the platform came out with **Date of Birth blank** and the signature **Date blank**. The DOB is the Phase 1 defect in the previous prompt. But the underlying reason it was possible to ship a form with an unfilled required field is that **nothing in the system knows which fields a form must have filled**, and **no fact has a single home**.

What exists today:

```
PrefillContext = { intake, clientName, borough, zip }        ← four values, that's it
```

Eleven questionnaires, nine of which write their own bespoke `prefill:` function reaching directly into `ctx.intake.*`. The same human fact appears under different field names in different forms:

```
"fullName"   × 3 questionnaires        "address"  × 4 questionnaires
"firstName" / "lastName"  (child support only — split differently again)
"street" / "city" / "state" / "zip" / "apt"  (child support only)
"dob"  × 1   ← appears in ONE questionnaire in the entire system
```

There is no `case_facts` table and no shared resolver. `formatLegalAddress()` is the only shared helper. So the applicant's date of birth — a value the NYPD asks for on at least four different forms — exists as a questionnaire field exactly once, and the child support certification never asks for it at all.

That is the bug behind the bug.

---

## PART A — The canonical fact layer

### A.1 — A fact registry

```
Create lib/facts/registry.ts — ONE catalogue of every reusable fact about the
people on a case. Not a free-form bag: a typed, named registry.

FACT_KEYS (illustrative, complete it against the forms):

  applicant.legalFirstName        applicant.legalMiddleInitial
  applicant.legalLastName         applicant.aliasOrMaidenName
  applicant.dob                   applicant.placeOfBirth
  applicant.address.street        applicant.address.apt
  applicant.address.city          applicant.address.state
  applicant.address.zip
  applicant.phone.home            applicant.phone.cell
  applicant.phone.work            applicant.email
  applicant.height                applicant.weight
  applicant.sex                   applicant.hairColor      applicant.eyeColor
  applicant.citizenship           applicant.alienRegistrationNumber

  employer.name                   employer.address.street
  employer.address.city           employer.address.state
  employer.address.zip            employer.phone
  employer.type                   applicant.jobTitle
  applicant.hoursPerWeek

  sponsor.legalName               sponsor.agencyLicenseNumber
  sponsor.agencyLicenseExpiry     sponsor.custodianName
  sponsor.custodianLicenseNumber  sponsor.assignmentSite

  safeguard.name                  safeguard.relation
  safeguard.address               safeguard.phone

Each entry declares: key, human label, type (text | date | phone | zip | select),
validation, an optional `derivedFrom` (see A.4), and `sensitive: boolean`.

SPECIAL CASE — applicant.ssn is registered but NEVER persisted. See A.6.
```

### A.2 — Storage

```sql
create table public.case_facts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  key text not null,                       -- a FACT_KEYS entry
  value text,
  source text not null,                    -- intake | applicant | sponsor | staff
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (case_id, key)
);
```

```
RLS mirrors the case: applicant read/write their own; sponsor read/write per
party_scope at scope='full'; staff full. Sensitive facts follow the same firewall
the disclosures already use — a non-agent trainer sees none of it.

Every write is attributed, so the applicant's activity view can say "Pamela
updated your employer address" exactly as it does for uploads.
```

### A.3 — One resolver, used by everything

```
lib/facts/resolve.ts

  resolveFact(caseId, key) →
      1. case_facts row for this case          ← the canonical answer
      2. derived from intake (the migration path, see A.5)
      3. derived from the clients / cases / sponsors row
      4. null

  resolveFacts(caseId, keys[])  → batch, one query. No N+1.

DELETE every bespoke `prefill:` function from questionnaires.ts. A questionnaire
field now declares which fact it is:

  { name: "dob", label: "Date of birth", type: "date", fact: "applicant.dob", required: true }

The questionnaire engine resolves fact-backed fields automatically. A field with
no `fact` is form-specific (a case number, an explanation) and behaves as today.
```

### A.4 — Derived facts

```
Some values are formatting, not new information. Register them as derived so they
can never drift from their parts:

  applicant.fullName        ← first + middle initial + last
  applicant.fullAddress     ← street, apt, city, state, zip   (replaces formatLegalAddress)
  applicant.age             ← from dob, at time of use
  applicant.dob.mm/.dd/.yyyy ← split parts, for forms with three date boxes
                               (this is exactly what the M-522 needs)

Derived facts are read-only: editing one edits its parts.
```

### A.5 — Migration and backfill

```
1. On first load of an existing case, backfill case_facts from intake + clients +
   sponsors using the same mappings the old prefill functions used. Idempotent.
2. Do NOT delete intake answers — intake remains the interview record; case_facts
   becomes the working truth. Where they disagree, case_facts wins and the UI can
   show "you told us X at intake — now using Y".
3. Ship behind a flag, backfill, verify a sample, then remove the old prefills.
```

### A.6 — The SSN decision

```
A live generated form shows the SSN rendered into the M-522, so it is being
collected. It is ALSO needed on the company form and the employment record form.
That collides directly with "reusable info is reused":

  · If it stays `ephemeral`, the applicant retypes it on every form that needs it.
  · If it is stored, it contradicts the PII-minimisation position that
    config/application-coverage.ts marks as `at_filing`.

Pick one, deliberately, and write the decision into the code comment:

  (a) EPHEMERAL PER PACKET (recommended) — collect once when a packet-generation
      session starts, hold it in server memory for that request cycle only, fill
      every form that needs it in that pass, never write it to a row. Reuse without
      storage. The applicant types it once, not four times.
  (b) STORED ENCRYPTED — a dedicated encrypted column with its own RLS, excluded
      from every export, view, and the sponsor's scope regardless of consent, with
      access logged like the document reads. Needs an explicit owner decision.
  (c) NEVER COLLECTED — form generates with the box blank and a printed note to
      complete by hand. Contradicts Part B's "nothing blank but the signature".

Whatever is chosen, the sponsor must NOT be able to read it — Pamela having
Chery's SSN is a different order of exposure from her seeing his documents, and
nothing in his consent covers it.
```

---

## PART B — Completeness: nothing blank but the signature

### B.1 — Templates declare what "complete" means

```
Add to the FormTemplate contract:

  requires: string[]        // field names on the PDF that MUST be non-empty
  signatureOnly: string[]   // fields legitimately blank until signing
                            // (the signature, the signing date, notary blocks,
                            //  and agency-assigned values like an application
                            //  control number)

Every PDF field is then in exactly one of three buckets: filled by us, filled at
signing, or explicitly not-our-field. There is no fourth "nobody thought about it"
bucket — which is where the DOB lived.
```

### B.2 — A completeness gate on generation

```
1. After fill, compute: which `requires` fields are empty?
2. Any missing → the document is NOT presented as ready. Show the applicant (and
   the sponsor) exactly which values are outstanding and a control that opens the
   questionnaire at that field.
3. Never show a "Sign" control on an incomplete form.
4. Record the completeness result on the generated document row so staff review
   sees it too.
5. Extend the Phase 0 validator from the previous prompt: for every template,
   assert that every `requires` entry is actually produced by build() from a full
   fixture. A required field with no mapping fails CI.
```

### B.3 — Close the gaps this exposes on the M-522

```
The child-support questionnaire currently collects 18 fields and the form needs
more. Working from the form itself:

  · date of birth            — NOT asked, NOT mapped (the Phase 1 defect)
  · applicant zip            — asked but not prefilled, though intake holds it
  · employer fields          — prefilled from intake.business*, but for a
                               sponsored guard the employer IS the sponsor;
                               resolve from sponsor facts when a sponsorship
                               exists, not from the applicant's own intake

After the fact layer lands, this questionnaire should ask the applicant almost
nothing: everything except the declaration branch is already known.
```

### B.4 — The signing date is not a blank

```
The bottom `Date` field being empty in the draft is CORRECT — it fills at signing.
But it reads as an unfilled form, which is what prompted this work. Fix the
presentation, not the behaviour:

  · render fields in `signatureOnly` with a visible placeholder in the preview —
    "fills when you sign" — rather than an empty box
  · say it once above the preview: "Everything is filled in. Your signature and
    the date are added when you sign below."
```

---

## PART C — Editing, propagation, and the preparation screen

### C.1 — Edit once, change everywhere

```
When an applicant or sponsor edits a fact-backed field inside a form:

  1. Default behaviour is PROPAGATE — write the new value to case_facts. That is
     the promise: correct your address once and it is corrected everywhere.
  2. Offer the alternative inline, unobtrusively: "Use this only on this form."
     That writes a form-local override and marks the field overridden.
  3. Show the state plainly when a field is overridden: "This form uses a
     different address than the rest of your application." An override that
     nobody can see is how a packet ends up internally inconsistent — and a name
     that does not match across documents is a rejection.
  4. Propagation must NOT silently rewrite a document that has already been
     SIGNED. If a fact changes after signing, mark the affected documents stale
     and require regeneration + re-adoption. Never mutate a signed instrument.
```

### C.2 — A single "Your details" screen

```
One page, in the concierge visual system, listing every fact we hold, grouped:
you · your address · your contact · your employer · your safeguard · the company.

  · every value editable in place, with its source shown ("from your intake")
  · each fact lists which forms use it — "used on 4 forms" — so the applicant
    understands why it matters
  · a completeness meter: "38 of 41 details captured — 3 still needed"
  · reachable from both the applicant's dashboard and the sponsor's

This is the "preparation form" — the place where the work is done once. Every
questionnaire afterwards should feel nearly empty because the facts are already in.
```

### C.3 — Sponsor parity

```
Pamela edits facts through the same screen and the same resolver, subject to the
same scope. Sponsor-sourced facts (the agency licence, the custodian, the
assignment site) are hers to own; applicant facts she may draft, and the
draft/adopt split from the parity build governs anything sworn.

Do not give the sponsor access to applicant.ssn regardless of scope — see A.6.
```

---

## VERIFY

```
1. FACT REUSE: set the applicant's DOB once. Generate the M-522, the pre-exemption
   request and the company form. All three show the same, correct date of birth.
   No questionnaire asked for it twice.
2. THE ORIGINAL BUG: the generated M-522 has a filled Date of Birth; the signature
   Date is blank in the draft and filled after signing.
3. COMPLETENESS GATE: blank a required fact. Generation flags the form incomplete,
   names the missing value, links to the field, and shows NO sign control.
4. NOTHING ELSE BLANK: generate every template with a complete fact set and
   inspect the renders. The only empty boxes are signatures, signing dates, notary
   blocks, and agency-assigned numbers — each declared in signatureOnly.
5. PROPAGATION: change the address in one form. Every unsigned form that uses it
   updates. Signed documents are marked stale, not rewritten.
6. OVERRIDE: set a form-local override. Only that form changes, and the UI says so.
7. NO BESPOKE PREFILLS: `prefill:` no longer exists in questionnaires.ts. Every
   reusable field declares a `fact`.
8. SSN: behaves per the A.6 decision, is never readable by the sponsor, and never
   appears in an export or log.
9. VALIDATOR: every template's `requires` entries are produced by build() from a
   full fixture — CI fails if one is unmapped.
10. ATTRIBUTION: a sponsor fact edit appears in the applicant's activity view.
11. pnpm build && pnpm test green on macOS; 390px on the details screen.
```

## DO NOT

- Do not reintroduce per-questionnaire prefill functions.
- Do not let two questionnaires define the same human fact under different names.
- Do not present a form as ready with a required field empty.
- Do not rewrite a signed document when a fact changes — mark it stale.
- Do not hide a form-local override.
- Do not expose the SSN to the sponsor under any scope.
- Do not treat the missing signing date as a defect — treat it as a label.
