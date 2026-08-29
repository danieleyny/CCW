# Checklist upgrade — dedupe, fix the residence list, add the help paths, and collect what we still don't

Eight parts. A–D are the checklist changes. E–F are two documents that shouldn't be
uploads. G is the biggest: **the data the portal needs is not being collected
anywhere the applicant will find it.** H is the remaining field gap.

---

# PART A — The photograph is asked for twice

```
IDN-04  documentType "applicant_photo"  "A square photo of you, taken in the last 30 days"
        vault FRIENDLY override → "Your license photo"
PHO-01  documentType "applicant_photo"  "A recent passport-type photograph"
```

Same document type, two requirements, both rendered. The applicant uploads their
headshot, sees a second card asking for a headshot, and reasonably wonders what the
difference is. There isn't one.

```
· DELETE IDN-04 and its FRIENDLY entry and its slot in lib/concierge/vault.ts ORDER.
· PHO-01 is the survivor — its copy is the portal's own wording.
· Migrate: any case with IDN-04 satisfied marks PHO-01 satisfied and carries the
  document across. Nobody re-uploads.
· Keep PHO-01's client-side spec check. That is the good half of IDN-04's copy —
  fold "We check it against the NYPD spec as you upload, so it can't get bounced
  later" into PHO-01's help.
```

---

# PART B — Proof of residence: one option, and it names a document NYPD rejects

`lib/requirements/smart-documents.ts:84` offers a single kind:

```
label: "Utility bill / lease / bank statement"
```

**A bank statement is not on NYPD's accepted list.** The portal says, verbatim:

> "We need proof of your present address. Proof may consist of a Utility Bill, Real
> Estate Tax Bill, Ownership in co-op condo, Lease, Maintenance Bill."

We are currently inviting people to upload something that gets rejected. Replace the
one lumped option with the real list, each its own selectable kind:

```
· Utility bill
· Real estate tax bill
· Proof of ownership in a co-op or condo
· Lease
· Maintenance bill
```

```
· All five map to documentType "proof_residence" → RES-01.
· Remove "bank statement" from the option list AND from RES-01's help text and the
  vault FRIENDLY blurb ("A recent utility bill, lease, or bank statement…").
· Keep a short note under the picker: a cell-phone bill is not on the accepted list.
· Do NOT re-add the old stricter rule (electric/cable/landline/gas only, or lease
  plus a filed tax return). That came from the paper checklist; the online portal's
  list is what the filing surface accepts, and it is looser.
```

---

# PART C — DMV lifetime abstract: a "Request help" button, concierge only

The abstract is the single most-failed item — LIFETIME not Standard, five-day
download window, one per state. The instructions are good; the escape hatch is
missing.

```
In the DMV-01 "How to get this" panel, beside the existing "NYS DMV — driving
records" link, add a second button: "Request help".

· CONCIERGE SERVICE ONLY. Self-guided cases do not see it — they have no case team
  to route it to. Gate on the same service_mode test the rest of the concierge
  surface uses.
· It opens a request to the case team (same mechanism as Part D's email), logs an
  activity entry, and confirms in place: "Your case team will reach out to walk you
  through it."
· COLOUR: the section's Upload button is brass, and brass means "your turn". Do not
  make this brass. Use an OUTLINE button in the signal tone — visible against the
  dark card, clearly secondary to the upload, and it does not read as a second task.
```

---

# PART D — Training certificate: "Find me an instructor"

Replace the "NYPD required documents" button at the bottom of TRN-01's "How to get
this" panel. That link is reference material nobody needs at that moment; what they
need is a trainer.

