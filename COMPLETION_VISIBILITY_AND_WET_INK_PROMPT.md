# Show what's still missing, and fix the wet-ink document flow

Two problems. The first is that a 37-of-38 counter tells you a field is missing but
not which one. The second is that documents which must be signed in front of a notary
are being offered an e-signature pad, and then throwing an error.

---

# PART A — Make the outstanding field findable

## A1 — Ring the fields that still need an answer

```
· A REQUIRED field with no value gets a soft ring — the warn tone at low intensity,
  a glow rather than a hard border. It is a "look here", not an error.
· The ring clears the moment the field has a value. No save round-trip needed.
· OPTIONAL fields NEVER ring. Nor do fields hidden by a conditional (citizenship
  dependents, counsel fields when No, the sponsor block on a non-sponsored case).
· Do not use the error/destructive red. This is unanswered, not wrong — and at first
  load every field is empty, so an error-red page is the first thing a new applicant
  would see.
```

## A2 — The progress bar becomes the answer

```
· The "37 of 38 details captured" bar is a BUTTON. Clicking it opens a dialog:
      "1 still needed"
      • <Field label>        <section name>        →
  Each row jumps to that field: scrolls its section into view, focuses the input,
  and pulses its ring once so the eye lands on it.
· Add a primary action to the bar itself: "Jump to the next one still needed."
  With thirty-eight fields, a single ring somewhere below the fold is still a hunt.
  This is the fix for the actual complaint.
· The dialog lists sections in page order, grouped by section heading, so the list
  reads like the page.
· When nothing is outstanding the bar is not clickable and reads "All details
  captured".
```

## A3 — Check the denominator, because the maths may be the bug

**Before building any of the above, verify what the total counts.** A count of 38
that can never reach 38 is a worse bug than an invisible field.

```
· The total must include ONLY fields that are required AND currently visible.
· Anything tagged ONLY IF IT APPLIES — alias / maiden name, alien registration
  number, prior licence number, work phone — is optional and must NOT be in the
  denominator.
· A field hidden by a conditional is not outstanding and is not counted.
· If the one missing item turns out to be an optional field being counted, fix the
  count. Do not paper over it with a ring on a field nobody has to fill.
```

---

# PART B — Documents that need wet ink must never offer an e-signature

## What happens now

`nypd_affidavit_familiarity` is `notarize: true`. `lib/forms/fill.ts:204` correctly
refuses to sign it:

```ts
if (t.notarize) throw new Error(`Template ${key} must be notarised — it is never digitally signed`)
```

But `components/portal/questionnaire-dialog.tsx` offers the signature pad anyway. The
applicant reads "Your draft is ready… sign", draws their signature, clicks **Use this
signature & sign**, and gets a red error. The guard is right; the UI never asked it.

The same applies to `nypd_safeguard_acknowledgement`, `nypd_prelicense_exemption` and
`nypd_cohabitant_affidavit_household`.

## B1 — Branch the dialog on the template

```
IF the template is signable  → the current sign flow. Unchanged.

IF the template needs wet ink → NO SIGNATURE PAD AT ALL. Instead:
   1. "Your form is ready." — generated, filled, unsigned.
   2. [ Download the form ]   the filled PDF, watermarked DRAFT — UNSIGNED
   3. Plain instructions for what to do with it (see B2 for the wording).
   4. The notary routes panel — ONLY for documents that need a NOTARY.
   5. [ Upload the completed copy ]  ← this is what satisfies the requirement.

The requirement stays outstanding until the completed copy is uploaded. That is
already the documented intent in lib/requirements/actions.ts ("notarize: true means
generation ALONE never satisfies the requirement") — the UI just never offered
either half of it.
```

## B2 — `notarize: true` is doing two different jobs, and the copy is wrong because of it

```
lib/forms/templates.ts:308
  nypd_safeguard_acknowledgement:
    notarize: true, // witnessed on paper — never digitally signed
```

That form is **witnessed, not notarised** — its own instruction says "sign this
acknowledgement before a witness", and its fields are Signature / Witnessed by
(signature) / Witness' name (printed). There is no notary block on it. Right now the
flag makes the UI tell that person to find a notary, which produces a form that
contradicts its own instruction and costs them a trip.

```
· Replace the boolean with an explicit mode:
      wetInk?: "notary" | "witness"
  Keep notarize as a deprecated alias mapping to "notary" so nothing breaks in one
  step, then remove it.
· nypd_safeguard_acknowledgement → "witness"
· nypd_affidavit_familiarity, nypd_prelicense_exemption,
  nypd_cohabitant_affidavit_household → "notary"
· The COPY follows the mode:
      notary  → "Sign this in front of a notary — don't sign it beforehand — then
                 upload the notarised copy."   + the notary routes panel
      witness → "Sign this in front of a witness. They sign and print their name in
                 the witness block. No notary is needed."   + NO notary panel
· Same for the requirement card's status text and the checklist copy.
```

## B3 — Download and upload have to exist on the card, not only in the dialog

There is currently no way to get a notarised copy back into the system for a
generate-mode requirement.

```
On every wet-ink requirement card, once the draft exists:
   [ Download the form ]        the current generated draft
   [ Upload the completed copy ] accepts pdf/jpg/png, same 5MB + filename rules as
                                 every other upload
· Regenerating (because an answer changed) supersedes the draft and marks any
  previously uploaded copy STALE — never silently keeps an uploaded copy attached to
  a draft it no longer matches.
· Admin review already distinguishes "Not notarized" and "Signed before it was
  notarized" (components/admin/document-review.tsx). Keep those; add the equivalent
  witness checks for witness-mode documents.
```

## B4 — Never offer to sign something the fill will refuse

```
Add a guard at the UI layer: if a template cannot be digitally signed, the signature
pad must not render. Assert it in a test — for every template, exactly one of
{ signable, wetInk } is set, and the dialog offers the matching affordance.
The current failure is the two layers disagreeing; a test is what stops it recurring.
```

---

# VERIFY

```
 1. A required, empty, visible field carries a soft warn-tone ring; an optional or
    hidden one never does.
 2. The counter's total equals the number of required visible fields, and reaches
    that total when they are all filled.
 3. Clicking the progress bar lists exactly what is outstanding; clicking a row
    scrolls to it, focuses it and pulses its ring.
 4. "Jump to the next one still needed" moves through the outstanding fields in page
    order.
 5. Opening the Affidavit of Familiarity shows NO signature pad. It shows a download,
    notary instructions, the notary routes panel, and an upload.
 6. Opening the safeguard acknowledgement shows the same shape but says WITNESS, and
    shows NO notary panel.
 7. Uploading the completed copy satisfies the requirement; before that it stays
    outstanding.
 8. Changing an answer regenerates the draft and marks a previously uploaded copy
    stale.
 9. No template exists for which the UI offers signing and fill.ts refuses it — a
    test enforces this.
10. The downloaded draft is watermarked DRAFT — UNSIGNED.
```

# DO NOT

- Do not ring optional or hidden fields.
- Do not use error red for "not answered yet".
- Do not offer a signature pad for any document that needs wet ink.
- Do not tell someone to notarise a form that needs a witness.
- Do not let a generated draft satisfy a wet-ink requirement on its own.
- Do not keep an uploaded copy attached to a draft that has since changed.
