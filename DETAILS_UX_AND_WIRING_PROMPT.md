# Details screen: sequencing, conditionals, prefill, autosave, and the wiring that isn't connected

Fourteen items from a full pass through the applicant flow. Four are real bugs, three
are things we ask for that the portal never asks, and the rest is making the screen
behave the way a form should.

---

# 1 — The engagement terms should open one after another

Today: the first agreement is open, the other five are collapsed, and the applicant
has to hunt for each one.

```
When the applicant chooses "I agree" on the open agreement:
  · collapse it, leaving the green check and the title visible
  · OPEN THE NEXT unanswered agreement automatically, scrolled into view
  · when the last one is answered, collapse everything and bring the signature
    block into view

"I do not agree" does NOT advance. Keep that card open, since it ends the engagement
and the applicant should see exactly which term they declined.
Re-opening an already-answered card by clicking its header still works — this is a
convenience, not a lock.
```

---

# 2 — Place of birth: delete it

I checked all seventeen steps of the live portal. **Place of birth is not asked
anywhere.** It is not on the document checklist either — what NYPD wants there is
*proof of citizenship*, which is a document (IDN-03), not a typed city.

It is a leftover from the paper PD 643-041.

```
Remove applicant.placeOfBirth from the details screen and from the worksheet.
Do not replace it with "state of birth" or "city of birth" — neither is asked.
Keep the column in the database; drop it from the UI and the readiness count so
nothing is lost and nobody is asked for it.
```

---

# 3 — Citizenship: three options, and make the dependents conditional

The portal asks a plain **"Are you a U.S. Citizen? Yes / No"**. Our select needs a
third option, and it needs to gate what follows.

```
OPTIONS
  · U.S. citizen
  · Lawful permanent resident (green card)
  · Neither

CONDITIONALS — hide, do not just tag "only if it applies":
  · Alien registration #  → visible ONLY for Lawful permanent resident
  · Prior licence number  → visible ONLY when the case is a renewal
                            (cases.is_renewal, not a guess from the applicant)

"NEITHER" IS AN ELIGIBILITY ANSWER, NOT A DATA POINT.
Under 18 U.S.C. § 922(g)(5) a person who is not a citizen and not a lawful permanent
resident is generally federally prohibited from possessing a firearm. Route this
answer into the existing eligibility gate (ELG-*) rather than collecting it and
carrying on. Say plainly that we can't proceed and why, and don't take their money.
Do NOT write a legal conclusion about their particular status — state the general
rule, and route to the attorney-review path we already have.
```

---

# 4 — Three phone fields become two

The portal has exactly two: **Primary Phone** and **Other Phone**.

```
KEEP    Cell phone  → maps to Primary Phone. Required.
KEEP    Work phone  → maps to Other Phone. Optional.
REMOVE  Home phone.

MIGRATION: where a case has a home phone and no cell, move it to cell rather than
losing it. Where both exist, keep the cell and drop the home value.
```

---

# 5 — Employer section: order and required-ness

```
· Move "Business unit / suite number" to sit directly under "Employer street".
  It is part of the address, not a trailing extra.
· "Current employment start date" loses the ONLY IF IT APPLIES tag and becomes
  REQUIRED whenever employer.employed is Yes. Every job has a start date.
  It stays hidden entirely when employed is No.
```

---

# 6 — The safeguard storage question needs an example

`safeguard.method` is a blank box under an abstract question and people freeze on it.

```
Add a collapsed "Show me an example" under the field. Opened, it reads:

  "In a locked safe in my bedroom closet at my home address, with the ammunition
   stored separately in the same safe."

Use a real, complete sentence — it is modelling the level of detail the License
Division expects, not just filling space. Keep the field's own constraint visible:
the location must be in New York State.
```

---

# 7 — Counsel: make it dynamic, drop the tags

```
"Are you represented by an attorney for this application?"  Yes / No
  · No  → nothing else renders
  · Yes → reveal attorney first name, last name, firm, email, phone (all required)

Delete the five ONLY IF IT APPLIES tags. A field that is hidden when it doesn't
apply needs no tag; a tag on a visible field is just noise.
```

Apply the same rule anywhere else a tag stands in for a conditional.

---

# 8 — BUG: every applicant sees "THE COMPANY"

`app/portal/details/page.tsx` —

```ts
const GROUP_ORDER: FactGroup[] = ["you","address","contact","physical","employer",
                                  "safeguard","counsel","sponsor"]
```

`"sponsor"` is unconditional, so a plain concealed-carry applicant is shown Company
legal name, Agency licence #, Agency licence expiry, Gun custodian and Custodian
licence # — an armed-guard block that has nothing to do with them.

```
Gate the sponsor group on the case actually being sponsored (a non-revoked
case_sponsorships row), the same test the sponsor surface already uses. Compute
GROUP_ORDER per case rather than as a module constant.
```

---

# 9 — Prefill the employment history from the employer we already have

We ask for the employer, the job title and the start date, then ask for the same
thing again in the five-year history. Fill it in for them.

```
WHEN employer.employed = Yes AND employer.startDate is set, seed history row 1:
    From        = employer.startDate
    To          = Present
    Business    = employer.name
    Occupation  = applicant.jobTitle

THEN:
  · startDate MORE than 5 years ago → the window is covered. Say so:
      "This job covers the full five years. Nothing else needed here."
  · startDate WITHIN the last 5 years → the row covers part of it. Say so, with the
    real date:
      "This covers back to 3/1/2022. Add anything before that."

RULES
  · Mark a seeded row as prefilled. Once the applicant edits it, later changes to
    the employer facts must NOT silently overwrite it — offer to re-sync instead.
  · Seeding happens when the history is empty. Never duplicate a row the applicant
    already entered.
```