```
BUTTON: "Find me an instructor"

ON CLICK — send an email via lib/email (sendEmail) to gunlicensenyc@gmail.com:
  Subject:  Training request — <applicant full name>
  Body:     name, account email, case reference, licence track, and the date of
            the request.
  Log it to the activity trail as training.instructor_requested.

CONFIRMATION MODAL:
  "Request sent. We'll reach out within the next few days to connect you with a
   DCJS-approved instructor."
  Single dismiss button. Do not navigate away — they may still want to upload.

· Keep a quiet secondary link to the existing /instructors directory for anyone who
  would rather browse than wait.
· Make the button idempotent-ish: after a request is sent, it reads "Request sent"
  and is disabled for 7 days, so nobody fires five emails.
· Fix the hours copy while you're here: it is 18 hours total — 16 classroom plus a
  2-hour live-fire session. Say the total, then the breakdown.
```

---

# PART E — Penal Law 35/265/400 is a disclosure we author, not an upload

**Verified against the portal, and the current build is wrong.**

```
· It is NOT on the portal's upload list (step 13).
· It is NOT in the portal's Forms section — I listed all eleven forms there and no
  such form exists.
· The applicant affirms it TWICE inside the application itself:
    Letter of Necessity statement 5 — "has read and is familiar with the provisions
      of Penal Law Articles 35 (use of deadly force), 265 (criminal possession and
      use of a firearm) and 400 (responsibilities of a handgun licensee)"
    Step 16 affirmation 1 — knowledge of and responsibility for compliance with all
      applicable laws, rules and regulations.
```

There is no official form to notarise, and NYPD never asks for one online. Change
AFF-02 from `mode: "obtain"` to `mode: "generate"`:

```
· WE author the document. Set out, in plain language, what each article covers:
    Article 35 — justification and the use of force, including deadly force
    Article 265 — criminal possession and use of a firearm
    Article 400 — licensing and the responsibilities of a licensee
· The applicant reads it and SIGNS IT DIGITALLY in our system. That is our record
  that they were informed before affirming it to NYPD.
· NOT notarised. Remove the notary routing and the "sign before a notary" copy.
· Held internally — destination "interview", not a portal upload.

WRITE IT AS AN EXPLANATION, NOT ADVICE. Describe what the articles cover and link
the statutes. Do not tell the applicant how the law applies to their situation.
```

**One flag for the operator:** the older paper Required Documents Checklist does list
an "Affirmation of Understanding" as a base document. The online flow does not. If
the License Division asks for a notarised one at the interview, this becomes a
two-minute change — leave a marked constant so it can be switched back.

---

# PART F — The notarized release: an affirmation at filing, a notarised document at interview

You asked whether this should also become our own disclosure. **No, and it's the one
item on this list I'd argue against.**

```
· Step 16 affirms, in NYPD's words: the applicant "will provide signed and notarized
  Release(s) authorizing the License Division to obtain any and all information that
  the License Division deems relevant… A sample Release Form is provided in the
  Forms section of this website."
· The Release is NYPD's instrument, addressed to third parties — employers, medical
  providers — authorising THEM to hand records to the License Division. A document we
  author has no standing with the applicant's former employer. This is not ours to
  write.
· Note the plural. The Forms section carries two: "Authorization for Employment
  Release" and "H.I.P.P.A. (Medical Release)". Model REL-01 as potentially more than
  one document.
```

## It is NOT an upload on the application. Two stages.

Verified against both pages:

```
· Step 13's upload list has EIGHT slots and none of them is a release:
    Recent Photograph* · Identity Verification* · Proof of date of birth* ·
    Proof of Residence* · Safeguard's Photo ID* · Affidavit of Co-habitant* ·
    Training Certificate · Additional Documents
· Step 16 is future tense: the applicant "WILL PROVIDE signed and notarized
  Release(s)". A promise, not a submission.
```

So model it in two stages, and **REL-01 must not block filing**:

```
STAGE 1 — at application time
  The applicant AFFIRMS they will provide it. That is affirmation #3 in the document
  they sign with us, and it is what staff ticks in the portal. Nothing is uploaded.
  This stage IS required to be ready-to-file.

STAGE 2 — later
  The signed release itself, collected as an INTERVIEW document.
  · destination "interview"
  · NON-BLOCKING for submission — a case with everything else done is ready to file
    without it. Blocking it here stalls a case for a document NYPD has not asked for.
  · BLOCKING for interview-readiness.
```

