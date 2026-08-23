# Form engine fixes — Claude Code build prompt

> Fixes for the defects found in the 23 Aug 2026 QA pass over the NYPD form template engine (`5ca554f`). Findings and evidence are in `FORM_ENGINE_QA_REPORT.md`; this is the work order. **Build Phase 0 first** — it is the machinery that proves the rest, and its absence is why these shipped.
>
> **Non-negotiables.** NY Penal Law § 400.00(3): an application is signed and verified by the applicant. Nobody else signs, swears, or adopts. A notarised instrument is never digitally signed on-platform. We fill the REAL official PDF and never regenerate a facsimile. The CP-5 gate, the sponsor `party_scope` firewall, and the draft/adopt split all stay exactly as they are.
>
> **Ground truth for this work:** the templates in `assets/form-templates/`, the map in `lib/forms/templates.ts`, the fill/sign engine in `lib/forms/fill.ts`, the questionnaires in `lib/requirements/questionnaires.ts`.

---

## PHASE 0 — The guard rails, before any fix

Every defect below is a variant of one root cause: **nothing checks that what we intend to write actually reaches the field we intend to write it to.** Build that check first, then fix under it.

### 0.1 — A template/map validator that runs in CI

```
Create scripts/verify-form-templates.ts (and wire it into `pnpm test`).

For EVERY entry in FORM_TEMPLATES it must assert:
  1. The file exists at assets/form-templates/<file>.
  2. It loads with pdf-lib (use { ignoreEncryption: true } — see Phase 2).
  3. isFillable matches reality: declared true ⇒ getForm().getFields().length > 0.
  4. Running build() with a fully-populated fixture yields ONLY field names that
     exist in that PDF — text, checks, signatureField, dateField, and every name
     in dateSplit. Any miss is a hard failure naming the template and the field.
  5. Run build() across EVERY conditional branch, not just the default. For the
     child-support template that is four branches (not obligated; obligated+a;
     obligated+b × each of the three b-conditions; obligated+c).
  6. No two templates share a sha256 (catches Phase 5).
  7. A template may not declare both `signable: true` and `notarize: true`.
  8. Every field a template declares as required-for-completeness is actually
     produced by build() from the fixture — catches "we never mapped DOB".

Report as a table: template · fields in PDF · fields mapped · missing · unmapped.
Exit non-zero on any missing field.
```

I ran exactly this check by hand during QA; it is roughly 60 lines and it catches C1, H1, H4 and every future drift. Do not skip it.

### 0.2 — Signing tests, which do not currently exist

```
The suite has five tests and all five cover FILL. None covers adopt-and-flatten,
which is where the critical defect lives. Add, for every signable template:
  · sign a filled draft, then re-open the output and assert the value of every
    date-bearing field by NAME
  · assert the applicant's date of birth is their real DOB and NOT the signing date
  · assert the signature was drawn on the correct page at the signature widget's
    rectangle
  · assert the output is flattened and the form fields are gone
```

---

## PHASE 1 — CRITICAL: signing overwrites the date of birth

**Evidence.** On the generated + signed M-522 the form reads **"Date of Birth 08 / 23 / 2026"**. Widget geometry on `forms-childsupport.pdf`, page 1 (612×792):

```
Social Security Number or ITIN   x=199 y=598      ← top identity block
MM    x=462 y=592  w=20          }
DD    x=487 y=597  w=30          }  same line as the SSN = DATE OF BIRTH
YYYY  x=522 y=596  w=36          }
Signature  x=87  y=123           ← bottom
Date       x=423 y=123           ← the actual signing date, already filled correctly
```

`signTemplate` in `lib/forms/fill.ts` writes today's date into any field literally named `MM`, `DD` or `YYYY`:

```js
for (const [n, val] of [["MM", mm], ["DD", dd], ["YYYY", yyyy]] as const) {
  try { form.getTextField(n).setText(val) } catch {}
}
```

On this form those are the DOB boxes. Compounding it, `build()` never maps date of birth and the `child-support-cert` questionnaire never asks for it — there is no occurrence of `dob` or `birth` in that block — so the correct value never exists to write.

The applicant then signs a form that swears *"under oath and subject to penalty of perjury"* to a false date of birth.

