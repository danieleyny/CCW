# Form template engine + sponsor parity — Claude Code build prompt

> Three changes to the sponsored armed-guard build: give the sponsor real execution parity, remove the confusing next-step card from the vault, and stop sending people off to hunt for official forms — we hold the templates and fill them.
>
> **The rule that does not move.** NY Penal Law § 400.00(3): *"An application shall be signed and verified by the applicant."* Everything below expands who can **prepare** and **upload**. Nobody but the applicant ever **signs or swears**. Keep the `isSignable` enforcement and its tests exactly as they are.

---

## PHASE 1 — Sponsor execution parity

Pamela is helping Chery complete the application, not observing it. At `scope='full'` she should be able to do everything on the case that he can, except the acts that are legally his.

```
1. Extend the sponsor's write surface to match the applicant's at scope='full':
     • upload / replace / delete-before-review any document on the case
     • complete and edit the intake and questionnaire DRAFTS
     • add and manage the people rosters (references, cohabitants, safeguard)
     • trigger the reference and cohabitant invite links, and chase them
     • generate a document from a completed questionnaire
     • message the concierge team
   Route every one of these through the SAME server actions the applicant uses —
   do not fork a parallel set of sponsor-only actions that can drift.

2. STILL FORBIDDEN to the sponsor, enforced server-side with tests:
     • applying a signature to anything (isSignable rejects a sponsor caller)
     • ADOPTING a sworn statement as final — see step 3
     • the final submit / "ready to file" action
     • consenting on the applicant's behalf, or altering the sponsorship scope

3. THE DRAFT / ADOPT SPLIT — this is what makes parity legal.
   A questionnaire answer that becomes a SWORN statement (the disclosure
   addendum, the arrest and order-of-protection statements, the affirmation, the
   child-support certification) may be DRAFTED by anyone with write access, and
   must then be ADOPTED by the applicant before it is final. Model it as two
   fields on the answer record: `drafted_by` and `adopted_by` + `adopted_at`.
   Nothing sworn is complete until adopted_by = the applicant's profile.
   Show it plainly on both sides: "Pamela drafted this — Chery needs to confirm
   it's accurate and sign."

4. ATTRIBUTION: every write records the acting party. The applicant's own view
   should say who did what — "Pamela uploaded your utility bill on Tuesday" —
   for the same reason the read audit exists. He is entitled to know what is
   being done in his name.

5. Update the consent copy (Phase 3 of the sponsor build) to say she can act on
   the file, not merely view it. The current wording describes viewing. If the
   consent describes less than the access, the consent is not informed.
```

---

## PHASE 2 — Remove the next-step card from the vault

```
Delete "The one thing we need from you" from the concierge vault surface.
It sits directly above the full list it is pointing at, so it reads as a
separate task and then repeats the first card. The vault's own ordering
(outstanding first, then received, then approved) already answers "what's next".

Keep computeNextStep for the control tower, where a single next action is
useful; it is only the in-vault card that goes. Check the sponsor surface for
the same card and remove it there too.
```

---

## PHASE 3 — The NYPD form template library

**The problem, in the user's words:** clicking *How to get this* on the child support certification explains what the form is, not how to obtain it — because there is nothing to obtain. It is a form the NYPD publishes and the applicant is expected to fill in. We should be filling it.

### 3.1 — What actually exists (verified 21 Aug 2026)

The NYPD publishes eleven forms at `licensing.nypdonline.org/additional-forms/`. These are the canonical artifacts for several requirements we currently describe in prose:

```
FORM                                    URL SLUG                  MAPS TO
Affidavit of Cohabitant (rev 11/16/2023) /forms-cohab             COH-01
Child Support Certification (HRA M-522,
  Rev 05/10)                             /forms-childsupport      CSC-01
Pistol License Application — Company     /forms-company           SPN-01
Request for License Pre-Exemption        /request-pre-exemption   PLE-01
Authorization for Employment Release     /forms-auth-rel          (investigation)
Request for Applicant's Employment Record /form-req-app-emp-rec   (investigation)
H.I.P.P.A. Medical Release               /hippa-med               (investigation)
Change of Address / Employment           /change-addr-employ      (post-issuance)
Request to Sell                          /forms-requesttosell     (post-issuance)
Credit Card Authorization                /credit-card-auth        (payment)
Purchase Authorization                   /purchase-auth           (post-issuance)

Plus the application itself: PD 643-041, addendum PD 643-041A, instructions
PD 643-115 — already referenced in config/application-coverage.ts.
```

