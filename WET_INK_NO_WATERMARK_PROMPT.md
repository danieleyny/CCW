# Wet-ink documents: no watermark, no Sign button, and the instruction is backwards

Three problems on the same set of documents. **Read Part C first — it is the one that
can actually get a document rejected.**

Affected templates (everything that needs ink on paper):

```
nypd_affidavit_familiarity            notary
nypd_safeguard_acknowledgement        WITNESS — not a notary
nypd_prelicense_exemption             notary ("MUST BE TYPED AND NOTARIZED")
nypd_cohabitant_affidavit_household   notary
+ the reference and cohabitant documents served at app/r/[token]/document
  and app/c/[token]/document — those go to a third party who takes them to a notary
```

---

# PART A — Remove the draft marking

Both generated forms come out with:

```
· a header banner:  DRAFT — UNSIGNED · NOT FOR FILING
· a large diagonal watermark: DRAFT — UNSIGNED
```

**This was specified in error in COMPLETION_VISIBILITY_AND_WET_INK_PROMPT.md Part B1
and its verify item 10. That instruction was wrong — reverse it.**

For a wet-ink document the generated PDF is not a preview, **it is the working
original**. The applicant prints it and signs it in front of a notary or a witness. A
notary handed a page stamped "NOT FOR FILING" will refuse it, and should.

```
THE RULE

SIGNABLE templates (signed in-platform)
    An unsigned render is a read-only preview that never leaves the browser.
    KEEP the draft banner — it is doing real work there.

WET-INK templates
    The generated PDF IS the form. NO banner, NO watermark, NO "draft", "unsigned",
    "preview" or "not for filing" text on any page. Indistinguishable from the
    official blank form with our fields filled.
```

```
WHAT TO CHANGE
1. The draft flag is keyed on "no signature yet" —
       lib/requirements/document-engine.ts:263   draft: !sig
   A wet-ink template can NEVER have a digital signature, so it is permanently a
   draft by construction. Key it on the template MODE:
       draft = isSignableTemplate(key) && !signedAt      // wet-ink → always false
2. lib/pdf/builder.ts — the opts.draft banner block (~line 385) and
   pdf.setSubject("DRAFT — unsigned. Not for filing.") must never fire for wet ink.
3. Remove the diagonal watermark stamp for wet-ink downloads. Keep it for signable
   previews if it is used there.
4. Scrub "Not an official NYPD form" from filled OFFICIAL templates — on a real NYPD
   form that line is false, and it invites a reviewer or notary to hesitate. Our own
   generated documents keep it.
```

---

# PART B — Stop offering "Sign" where the server will refuse

`Review & file` shows a **Sign** button on the affidavit of familiarity and the
safeguard acknowledgement. Clicking it returns *"That requirement isn't signed here."*

```
lib/concierge/review.ts
  export function conciergeSignable(reqCode: string): boolean {
    const a = actionFor(reqCode)
    return !!a && a.mode === "generate" && a.signable !== false
  }
```

The wet-ink actions carry `notarize: true` but never set `signable: false`, so they
pass this filter and get a Sign button the server then rejects. `ReviewItem` even
carries a `notarize` flag — the component reads it for the copy and ignores it for
the control.

```
FIX
· DERIVE it, don't set it twice. A requirement whose template needs wet ink is not
  signable, full stop:
      conciergeSignable = mode === "generate" && !templateNeedsWetInk(templateKey)
  Setting signable:false by hand on each action is the same drift that produced this.
· In Review & file, a wet-ink item renders:
      [ View ]   [ Download the form ]   [ Upload the completed copy ]
  and NO Sign button, ever.
· The upload is what completes it. Until then the item stays outstanding — matching
  the vault rank fix (VAULT_STATE_AND_PREFILL Part A).
· Add a test: for every requirement, if the UI offers Sign then signTemplate() must
  accept it. The current failure is two layers disagreeing, and a test is what stops
  it recurring.
```

---

# PART C — The instruction is backwards, and it contradicts our own review

```
components/portal/concierge/review-and-file.tsx:116
    "You'll sign, then have it notarized."
line 107-111 (after signing)
    "Signed · take it to a notary next"
```

**Both are wrong, and dangerously so.** A jurat requires the signer to sign **in the
notary's presence**. A document signed beforehand and then taken to a notary cannot
be properly notarised — which is exactly why
`components/admin/document-review.tsx` already carries the rejection reason
**"Signed before it was notarized."**

The product is currently instructing the applicant to do the thing it later rejects
them for.

```
CORRECT COPY

notary documents
    "Don't sign this yet — you sign it in front of the notary, who then completes
     and stamps the certificate. Then upload the notarised copy."

witness documents (the safeguard acknowledgement)
    "Don't sign this yet — the person safeguarding your firearm signs it in front of
     a witness, who signs and prints their name in the witness block. No notary is
     needed. Then upload the completed copy."
```

```
· nypd_safeguard_acknowledgement is WITNESSED. Its own text says "sign this
  acknowledgement before a witness" and it has no notary block. Every string that
  says "notarized" for this document is wrong.
· Replace the notarize boolean with an explicit mode so the copy cannot drift:
      wetInk?: "notary" | "witness"
  Keep `notarize` as a deprecated alias mapping to "notary", then remove it.
· Show the notary-routes panel ONLY for wetInk === "notary". Sending someone to a
  notary for a witnessed form costs them a trip and produces a form that
  contradicts its own instruction.
· Audit every string in the product for "sign, then have it notarised" or any
  ordering that implies signing first.
```

---

# What replaces the watermark

The watermark was meant to stop an unsigned form being filed as done. That job
belongs to the state machine, not to ink on the page:

```
· The vault rank keeps a wet-ink item in "Need you" until the completed copy is
  uploaded. That is the real guard.
· Mark it in the FILE NAME, which never prints:
      affidavit-familiarity-to-be-notarised.pdf
      safeguard-acknowledgement-to-be-witnessed.pdf
· Keep the on-screen instruction specific (Part C).
· Keep the admin checks "Not notarized" and "Signed before it was notarized", and
  add the witness equivalents.
```

---

# VERIFY

```
 1. The Affidavit of Familiarity and the Safeguard Acknowledgement download with NO
    banner, NO watermark and no "draft"/"unsigned" text — RASTERISE both and LOOK.
    Do not trust the flag; that is how this reached the applicant.
 2. Their PDF metadata subject is empty, not "DRAFT — unsigned. Not for filing."
 3. Same for the pre-license exemption, the household cohabitant affidavit, and the
    reference/cohabitant token documents.
 4. A signable document's unsigned preview STILL shows its draft banner.
 5. Review & file shows no Sign button on either wet-ink document — Download and
    Upload instead.
 6. No requirement anywhere offers Sign that signTemplate() would refuse; a test
    enforces it.
 7. The affidavit's copy tells the applicant NOT to sign beforehand.
 8. The safeguard acknowledgement says WITNESS everywhere, never notary, and shows
    no notary-routes panel.
 9. Uploading the completed copy satisfies the requirement; before that it stays in
    "Need you".
10. Nothing in the product says "sign, then have it notarised".
```

# DO NOT

- Do not put any draft, preview or not-for-filing marking on a document someone must
  take to a notary or a witness.
- Do not key the draft treatment on signature presence for templates that can never
  be digitally signed.
- Do not offer Sign for a document the server refuses to sign.
- Do not tell anyone to sign before a notarisation. It invalidates the notarisation
  and we reject it ourselves.
- Do not tell anyone to notarise the safeguard acknowledgement. It is witnessed.
- Do not weaken the vault state to compensate for removing the watermark.