```
FIX
1. DELETE the blind MM/DD/YYYY loop from signTemplate entirely. Never write to a
   field because its name looks like a date part.

2. Use the dateSplit member that already exists on FilledFields and is never
   populated. Make it explicit and per-template:
       dateSplit?: { mm: string; dd: string; yyyy: string }   // field NAMES
   signTemplate fills a split ONLY when the template declares one, and only with
   the signing date.

3. Separate "signing date" from "data date" in the contract. A date of birth is
   application data and belongs in build().text like any other value; the signing
   date belongs to the sign step. They must never share a code path.

4. Map DOB properly on nypd_child_support_cert:
     · add `dob` to the questionnaire's prefill (intake holds it — ELG-01 already
       derives age from it) and to its fields, formatted MM / DD / YYYY
     · in build(), write the three parts to the MM, DD and YYYY fields
   Keep the bottom `Date` field as the signing date — it is already correct.

5. AUDIT the other templates for the same class of error. I verified the blast
   radius is confined: only forms-childsupport.pdf exposes bare MM/DD/YYYY.
   For the record, the other date-bearing fields are
     form-req-app-emp-rec / forms-auth-rel : Date, Date Of Birth
     forms-cohab      : Date18_af_date, Date19_af_date
     forms-company    : Date, Date of Birth, License Issue Date,
                        License Expiration Date, If Yes Date of First Employment,
                        DATE, DATE_2, DATE_3
     request-pre-exemption : Birth Date
     credit-card-auth : Date, Date4_af_date
   Every one of these must be written from an explicit map or not at all.

6. Add the Phase 0.2 test that fails if the DOB widgets contain the signing date.

7. REMEDIATION: any M-522 already generated and signed in testing carries a false
   DOB. Find them, void them, regenerate. Do not let one survive into a real packet.
```

---

## PHASE 2 — HIGH: the HIPAA template is encrypted and throws

`assets/form-templates/hippa-med.pdf` is encrypted. `fillTemplate` loads with `PDFDocument.load(bytes)` and no options, so requesting it raises *"Input document to PDFDocument.load is encrypted."* It is also declared `isFillable: true` while exposing **zero** AcroForm fields, and all three mapped names (`Name`, `Address`, `SS`) are absent.

```
FIX
1. fill.ts is the only loader in the codebase that omits ignoreEncryption. Add it:
     PDFDocument.load(bytes, { ignoreEncryption: true })
   Match how the QA harness and every other loader read these files.
2. Re-test. If it still exposes no fields it is a flat scan: set isFillable:false,
   drop the phantom field map, and either implement coordinate overlay for it or
   hold it as a download-only template.
3. Until it genuinely fills, it must not be reachable from any "Complete this
   form" control. Verify by walking the UI, not by reading the registry.
4. The Phase 0.1 validator's check #3 makes this class of error impossible to
   reintroduce.
```

---

## PHASE 3 — HIGH: a notarised form is wired for digital signature

`request-pre-exemption.pdf` states in bold at the foot: **"THIS FORM MUST BE TYPED AND NOTARIZED."** The template is `signable: true` with `signatureField: "Applicants Signature"`, so the applicant adopts a digital signature and the document is flattened as finished.

A notarised instrument requires the signer to appear before a notary. The system already gets this right for the cohabitant affidavit: notarised forms generate **filled and unsigned**, with the notary step surfaced next.

```
FIX
1. Add `notarize?: boolean` to the FormTemplate contract.
2. Make signable and notarize MUTUALLY EXCLUSIVE, enforced by the Phase 0.1
   validator — a template declaring both fails the build.
3. Set notarize:true, signable:false on nypd_prelicense_exemption. It generates
   filled and unsigned, then routes into the existing notary flow (the ZIP-code
   notary locator and the online-notary option both already exist).
4. Sweep every template against its own printed instructions and set the flag
   correctly. Read the foot of each form — that is where this is stated.
5. Copy: the card must say what happens next — "We'll fill this in for you. It has
   to be signed in front of a notary, so we'll set that up after you review it."
```

---

## PHASE 4 — HIGH: fill failures are silent

Every write in `fillTemplate` is wrapped in a bare swallow:

```js
try { form.getTextField(name).setText(String(val)) } catch { /* field absent — skip */ }
try { form.getCheckBox(name).check() }             catch { /* skip */ }
```