## Notarisation: keep it, and give them the same path references get

The affirmation says "signed and notarized", so we hold the applicant to it.

**The apparent conflict resolves.** The Authorization for Employment Release form has
an "Applicant's Signature" line and no notary block. That is not a blocker — a New
York notary attaches a loose notarial certificate (a separate jurat/acknowledgment
page) to a document with no notarial wording. Standard practice. Build for that:
accept a release plus an attached certificate as one notarised document, and do not
reject an upload for lacking an embedded notary block.

*(Operator follow-up: confirm at the next interview that the License Division accepts
a loose certificate here. If they want their own wording, this is a template change,
not a redesign.)*

## Wire the notary path REL-01 has been missing

`lib/references/notary.ts` already exports exactly what is needed, and it is used
today by `components/public/reference-flow.tsx` and
`components/public/cohabitant-flow.tsx`:

```
ronOptions()          BlueNotary · Proof · OneNotary — notarise by video from home
notaryOptions(area)   a live map scoped to their area, NYC Public Library (free),
                      The UPS Store, their bank or credit union
```

The applicant has never been offered any of it for their own documents.

```
· EXTRACT the notary panel out of reference-flow/cohabitant-flow into ONE shared
  component (components/shared/notary-options.tsx or similar) and use it in all
  three places. Do not fork a fourth copy.
· Show it inside REL-01's "How to get this", scoped to the applicant's own area
  (their address ZIP or borough), with the two routes side by side:
      "Notarise online, from home"  → ronOptions()
      "Notarise in person nearby"   → notaryOptions(<their area>)
· Apply the SAME panel to every notarised requirement the applicant handles
  themselves — AFF-01 and the cohabitant affidavit when they live alone. One
  document with a notary path and another without is an inconsistency they will feel.

WHAT WE DO NOT DO YET
  lib/notarization/ron.ts — the INTEGRATED, notarise-inside-our-platform flow — stays
  OFF. It is gated on RON_ENABLED + RON_PROVIDER + RON_PROVIDER_NY_CONFIRMED, and
  that third flag exists because whether a given provider's flow is valid in New York
  for THESE documents is counsel's call, not ours. Do not open that gate in this
  change. We are handing the applicant the public providers, exactly as references
  are handed them — not asserting a notarisation ourselves.
  The existing guardrail stands: a document is never marked notarised without real
  evidence of a real notarisation.
```

---

# PART G — The application data is collected nowhere the applicant will find it

**This is the most important part.** A concierge applicant completes the flow and is
never asked for their employer, their five-year histories, or the written statements
— all of which we must have in order to file.

The data collection exists. `/portal/details` has the fact groups and
`ApplicationHistory` renders "Places of residence — past 5 years", "Places of
employment — past 5 years" and the out-of-city licence. `LON-01` is a
`generate`-mode questionnaire for the statements.

**But `app/portal/concierge/page.tsx` contains no reference to `/portal/details`, to
readiness, or to anything that would send someone there.** The vault only lists
`obtain`-mode uploads. So the whole data layer is invisible from the page the
applicant actually uses.

```
FIX — make the data asks first-class citizens of the checklist.

· Add a section ABOVE the document vault: "What we need from you" (or similar),
  listing the data groups as cards with the same Needs you / Received treatment the
  documents get:
      Your details            → /portal/details#you, #address, #contact, #physical
      Where you've lived      → the residence history section
      Where you've worked     → employer + employment history
      Your written statements → LON-01
      Keeping your firearm safe → safeguard group
      Confidentiality         → CON-01
  Each card shows "N of M captured" and deep-links to the right section.

· The readiness gate counts these, and the concierge page shows it. A case is not
  ready while the histories are empty, and the applicant must be able to see that
  without knowing /portal/details exists.

· Anchor-link support on /portal/details so a card can jump to its group.
```

---

# PART H — Portal fields we still have no home for