**`Request for License Pre-Exemption` is the real artifact for PLE-01.** We modelled that requirement from the text of 38 RCNY § 5-09; the NYPD publishes an actual form for it. Use the form.

### 3.2 — Field-level detail for the two we transcribed

```
CHILD SUPPORT CERTIFICATION — HRA form M-522 (Rev 05/10). Sworn, NOT notarised.
  Fields in order: last name · first name · SSN or ITIN · date of birth ·
  street · apt · city · state · zip · employer business name · employer street ·
  employer city · employer state · employer zip · signature · date
  Declarations — pick one:
    (1) not under a court or administrative order to pay child support
    (2) under an obligation to pay child support → account number(s), then one of:
        (a) no arrears of four or more months
        (b) arrears of 4+ months WITH an income execution / court-approved plan,
            a pending court proceeding, or receipt of Public Assistance or SSI
        (c) arrears of 4+ months with none of (b) applying
  Certification, verbatim: "I hereby do solemnly swear under oath and subject to
  penalty of perjury that the information provided by me in this certificate is
  true and accurate to the best of my knowledge."

AFFIDAVIT OF CO-HABITANT (Rev 11/16/2023). TWO sections on one form:
  • Co-habitant section — NOTARISED. Name, DOB, full address, applicant's name,
    relationship, home/cell/work phone, signature, notary acknowledgement.
    Sworn language includes "I have no objection to him/her storing firearms in
    our home."
  • Solo-resident section — NOT notarised. Applicant's name, full address,
    signature, date, under penalty of perjury.
```

**Act on that second section.** `COH-01` currently fires on `if_cohabitants`, so an applicant who lives alone is asked for nothing. The form's own solo-resident section suggests a lone applicant still files an attestation. Add a `COH-02` (solo-resident attestation, trigger `unless_cohabitants`) or make COH-01 unconditional with two branches. **Confirm with the operator before shipping** — it is on the open-questions list.

### 3.3 — The template registry

```sql
create table public.form_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,              -- 'nypd_child_support_cert'
  official_title text not null,          -- 'Child Support Certification'
  form_number text,                      -- 'M-522'
  revision text,                         -- 'Rev 05/10'
  issuing_authority text not null,       -- 'NYC HRA' | 'NYPD License Division'
  source_url text not null,
  storage_path text not null,            -- the PDF we hold
  sha256 text not null,                  -- detects a silently changed file
  is_fillable boolean not null default false,  -- has an AcroForm layer
  field_map jsonb not null default '{}',       -- our field → PDF field or coords
  verified_at timestamptz not null,
  superseded_by uuid references public.form_templates(id),
  active boolean not null default true
);
```

```
1. Download each official PDF once, store it, hash it. NEVER regenerate a
   facsimile of an official form — a form that merely looks official is worse
   than no form. We fill the real document.
2. FILLING: if the PDF carries an AcroForm layer, fill by field name with
   pdf-lib. If it is flat, overlay text at mapped coordinates and record the
   coordinates in field_map. Either way the output is the official artifact with
   our values in it.
3. FRESHNESS IS A REAL RISK. These forms carry revision dates and change without
   notice (M-522 is Rev 05/10; the cohabitant affidavit was revised 11/16/2023).
   A stale form is a rejected filing. Add a scheduled staff task to re-fetch each
   source_url, compare sha256, and flag any drift. Never auto-swap a template —
   a changed official form needs a human to look at what changed.
4. Version the OUTPUT too: a generated document records which template id and
   sha256 produced it, so a document signed months ago can be traced to the exact
   form revision it was built from.
```

### 3.4 — Questionnaire → filled form

Reuse the existing questionnaire + document-engine pattern. The only new part is that the output is an official PDF instead of one of our layouts.