A mistyped field name produces a **blank box on an official government form with no error, no log, and no signal to staff**, and the document then flows to review looking complete. These field names include OCR-mangled strings from the source PDFs — `Name oflnstructor`, `lnstmctors Verified Statement 1`, `Address Street City or Town Slate Zip Code`, `Bitling Zip Code` — so a typo is a matter of when, not if.

```
FIX
1. Count attempted vs applied for both text and checkboxes.
2. On any unresolved field:
     · development / CI  → throw, naming template and field
     · production        → complete the fill, but record the failed field names on
       the generated document row, mark the document `needs_review`, and raise a
       staff task. A partially-filled official form must never present as done.
3. Keep the per-field catch so one bad field cannot abort a whole fill — the
   change is that failures are now VISIBLE, not that they abort.
4. Log a fill summary to the activity trail: template key, template sha256, fields
   mapped, fields applied. That trail is what lets you answer "was this form
   complete when he signed it?" months later.
```

---

## PHASE 5 — HIGH: two templates are the same file

```
475aedf6ee4c19dd  assets/form-templates/forms-auth-rel.pdf
475aedf6ee4c19dd  assets/form-templates/form-req-app-emp-rec.pdf
```

Byte-identical; both extract as *"REQUEST FOR APPLICANT'S EMPLOYMENT RECORD"*. The registry presents them as two distinct forms.

```
FIX
1. Re-fetch both source URLs and compare:
     /additional-forms/forms-auth-rel
     /additional-forms/form-req-app-emp-rec
2. If the NYPD serves the same PDF at both slugs: hold ONE template, name it
   accurately, and record both source URLs on it.
3. If they are genuinely different: the Authorization for Employment Release is
   MISSING. Fetch the real one and map it.
4. Add the no-duplicate-sha256 assertion (Phase 0.1 check #6).
5. While there: nypd_employment_authorization's officialTitle currently hedges
   with a slash ("Authorization for Employment Release / Request for Employment
   Record"). After step 2 it should name exactly one document.
```

---

## PHASE 6 — HIGH: household cohabitant affidavits never use the official form

`nypd_cohabitant_affidavit` maps only the **solo-resident** section — `Text15`, `Text16`, `Signature17`, `Date18_af_date`. The cohabitant section's 14 fields (`Text1`–`Text14`, `Signature10`, `Signature11`) are never filled. The form's own directions:

> *"A separate notarized 'Affidavit of Co-Habitant' must be submitted by each adult with whom the applicant resides. Applicants who reside alone must fill out the bottom portion of this form but do not need to notarize it."*

So an applicant who lives with anyone gets whatever the older document engine produces instead of the official NYPD form.

```
FIX
1. Add a SECOND template mapping for the household section, driven by the
   cohabitant roster: one filled, UNSIGNED official form per adult, each carrying
   that person's name, DOB, address, relationship and phone numbers, plus the
   applicant's name.
2. notarize:true, signable:false. Each routes to that person's own notary step
   through the existing tokenized cohabitant link (app/c/[token]).
3. Retire the home-made cohabitant affidavit from the document engine for this
   track — using a substitute where the NYPD names a form is a rejection risk.
4. The form's directions settle the open question from the collection-scope
   review: the solo attestation IS required. Change COH-01 from `if_cohabitants`
   to unconditional with two branches (household / solo), so a lone applicant is
   asked for the bottom section rather than nothing.
5. Test both branches: an applicant with two adult cohabitants generates two
   filled unsigned forms plus no solo section; a lone applicant generates the solo
   section only.
```

---

## PHASE 7 — MEDIUM