Audited the live fact registry against the portal. These have no fact and no UI:

```
1. EXISTING GUNS — "Do you currently own any handguns or rifle/shotguns?" Yes/No,
   plus a row per firearm: Make · Model · Caliber · Serial Number.
   Nothing in the system holds this.

2. OTHER LICENCES — the yes/no exists; the table behind it does not:
   License/Permit Number · Issuing Agency or Authority · State and County of
   Issuance · Date Issued · Expiration Date.

3. EMPLOYMENT — "Employed" Yes/No · Current Employment Start Date ·
   Business Unit/Suite Number.

4. INDUSTRY — employer.type is free text. The portal is a closed list of 41 values.
   Make it a select using the exact strings (they are in
   PORTAL_ALIGNMENT_REBUILD_PROMPT.md Part 2, typos included).

5. ADDRESS SPLITS — the portal wants Building Number and Street Name as separate
   fields, everywhere: home, mailing, business, safekeeping location, safeguard, and
   every residence-history row. We still store one `street` line. Migrate with a
   best-effort parse and a needs-confirmation flag — a parsed address is a guess
   until the applicant confirms it.

6. SAFEGUARD AGE — 21+ is the portal's hard rule and we capture neither a DOB nor a
   confirmation, so we cannot validate it. Add it.
   (New York residency stays a WARNING — the portal says "ideally".)

7. COUNSEL BLOCK — "Are you being represented by counsel?" Yes/No plus First Name ·
   Last Name · Name of Firm · Email · Phone. Most answer No; we still must ask.

8. RENEWAL — the prior licence number. cases.is_renewal exists; the number does not.
```

---

# VERIFY

```
 1. Exactly one photograph card appears. A case that had IDN-04 satisfied shows
    PHO-01 satisfied with the same file — nobody re-uploads.
 2. Proof of residence offers five separate options and the words "bank statement"
    appear nowhere in the product.
 3. The DMV card shows "Request help" for a concierge case and NOT for a self-guided
    one; the button is visibly secondary to the brass Upload.
 4. "Find me an instructor" sends to gunlicensenyc@gmail.com with the applicant's
    name and account email, shows the confirmation, logs the activity, and disables
    for 7 days.
 5. AFF-02 generates a document, is signable in-system, is never routed to a notary,
    and reads as an explanation of the three articles rather than advice.
 6. REL-01 does NOT block filing. A case with everything else complete reports
    ready-to-file with the release outstanding, and blocks interview-readiness only.
 7. REL-01 offers BOTH notary routes — online and in person, scoped to the
    applicant's area — from ONE shared component also used by the reference and
    cohabitant flows. No fourth copy of that panel exists.
 8. A release uploaded with an attached notarial certificate is accepted; nothing
    rejects it for lacking an embedded notary block.
 9. The integrated RON flow is still OFF — ronStatus() is unchanged, and no document
    can be marked notarised without real evidence.
10. A concierge applicant who has uploaded every document but entered no employer or
    history data sees the checklist say so, with links that reach the right section.
11. Readiness is false while the residence or employment history is empty.
12. Existing guns and other licences can be entered and appear on the worksheet.
13. Industry, height, gender, hair and eye colour all render as selects with the
    portal's exact values.
14. A migrated single-line address shows Building Number and Street Name flagged for
    confirmation, not silently accepted.
15. The safeguard requirement blocks an under-21 and only warns on out-of-state.
```

# DO NOT

- Do not keep two requirements pointing at the same documentType.
- Do not offer a document NYPD does not accept.
- Do not reject a notarised release for lacking an embedded notary block — a loose
  notarial certificate is how New York handles that.
- Do not author a document that stands in for NYPD's own Release.
- Do not open the integrated RON gate. Counsel has not signed off, and the flag
  exists for that reason.
- Do not block filing on the release.
- Do not leave data collection reachable only by a URL the applicant never sees.
- Do not give the Penal Law disclosure any content that applies the law to the
  applicant's own facts. Explain what the articles cover; link the statutes.
