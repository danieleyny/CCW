# Form template engine — QA report & fix prompt

**Tested 23 Aug 2026 against `5ca554f`.** I loaded all 11 stored templates, enumerated their real AcroForm fields, ran every `build()` against those fields, generated filled PDFs across every conditional branch, rendered them to images and read them, then replicated the signing step and rendered that too.

**Verdict: do not send the links yet.** One defect puts a false sworn statement on a government form. Three more break generation or produce an invalid document. The rest are quality issues.

The engine's core is sound — that matters, because it means these are fixes, not a rebuild. Every mapped field name on the working templates resolves exactly (including the source PDFs' own OCR typos like `lnstmctors Verified Statement 1`); values land in the correct boxes; the child-support declaration branching is correct across all four paths; the SSN is genuinely marked ephemeral with honest copy; and the drift cron fails closed without `CRON_SECRET`.

---

## CRITICAL — fix before anything else

### C1. Signing writes the signing date into the applicant's DATE OF BIRTH

**Proven by rendering the signed output.** On the M-522 the generated form reads **"Date of Birth 08 / 23 / 2026"**.

`signTemplate` in `lib/forms/fill.ts` does this:

```js
for (const [n, val] of [["MM", mm], ["DD", dd], ["YYYY", yyyy]] as const) {
  try { form.getTextField(n).setText(val) } catch {}
}
```

It assumes `MM`/`DD`/`YYYY` are a split *signature* date. On `forms-childsupport.pdf` they are not. Widget geometry, page 1 (612×792):

```
Social Security Number or ITIN   y=598   ← top block
MM  x=462 y=592 · DD x=487 y=597 · YYYY x=522 y=596   ← same line = DATE OF BIRTH
Signature  y=123 · Date x=423 y=123                   ← the real signing date, bottom
```

`Date` (bottom) is already filled correctly by the line above. The MM/DD/YYYY loop then overwrites the **date-of-birth** boxes with today's date.

Compounding it: **`build()` never maps date of birth at all**, and the `child-support-cert` questionnaire never asks for it — zero mentions of `dob` or `birth` in that whole block. So the correct DOB is never available to write, and the only thing that ever reaches those widgets is the signing date.

The result is a form the applicant swears to *"under oath and subject to penalty of perjury"* stating a date of birth of 23 August 2026.

```
FIX
1. Delete the blind MM/DD/YYYY loop from signTemplate. Never write to a field
   because its name looks like a date part.
2. Make the date split EXPLICIT per template via the dateSplit field that already
   exists on the FilledFields interface but is never used:
       dateSplit?: { mm: string; dd: string; yyyy: string }
   Only fill a split when the template declares it and names the fields.
3. Map date of birth properly on the child-support template: add `dob` to the
   questionnaire prefill (intake already holds it — that is where ELG-01 derives
   age from) and write it to MM/DD/YYYY in build().
4. Add a test that signs a filled M-522 and asserts the DOB widgets contain the
   applicant's birth date and NOT the signing date. This is the test that was
   missing — see P1.
5. AUDIT every other template for the same class of error before shipping: any
   field written by name-guessing rather than by an explicit map.
```

---

## HIGH

### H1. The HIPAA template is encrypted — generation throws

`hippa-med.pdf` is encrypted. `fillTemplate` calls `PDFDocument.load(bytes)` with no options, so requesting it raises:

> `Input document to PDFDocument.load is encrypted. You can use PDFDocument.load(..., { ignoreEncryption: true })`

It is also declared `isFillable: true` while exposing **0** AcroForm fields, and all three mapped names (`Name`, `Address`, `SS`) are absent. So even with the load fixed it would produce an untouched blank form.

```
FIX
· Load with { ignoreEncryption: true } — fill.ts is the only loader that omits it.
· Then re-check: if the form still exposes no fields it is a flat scan and needs
  coordinate overlay, not name-based fill. Set isFillable correctly either way.
· Until it genuinely fills, remove it from anything user-facing.
```

### H2. The pre-exemption form must be notarised, but is wired for digital signature

`request-pre-exemption.pdf` states at the foot, in bold: **"THIS FORM MUST BE TYPED AND NOTARIZED."** The template is `signable: true` with `signatureField: "Applicants Signature"`, so the applicant adopts a digital signature and the document is flattened as done.

A notarised instrument requires the signer to appear before a notary. This is the rule already applied correctly to the cohabitant affidavit elsewhere in the system: notarised forms generate **filled and unsigned**, with the notary step surfaced next.

```
FIX
· Add `notarize: true` to the template contract and make it mutually exclusive
  with `signable` — a template declaring both should fail a unit test.
· PLE-01 generates filled + unsigned, then routes to the notary step.
```

### H3. Fill failures are silent

Every write in `fillTemplate` is wrapped in a bare swallow:

```js
try { form.getTextField(name).setText(String(val)) } catch { /* skip */ }
try { form.getCheckBox(name).check() }             catch { /* skip */ }
```

A mistyped field name produces a **blank box on an official form, with no error, no log, and no signal to staff**. The document then flows to review looking successful. Given these field names include strings like `Name oflnstructor` and `lnstmctors Verified Statement 1`, a typo is a matter of when.