```
M1  PRE-EXEMPTION, INSTRUCTOR HALF. Name of Instructor, "Name of Range, Address,
    Telephone Number", the four "lnstmctors Verified Statement" lines and
    Instructors Signature are entirely unmapped — and the verified statement IS
    the substance of a §5-09 request. The instructor is already a first-class
    user in this system. Either collect their statement in-platform and map it,
    or state plainly on the card that the instructor completes and signs their
    section on paper. Do not ship a form that presents as finished with its
    operative section blank.

M2  SSN REQUIRED CONTRADICTS ITS OWN COPY. The field is required:true while its
    help text reads "write it in by hand instead if you prefer to leave it blank."
    Make it optional, render a blank when omitted, and keep the ephemeral
    contract. The copy is the promise; the validation should match it.

M3  EMPLOYMENT AUTHORIZATION cannot be signed. It exposes an "Applicants
    Signature" field but has no `signable` flag, and its `Date` field is never
    filled. Decide whether it is signed in-platform or on paper and make the
    template say so.

M4  FONT SIZE. setText is called with no size, so pdf-lib renders at a default
    that is visibly oversized against the forms' own type (clear on the M-522 and
    the company form). Short test values fit; a long employer name or address will
    clip or collide. Set an explicit size per template, or auto-size to the widget
    width. Re-render every template afterwards and LOOK at it.

M5  COMPANY FORM PRE-FILL. Business Address, Business Telephone Number and Type
    of Business are left blank although ISS supplies all three via SPN-04/SPN-06
    and they sit on the sponsors record. Pre-fill everything we hold — retyping
    known data is where transcription errors come from. Leave only the officer
    names, the YES/NO acknowledgements and the notarised signature blocks.

M6  ZIP NOT PREFILLED. `zip` is required in the child-support questionnaire but
    absent from its prefill, though intake holds it and every other address part
    is prefilled.

M7  signTemplate calls t.build({}) with empty values purely to discover
    signatureField/dateField. It works only because those are static today. Split
    the static descriptor (signatureField, dateField, dateSplit, notarize) out of
    build() into plain template properties so it cannot break silently.

M8  FOUR UNMAPPED TEMPLATES — change_address, request_to_sell, credit_card_auth,
    purchase_auth — have no build(). Fine as held documents. Confirm none is
    reachable from a "Complete this form" control, and mark them explicitly as
    download-only in the registry so their status is intentional rather than
    accidental.
```

---

## PHASE 8 — Process

```
P1  Run the suite on macOS and confirm green. It could not be run during QA: the
    repo's node_modules are darwin-arm64 and the review environment is Linux, so
    tsx/vitest refuse to start. Nobody has yet seen these tests pass.

P2  Delete the `_to_delete/` folder at the repo root — QA scratch files and
    generated sample PDFs left there because the review tooling cannot delete.

P3  Re-render every template after all fixes and visually inspect each one. Text
    extraction proves a value is present; only looking proves it is in the right
    box, at a sane size, not overlapping the form's own printing. Attach the
    renders to the PR.
```

---

## VERIFY

```
1. VALIDATOR GREEN: scripts/verify-form-templates.ts passes for every template
   across every branch, with zero missing fields and no duplicate sha256.
2. THE CRITICAL ONE: generate + sign an M-522 and open the output. The DOB
   fields contain the applicant's real date of birth; the bottom Date field
   contains the signing date. Assert both by field name in a test.
3. NO BLIND WRITES: grep the codebase — no field is written because its name
   matches a pattern. Every write comes from an explicit map.
4. HIPAA: either fills correctly, or is flagged non-fillable and unreachable
   from the UI. It must not throw.
5. NOTARISED FORMS: the pre-exemption request generates filled and UNSIGNED with
   the notary step next; no template declares both signable and notarize.
6. LOUD FAILURES: deliberately break one field name in a build() — CI fails, and
   in production the document is marked needs_review with a staff task raised.
7. COHABITANTS: two adults → two filled unsigned official forms, each with its
   own notary step. Lone applicant → the solo section only.
8. LEGAL LINE HOLDS: sponsor still cannot sign, swear, adopt or submit; the
   applicant's adoption is still required on every sworn document; REF/COH/SAF
   exclusions unchanged.
9. VISUAL: every template re-rendered and inspected; nothing clipped, oversized
   or overlapping.
10. pnpm build && pnpm test green ON macOS; 390px on every surface touched.
```

## DO NOT

- Do not write to a form field because its name looks like a date, a name, or an address.
- Do not swallow a fill failure.
- Do not digitally sign anything a form says must be notarised.
- Do not let a partially-filled official form present as complete.
- Do not substitute a home-made document where the NYPD names a form.
- Do not mark a template fillable without asserting it has fields.
- Do not ship until the M-522 date-of-birth test passes.