```
For each template-backed requirement:
  a. A short questionnaire collecting exactly the fields the form needs, in the
     form's own order, in plain language. Prefill everything already known from
     intake — for the child support certification that is name, DOB, address,
     and employer, which leaves the applicant only the declaration branch.
  b. Generate the filled PDF from the stored template.
  c. Show it to them BEFORE any signature control is usable.
  d. One tap adopts the signature already captured at the agreements gate.
  e. Notarisation-required forms (the cohabitant affidavit) generate filled and
     UNSIGNED, with the notary step surfaced next — the cohabitant signs in front
     of the notary, not on our platform.

THE SSN COLLISION — decide this before building CSC-01.
  The child support certification requires SSN or ITIN. Our system deliberately
  does not store SSN (config/application-coverage.ts marks it `at_filing` for
  exactly this reason). Three options:
    (a) Generate the form with SSN left blank and a visible instruction to write
        it in by hand at signing. Preserves the no-SSN rule. RECOMMENDED.
    (b) Collect it transiently at generation, render it into the PDF, never
        persist it. Weaker: it still passes through our infrastructure.
    (c) Store it. Contradicts the PII-minimisation work — do not do this without
        an explicit owner decision and a security review.
  Whatever is chosen, say so in the UI so nobody is surprised by a blank field.
```

### 3.5 — Fix the "How to get this" copy

```
Requirements now split into two kinds, and the collapsible must say the right
thing for each:

  OBTAIN — a document that exists in the world and must be fetched (driving
    abstract, guard registration card, utility bill). Keep today's "How to get
    this" with the registry steps and the source link. This is correct already.

  COMPLETE — a form we hold a template for. Replace the collapsible entirely
    with a "Complete this form" action that opens the questionnaire inline.
    No steps, no outbound link, no instructions to go and find it. The applicant
    should never learn that the form exists somewhere else.

Add `templateKey` to the requirement registry. Its presence is what switches a
card from OBTAIN to COMPLETE — so classification lives in the registry, not in
the component.
```

---

## PHASE 4 — Investigation-phase forms

Three of the eleven forms are used by the investigator after filing rather than in the packet: the HIPAA medical release, the authorization for employment release, and the request for the applicant's employment record.

```
Do not add these to the vault as asks — they are not part of assembling the
packet and would make the checklist look longer than it is. Instead:
  1. Hold their templates in the registry so we can produce one on request.
  2. Add a short "What happens after you file" note to the review-and-file
     surface mentioning that the investigator may ask for a medical release or
     employment authorisation, so it is not a surprise.
  3. Raise it with the operator: are these routinely requested for a sponsored
     guard, and should we pre-prepare them? It is on the open-questions list.
```

---

## VERIFY

```
1. PARITY: at scope='full' the sponsor can upload, edit drafts, manage rosters,
   send invites and generate documents — through the same server actions the
   applicant uses. Confirm by diffing the action list, not by clicking.
2. THE LINE HOLDS: a sponsor-initiated signature fails server-side; a sworn
   answer drafted by the sponsor is NOT complete until adopted_by = applicant;
   the sponsor cannot submit or mark ready-to-file. Tests for each.
3. ATTRIBUTION: every sponsor write shows on the applicant's activity view with
   her name.
4. VAULT: the "one thing we need from you" card is gone from both surfaces; the
   control tower still shows a next action.
5. TEMPLATES: each stored PDF's sha256 matches the source; a deliberately
   corrupted hash raises the drift flag rather than silently serving a stale form.
6. FILL: generating the child support certification from a case produces the
   REAL M-522 with name, DOB, address and employer filled, the chosen declaration
   branch ticked, and the SSN handled per the decision in 3.4.
7. NOTARISED FORMS: the cohabitant affidavit generates filled and unsigned, and
   the notary step is what appears next. No signature control on it.
8. COPY: no template-backed requirement tells the applicant to go and find a
   form. Walk the whole carry-guard checklist and read every collapsible.
9. TRACEABILITY: a generated document records template id + sha256.
10. pnpm build && pnpm test green; 390px on every surface touched.
```

## DO NOT

- Do not let the sponsor sign, swear, adopt, or submit.
- Do not fork sponsor-only copies of the applicant's server actions.
- Do not regenerate a look-alike of an official form. Fill the real one.
- Do not auto-swap a template when the source file changes.
- Do not store the SSN to make the child support form easier.
- Do not add investigation-phase forms to the packet checklist.