---

# 10 — Out-of-city licence behind a Yes/No

Today the four fields sit there open for every applicant, and they apply only to
Special Carry.

```
"Do you hold a pistol licence from another New York county?"  Yes / No
  · No  → nothing renders
  · Yes → licence number, county, date issued, expires
```

---

# 11 — The history section must autosave

The rest of the details screen saves as you go; this section still has a "Save
history" button, and losing a five-year history to a stray click is a real way to
lose someone.

```
· Autosave each row on blur, once its required fields are filled — same pattern the
  fact rows use.
· Keep a small inline "Saved" tick per row; no toast per row.
· Removing the explicit button is fine, but if it stays it must be a no-op
  reassurance, never the only path to persistence.
· A failed save keeps the typed values on screen with an inline error. Never revert.
```

---

# 12 — BUG: the safeguard disclosure ignores everything already entered

The applicant fills the safeguard block on the details screen, opens the safeguard
acknowledgement, and every field is empty.

**Root cause** — in `lib/requirements/questionnaires.ts`, only `applicantName`
carries a `fact:` binding. Every safeguard field is unbound:

```
safeguardLastName · safeguardFirstName · safeguardMI · safeguardStreet ·
safeguardApt · safeguardCity · safeguardZip · safeguardHomePhone ·
safeguardCellPhone · safeguardBusinessPhone      ← none has fact:
```

```
FIX, and it needs the facts reshaped to match (this is the same reshape already
identified in STATUS_AND_FINAL_GAPS #3 and #5):
  safeguard.firstName · safeguard.lastName          (split from safeguard.name)
  safeguard.buildingNumber · safeguard.streetName · safeguard.apt ·
  safeguard.city · safeguard.state · safeguard.zip  (real fields, not one string)
  safeguard.phone · safeguard.email

Then bind every questionnaire field to its fact so the form opens prefilled.

AUDIT EVERY OTHER QUESTIONNAIRE THE SAME WAY. Any field whose answer already exists
as a fact must carry a fact: binding. "Entered once, reused everywhere" is the
promise on the details screen, and it is currently not kept.
```

**A copy conflict to resolve, not to guess at.** The modal says the safeguard *must*
be a New York State resident and hard-requires a NY ZIP. The online portal says
*"Ideally from New York State"* and offers all fifty states. NYPD's own paper
acknowledgement form does say "must". Two NYPD surfaces disagree.

```
Soften the ZIP to a WARNING, not a block — the filing surface is the portal, and it
allows it. Keep the form's stricter wording visible as a caution. Flag it on the
admin case view so the operator can settle it with the License Division.
Age 21 stays a hard requirement — that one is unambiguous on both surfaces.
```

---

# 13 — The "Your information" cards land in the wrong place

`lib/concierge/data-asks.ts` — the residence and employment cards deep-link
(`/portal/details#history`) and work. Two do not:

```
line 73  lon    → "/portal/checklist"      no anchor
         con    → "/portal/checklist"      no anchor
```

The applicant clicks "Your written statements", lands at the top of a long checklist,
and has to find it.

```
· Give each requirement card on the checklist an id (#LON-01, #CON-01, …) with
  scroll-mt so the sticky header doesn't cover it.
· Point the data-ask cards at those anchors.
· Better: land with that requirement's questionnaire ALREADY OPEN. Clicking
  "Your written statements" should put the applicant in front of the statements,
  not near them.
· Same treatment for every card in the section — a card that doesn't land on its
  own subject is worse than no card.
```

---

# 14 — While you're in there

```
· "Your details 14 of 18 captured" must recount after items 2 and 4 remove fields,
  or the meter will never reach full.
· Any field hidden by a conditional is excluded from the count and from readiness —
  a hidden field is not an outstanding one.
```

---

# VERIFY

```
 1. Agreeing to a term collapses it and opens the next, scrolled into view; the last
    one brings up the signature block; "I do not agree" does not advance.
 2. Place of birth appears nowhere in the applicant UI or the worksheet.
 3. Citizenship offers three options. Alien registration # shows only for an LPR.
    Prior licence number shows only on a renewal. "Neither" routes to the
    eligibility gate rather than collecting and continuing.
 4. Home phone is gone; a case that had one and no cell now shows it as the cell.
 5. Business unit/suite sits under employer street; start date is required when
    employed and hidden when not.
 6. The safeguard storage field has a working "Show me an example".
 7. Counsel = No renders nothing else; = Yes reveals five required fields; no
    ONLY IF IT APPLIES tags remain on conditionals.
 8. A non-sponsored concealed-carry applicant does NOT see THE COMPANY.
 9. An employer with a start date 7 years ago seeds one history row and says the
    window is covered. A start date 2 years ago seeds the row and asks for anything
    before that specific date. Editing a seeded row survives a later employer edit.
10. Out-of-city licence fields appear only after answering Yes.
11. Typing a history row and navigating away without clicking anything keeps it.
12. Filling the safeguard block on the details screen means the safeguard
    acknowledgement opens PREFILLED. An out-of-state safeguard warns; it does not
    block. Under-21 still blocks.
13. Every "Your information" card lands on its own section with the right thing open.
14. The captured counter reaches its total when every visible field is filled.
```

# DO NOT

- Do not ask for anything the portal does not ask for.
- Do not use an "only if it applies" tag where a conditional belongs.
- Do not leave a questionnaire field unbound when the fact already exists.
- Do not block an out-of-state safeguard; the filing surface permits it.
- Do not tell an applicant what their immigration status means for them. State the
  general rule and route to attorney review.
- Do not overwrite an edited history row from the employer facts.