```
FIX
· Count attempted vs applied. If any mapped field fails to resolve, throw in
  development/CI and, in production, record the failures on the generated
  document row and flag the case for staff. Never present a silently
  partially-filled official form as complete.
· Add a startup/CI assertion that every name in every build() exists in its PDF.
  I wrote exactly this check while testing; it takes about 40 lines and would
  have caught H1 and would catch every future drift.
```

### H4. Two templates are the same file

```
475aedf6ee4c19dd  forms-auth-rel.pdf
475aedf6ee4c19dd  form-req-app-emp-rec.pdf
```

Byte-identical. Both extract as *"REQUEST FOR APPLICANT'S EMPLOYMENT RECORD"*. The registry presents them as two different forms. Either the NYPD serves the same PDF at both slugs — in which case the registry should say so and hold one — or the downloader fetched the wrong one and **"Authorization for Employment Release" is missing entirely**.

```
FIX
· Re-fetch both slugs and compare. Deduplicate or replace.
· Add a registration-time check that no two templates share a sha256.
```

### H5. Household cohabitant affidavits are never produced on the official form

`nypd_cohabitant_affidavit` maps only the **solo-resident** section (`Text15`, `Text16`, `Signature17`, `Date18_af_date`). The 14 fields of the cohabitant section — `Text1`–`Text14`, `Signature10`, `Signature11` — are never filled.

The form's own directions: *"A separate notarized 'Affidavit of Co-Habitant' must be submitted by each adult with whom the applicant resides."* So an applicant who lives with anyone gets whatever the older document engine produces rather than the official NYPD form.

```
FIX
· Add a second template mapping for the household section, driven by the
  cohabitant roster: one filled, UNSIGNED official form per adult, each routed
  to that person's own notary step.
· Confirm the earlier open question at the same time — the solo attestation is
  now clearly required by the form's directions, so COH-01's `if_cohabitants`
  trigger should be unconditional with two branches.
```

---

## MEDIUM

```
M1  Pre-exemption: the instructor's half is entirely unmapped — Name of Instructor,
    Name of Range/Address/Telephone, the four "Verified Statement" lines, and
    Instructor's Signature. The verified statement IS the substance of a §5-09
    request; the form generates blank there. Decide whether the instructor fills
    it in the portal (they are already in the system) or on paper, and say so in
    the UI rather than shipping a form that looks finished and isn't.

M2  SSN is `required: true` while its own help text reads "write it in by hand
    instead if you prefer to leave it blank." The applicant cannot. Make it
    optional and render a blank when omitted, which is what the copy promises and
    what the agreed SSN decision says.

M3  `nypd_employment_authorization` exposes an `Applicants Signature` field but has
    no `signable` flag, so it can never be signed in-platform, and its `Date`
    field is never filled.

M4  No font size is set on setText, so pdf-lib renders at a default that is visibly
    oversized against the forms' own type (clear on both the M-522 and the company
    form). Short test values fit; a long employer name or address will clip or
    collide. Set an explicit size, or auto-size to the widget.

M5  The company form leaves Business Address, Business Telephone Number and Type of
    Business blank although ISS supplies all three via SPN-04/SPN-06. Pre-fill what
    we hold — retyping known data is where transcription errors come from.

M6  `zip` is required in the child-support questionnaire but missing from its
    prefill, though intake holds it. Every other address part is prefilled.

M7  `signTemplate` calls `t.build({})` with empty values purely to discover
    signatureField/dateField. It works only because those happen to be static.
    Split the static descriptor out of build() so it cannot break silently.

M8  Four registered templates have no build() at all — change_address,
    request_to_sell, credit_card_auth, purchase_auth. Fine as held documents;
    confirm none is reachable from a "Complete this form" control.
```

---

## PROCESS

```
P1  The suite has 5 tests and NONE covers the signing step — which is precisely
    where C1 lives. Fill is tested; adopt-and-flatten is not. Add signing tests
    for every signable template.

P2  I could not run vitest or tsx here: the repo's node_modules are darwin-arm64
    and this workspace is Linux. I worked around it with Node's native type
    stripping, but the suite itself needs to be run on your Mac before release.
    Do that and confirm green — I have not seen it pass.

P3  I left my scratch files and generated PDFs in `_to_delete/` at the repo root
    (device tooling here cannot delete). Remove that folder when convenient.
```

---

## What I verified as working

Worth stating plainly, because it is most of the system:

- All 11 templates are present, and 7 of the 8 that matter load cleanly.
- Every mapped field name on those 7 resolves against the real PDF — 0 misses across 45 mapped fields, including the source PDFs' OCR-mangled names.
- Child-support declaration logic is correct on all four branches: not-obligated; obligated + no arrears; obligated + arrears with a pending proceeding (nested check ticks correctly); obligated + arrears with none applying.
- Values render into the correct boxes and extract cleanly as text — appearances are being generated properly.
- The solo-occupancy section of the cohabitant affidavit fills exactly right.
- The company form pre-fill lands accurately across 12 fields including the custodian and agency-licence block.
- SSN is genuinely ephemeral in the questionnaire contract, with honest user-facing copy.
- The drift cron uses a constant-time bearer comparison and fails closed without `CRON_SECRET`.
