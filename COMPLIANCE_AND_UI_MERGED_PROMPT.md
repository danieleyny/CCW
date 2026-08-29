# Compliance + UI — one merged update

> Eight parts. **Parts C–F are compliance work** against the NYPD's own published documents and must be exact; A, B, G and H are product. Ship together.
>
> **Sources, read directly (not from memory):** NYPD License Division *Handgun License Required Documents Checklist*; *Handgun License Application* PD 643-041 Section B and addendum PD 643-041A; and the official form set — Letter of Necessity, Affidavit of Co-Habitant, Acknowledgement of Person Agreeing to Safeguard Firearm(s), Affidavit of Familiarity with Rules and Law (38 RCNY 5-33), Request for Pre-License Exemption, NYS Firearms License Request for Public Records Exemption.
>
> **Non-negotiables.** Only the applicant signs, swears and adopts (NY Penal Law § 400.00(3)). Notarised instruments are never digitally signed. We fill the REAL official PDF, never a facsimile.

---

## THREE CORRECTIONS TO EXISTING BEHAVIOUR

Read these first — each reverses something currently in the system or in a prior instruction.

```
1. THE SOCIAL SECURITY CARD IS A REQUIRED UPLOAD.
   The official checklist lists "Social Security Card" as mandatory for ALL
   licence types. A previous instruction said to keep it `at_filing` and never
   create an upload slot. That was wrong. Create the requirement, collect the
   card image, and store it under the same sensitivity rules as the disclosures.
   The SSN *number* policy is unchanged — it is still never resolved for a
   sponsor fill and never exposed to the sponsor. The card is a document; the
   number is a fact. Treat them separately.

2. SAFE PHOTOGRAPHS ARE PREMISE-BUSINESS ONLY.
   Two colour photos, door open and door closed, "may not be stock images, and
   must depict the entirety of the safe." They appear ONLY under "Premise
   Business" Licenses. Remove them from the carry and carry-guard tracks; keep
   the safeguarding narrative (Q30) and the safeguard acknowledgement form.

3. REFERENCE COUNTS ARE TRACK-DEPENDENT, and the current copy is correct.
   Base, all licence types: "Two (2) notarized character reference letters —
   References must be lawful U.S. residents. No relatives."
   Concealed Carry / Special Carry adds: "Two (2) additional notarized character
   reference letters - References must be lawful U.S. residents."
   → Concealed carry = 4 total, of which 2 must be non-relatives.
   → Carry Guard = 2 total, and those two may NOT be relatives.
   Do not apply the four-reference rule to a carry-guard case.
```

---
---

# PART A — Document state colours

## Diagnosis

`components/portal/document-uploader.tsx:159–169` — needs-you is `border-l-brass` on `bg-surface-2`; received is `border-l-brass/60` on `bg-surface-2`. **Same hue, same surface.** The four differences are all degrees of one thing, so the eye reads one state.

## The rule

**Brass means "your turn." Nothing else uses brass.**

## Spec

```
STATE              RAIL              SURFACE     CHIP                     TITLE
─────────────────────────────────────────────────────────────────────────────────
Needs you          3px solid brass   surface-2   FILLED bg-brass          medium
                                     (lifted)    text-obsidian · Upload   full
Changes requested  3px solid warn    surface-2   FILLED bg-warn           medium
                                     (lifted)    text-obsidian · Alert    full
Received           2px solid signal  surface-1   OUTLINE border-signal    normal
                                     (flat)      text-signal · Clock      foreground
Approved           2px solid ok      surface-1   GHOST text-ok            normal, muted
                                     (flattest)  Check · no border        description hidden
Waiting on someone none — 1px dashed surface-1   GHOST muted              normal, muted
                                                 names the PERSON
```

`--color-signal` / `--color-signal-dim` already exist. No new colours.

## Chip construction — the part that matters

Brass and signal sit at similar lightness, so hue alone still collides in greyscale and for colour-blind users. **Mass** is what separates them:

```
FILLED   solid colour, dark text punched out.  High mass — a demand.
OUTLINE  thin ring, transparent centre.        Low mass — a label.
GHOST    text and icon only.                   No mass — a footnote.
```

Build as three variants of ONE `StateChip` component. Inline classNames at the call site are exactly how this drifted.

## Supporting

```
· Received moves DOWN to surface-1. Sharing surface-2 with needs-you is half the bug.
· Control follows state: needs-you → primary uploader · received → quiet "Replace"
  text link · approved → "View" only.
· The green smart-document coverage note re-tones to signal, so green means staff
  acceptance and nothing else.
· ONE SOURCE: lib/ui/doc-state.ts returns { rail, surface, chipVariant, chipTone,
  icon, label }. Consumed by the vault, the sponsor surface, /portal/documents and
  the self-guided library.
```

---
---

# PART B — References: tenure and composition

## B1 — The five-year rule is NOT an NYPD requirement

38 RCNY Chapter 5 as amended requires four references who can attest to good moral character, two of them non-family. **No minimum acquaintance period appears in the rule or on the checklist.** Build tenure as *our* guidance, in our voice, and non-blocking:

```
Replace lib/references/questions.ts:10 `knownDuration` (free text) with a
STRUCTURED years field (0–80, optional months). Add the same field to the
applicant's add-a-reference form. The applicant's answer PREFILLS the reference's
form; if they disagree, the reference's answer wins — it is their sworn letter.

WARN at < 5 years, both sides, NON-BLOCKING:
  applicant → "References who have known you five years or more carry noticeably
               more weight with the License Division. This one still counts —
               but if you have someone who has known you longer, use them."
  reference → "Thanks — that's fine to submit. Applications are strongest when
               references have known the applicant five years or more, so we'll
               flag this to their case team."
Surface the stated tenure on the admin case view. Never claim the NYPD requires it.
Leave a marked constant so a hard block is a one-line change IF a citation appears.
```

## B2 — Composition is a real rule, and it IS currently broken

The system let an applicant add **three** family references. Enforce the actual rule:

```
CONCEALED / SPECIAL CARRY (4 references)
  · at least 2 must be NON-relatives
  · therefore at most 2 may be family
  · none may be in law enforcement (existing rule — keep)

CARRY GUARD (2 references)
  · BOTH must be non-relatives. The base checklist says "No relatives."
  · Do not offer a "family member" option at all on this track.

BEHAVIOUR
  · Block the add when it would exceed the family cap, with a specific message:
    "You already have 2 family references. At least 2 of your 4 must be unrelated
     to you — add someone who isn't family."
  · Never silently drop or reorder. Tell them why the button will not work.
  · Re-validate on delete: removing a non-family reference must re-flag the set.
  · The "All 4 references added" success banner must NOT appear when the
    composition is invalid — today it would. Gate it on composition, not count.
  · Block packet assembly (CP-5) on an invalid composition, with the reason named.
```

---
---

# PART C — The disclosure questions: all of Section B

## The gap, measured

`lib/requirements/questionnaires.ts` `disclosure-addendum` asks **five** questions: everArrested, orderOfProtection, domesticIncident, mentalHealth, licenseDenied.

**The official application asks twenty** (Q10–Q20a, Q21–Q28). Fifteen are missing, and three that exist are collapsed versions of separate official questions.

## C1 — Ask every question, in the form's own words

Rebuild the questionnaire to mirror PD 643-041 Section B exactly. Verbatim question text — this is a sworn form and paraphrase invites a mismatched answer:

```
10.  Had or ever applied for a Handgun License issued by any Licensing Authority in N.Y.S.?
11.  Been discharged from any employment?
12.  Used narcotics or tranquilizers?  [if yes: doctor's name, address, telephone]
13.  Been subpoenaed to, or testified at, a hearing or inquiry conducted by any
     executive, legislative or judicial body?
14.  Been denied appointment in a civil service system, Federal, State, Local?
15.  Served in the armed forces of this or any other country?
16.  Received a discharge other than honorable?
17.  Been rejected for military service?
18.  Are you presently engaged in any other employment, business or profession
     where a need for a firearm exists?
19.  Had or applied for any type of license or permit issued to you by any City,
     State or Federal agency?
20.  Has any corporation or partnership of which you are an officer, director, or
     partner, ever applied for or been issued a license or permit issued by the
     Police Dept?  [if yes: type, year, licence number]
20a. Has any officer, director or partner ever applied for or been issued a
     license or permit issued by the Police Department?  [if yes: type, year, licence number]
21.  Suffered from mental illness, or due to mental illness received treatment,
     been admitted to a hospital or institution, or taken medication?
     [if yes: doctor's / institution's name, address, phone]
22.  Have you ever suffered from any disability or condition that may affect your
     ability to safely possess or use a handgun?  [if yes: doctor's name, address, phone]
     NOTE, shown verbatim: "The following conditions must be listed: Epilepsy,
     Diabetes, Fainting Spells, Blackouts, Temporary Loss of Memory or any
     Nervous Disorder."
23.  Been arrested, indicted, or summonsed for ANY offense other than Parking
     Violations, in ANY jurisdiction, federal, state, local or foreign? You must
     include cases that were dismissed and/or the record sealed.
     [if yes: date, time, charge(s), disposition, court and police agency]
24.  Have you ever, or do you now have an Order of Protection issued against you?
25.  …issued by you against a member of your household, or any family member?
26.  …issued by you against a person other than a member of your household or family?
     [if yes to 24–26: a. Court of Issuance · b. Date of Issuance · c. Complainant's
      name, address and telephone number · d. Complainant's relationship to you ·
      e. Reason for issuance]
27.  Have the police ever responded to a domestic incident in which you were involved?
28.  Used any variation in spelling of your name or any other name used? (Alias), explain.
```

```
RULES
· 24, 25 and 26 are THREE SEPARATE questions. Do not collapse them.
· Q21 and Q22 are separate — one is mental illness, the other is any disability
  or condition affecting safe possession. The current single "mentalHealth"
  question covers neither properly.
· A "yes" reveals the specific sub-fields the form names, not a generic textarea.
· Keep the existing candour notice. It is correct and it matters most here.
· Preserve existing answers where a question maps cleanly (everArrested → 23,
  domesticIncident → 27); migrate rather than discard, and flag for re-review
  anything that was a collapsed answer.
```

## C2 — Two different documents, and the current one is wrong

The generated addendum currently reads *"The applicant answered 'no' to each disclosure question; no written explanation is required."* That is not what PD 643-041A is.

```
THE OFFICIAL ADDENDUM — PD 643-041A
  Its own instruction: "This form is to be used to provide a detailed explanation
  for any 'yes' answers to questions 10 through 28."
  It is a two-column table: Question Number | Detailed Explanation, then the
  affirmation, Date and Signature.
  → Generate it ONLY when there is at least one "yes", and list ONLY the yes
    answers, keyed by the form's own question number.
  → If every answer is "no", NO ADDENDUM IS PRODUCED. Listing twenty "no" rows on
    this form is a misuse of it.

THE DISCLOSURE SUMMARY — ours, not the NYPD's
  A separate internal worksheet listing every question 10–28 with the applicant's
  answer, so he and the case team can see the complete record and transcribe it
  onto the portal accurately. This is what the user asked for, and it belongs
  here rather than on the official form.
  → Clearly OUR document. Not an NYPD form. Label it so.
```

---
---

# PART D — Use the NYPD's own templates

Several documents must be produced on the agency's form. Add each to the template registry with `requires`, `notarize`/`witness` flags, source URL, revision and sha256, exactly as the existing templates are held.

```
D1  LETTER OF NECESSITY — "Additional Instructions for Carry License Applicants"
    The form states: "In ALL CASES the form provided must be used."
    Six numbered statements the applicant must supply:
      1. Detailed description of employment and why it requires carrying a
         concealed handgun
      2. Acknowledgement that the handgun may only be carried during and strictly
         in connection with the job/business/occupational requirements
      3. How the gun will be safeguarded by the employer and/or applicant when not
         in use
      4. That the applicant has been trained or will receive training in the use
         and safety of a handgun
      5. Acknowledgement that the employer (or self-employed applicant) is aware of
         its responsibility to properly dispose of the handgun and return the
         licence to the License Division on termination of employment or cessation
         of business
      6. That the applicant — and if not self-employed, a corporate officer,
         general partner or proprietor — has read and is familiar with Penal Law
         Articles 35, 265 and 400
    Signed and dated. False statement = Class A misdemeanour, PL § 210.45.
    → This closes the `gap` currently flagged for the letter of necessity in
      config/application-coverage.ts, AND is the correct artifact for SPN-02.
      For a sponsored case the employer supplies items 1, 3 and 5; the applicant
      signs. Wire it into the sponsor packet accordingly.

D2  ACKNOWLEDGEMENT OF PERSON AGREEING TO SAFEGUARD FIREARM(S)
    Applicant/licensee name · application or licence number · then the SAFEGUARD's
    print name (last/first/MI), address (state pre-printed NY), telephone
    (home/cell/business), the acknowledgement paragraph, their signature and date.
    → WITNESSED, NOT NOTARISED. "sign this acknowledgement before a witness" —
      capture witness signature and printed name.
    → "The person you designate must be a New York State resident." Validate it.
    → Plus a copy of the safeguard's State or Federal photo ID (checklist).

D3  TWO SEPARATE INSTRUMENTS — build both, never one standing in for the other
    This is confirmed by the operator. They are NOT the same document and a case
    is not complete with only one of them.

    D3a  AFFIDAVIT OF FAMILIARITY WITH RULES AND LAW (38 RCNY 5-33)
         State of New York, County of ___, the sworn paragraph, Signature,
         "Sworn to before me this ___ day of ___", Notary Public.
         → NOTARISED. Generate filled and UNSIGNED; route to the notary step.

    D3b  AFFIRMATION OF UNDERSTANDING OF NYS PENAL LAW
         ARTICLE 35, ARTICLE 265 AND ARTICLE 400
         Listed separately on the NYPD required-documents checklist.
         → Its own requirement code, its own template entry, its own row in the
           vault and the checklist. NOTARISED.

    RULES
    · Two distinct requirement codes. Satisfying one must NEVER mark the other
      satisfied — no aliasing, no shared code, no "same doc, two labels."
    · Two distinct rows in every surface, labelled distinctly enough that the
      applicant can tell them apart at a glance. "Affidavit of Familiarity
      (38 RCNY 5-33)" and "Affirmation of Understanding — Penal Law Art. 35 /
      265 / 400."
    · Both notarised, so both go to the notary step and neither is ever
      digitally signed.
    · Packet assembly (CP-5) blocks until BOTH are present.
    · If any existing case has one code satisfied by a document that was
      actually the other instrument, flag it for staff re-review rather than
      silently carrying it forward.

D4  AFFIDAVIT OF CO-HABITANT
    KEEP the Rev 11/16/2023 template already in assets — it is NEWER than the
    9/25/2009 version in this packet and it carries the solo-resident section the
    older one lacks. Do not replace it.
    → Notarised, one per adult resident. Solo-resident section for a lone
      applicant, not notarised. Both branches must generate.

D5  REQUEST FOR PRE-LICENSE EXEMPTION
    Already held. Fields: Applicant's Name · Application Control Number ·
    Applicant's Address · Age · Birth Date · Type of License · Name of Range,
    Address, Telephone Number · Name of Instructor · Instructor's Verified
    Statement · Applicant's Signature · Instructor's Signature.
    → "THIS FORM MUST BE TYPED AND NOTARIZED" — notarize:true, signable:false.
    → Map the instructor half; it is currently unmapped.

D6  NYS FIREARMS LICENSE REQUEST FOR PUBLIC RECORDS EXEMPTION
    PL § 400.00(5)(b). Applicant/licensed checkbox · name · DOB · address · city ·
    state · licence # and date issued (if any) · licensing authority/county · then
    grounds 1(A–D), 2, 3(A–D), 4, and 5 free text · signature · date.
    NOT notarised.
    → OPTIONAL and OPT-IN. Most applicants do not know it exists. Offer it
      explicitly with a plain explanation of what it does, and generate it only
      when they ask. This is a genuine concierge value-add, not a requirement.
```

---
---

# PART E — What we are not collecting yet

```
E1  FIVE-YEAR RESIDENCE HISTORY (Q29) — repeatable rows: From / To (month and
    year) · Residence including State, County, Zip Code and Apt. No. · Precinct.
    "PRESENT" is a valid To value for the current row.

E2  FIVE-YEAR EMPLOYMENT HISTORY (Q29) — repeatable rows: From / To · Business
    Name and Address including State, County, Zip · Occupation · Precinct.

    Both are on the official form and neither is collected today. Precinct may be
    derived from the address where possible; leave it editable.

E3  SAFEGUARD (Q30 + Q31)
    Q30 — "How and where will handgun(s) be safeguarded when not in use?"
          Note the form's own constraint: "Location outside of N.Y. State is
          unacceptable." Validate it.
    Q31 — name, address, relation and telephone of the person who will safeguard
          the handgun in case of the applicant's death or disability. "Must be a
          N.Y. State resident."
    Feeds D2, so collect once and reuse.

E4  SOCIAL SECURITY CARD — a required upload for all licence types. See correction 1.

E5  PROOF OF RESIDENCE — tighten to exactly what the checklist accepts:
      · Current utility bill, and ONLY: Electric · Cable/Internet ·
        Landline Telephone · Gas
      · OR a current residential lease or document indicating ownership shares in
        a cooperative or condominium, AND a signed and filed New York State
        Income Tax Return with matching address
    The second option is a TWO-DOCUMENT requirement — it is not complete with the
    lease alone. Model it as such.
    Remove "bank statement" and "government correspondence" from the help text.
    Keep the cell-phone-bill warning.

E6  PROOF OF NAME CHANGE — IF APPLICABLE. Conditional, not required.

E7  ALL OTHER CURRENTLY HELD FIREARMS LICENCES — IF APPLICABLE. Including:
      · other licences or permits issued by New York City and/or New York State
      · licences or permits issued by other States
      · HR 218 card, pursuant to 18 U.S.C. 926(C)
    Multi-upload; a person may hold several.

E8  MILITARY DISCHARGE — IF APPLICABLE. BOTH are required, not either:
      · separation papers (DD 214), AND
      · discharge papers
    Model as a two-part requirement.

E9  ARREST INFORMATION — IF APPLICABLE, for EACH arrest, criminal court summons,
    OATH summons and/or Transit Adjudication Bureau summons:
      · Certificate of Disposition showing the offence and disposition
      · Certificate of Relief from Disabilities — ONLY where the conviction or
        guilty plea is for a felony or a serious offence as defined in NY Penal
        Law § 265.00(17); must be an original, signed certificate
      · Detailed written statement of the circumstances — "even if the case was
        dismissed, the record sealed or the case nullified by operation of law"
    This closes the second standing `gap` in the coverage map.

E10 ORDER OF PROTECTION — IF APPLICABLE, for EACH: a copy, or if unavailable the
    date and court of issuance, date of expiration and all named parties; plus a
    detailed written statement of the reason for issuance and the applicant's
    relationship to every other party named.

E11 POST-SUBMISSION DUTIES — "Notice to All Applicants". While the application is
    pending the applicant must immediately report to the License Division
    (646) 610-5551: any arrest, indictment or conviction, or summons other than a
    traffic infraction; change of business or residence address; change of
    business, occupation or employment; any change in circumstances cited in the
    application; receipt of psychiatric treatment or treatment for alcoholism or
    drug abuse, or any disability or condition affecting safe possession; and
    becoming the subject of an order of protection.
    → Surface this after filing as standing obligations with a reminder cadence.
      Nobody reads it on page 5 of a PDF, and a missed report is exactly the kind
      of thing that sinks an application late.
```

---
---

# PART F — ID front and back

```
When the applicant selects a document kind that is a CARD, require two images:
front and back. Applies to: driver's licence / state ID · permanent resident card ·
security guard registration card · county pistol licence · HR 218 card · the
safeguard's photo ID.

A passport is a booklet — the photo page alone is sufficient. Do not demand a
"back" for it.

The requirement is complete only when BOTH sides are present. Reuse the existing
multi-file completion rule rather than inventing a second one, and make the
uploader show two distinct slots, labelled, rather than a generic multi-upload.
```

---
---

# PART G — Everywhere, and from one definition

```
Every change above lands in the requirement registry and the questionnaire
definitions, so all four surfaces inherit it:
  · the concierge vault
  · the sponsor surface (party_scope unchanged — the sponsor's view of the
    applicant's new requirements follows the existing rules)
  · /portal/documents, the read-only review
  · the self-guided checklist and document library

Track-gate correctly:
  concealed_carry  → 4 references (max 2 family) · 16-hr DCJS course · social
                     media list · county licence front and back
  carry_guard      → 2 references, NO relatives · 47-hr course · 20-hour
                     worksheet · letter of necessity · child support certification
  premise_business → safe photographs live here and nowhere else
  ALL              → the Part C questions, the Part E collection, Part F
```


---
---

# PART H — Sponsor intake: ask ISS Action the business facts up front

## The problem, twice over

1. **A document already fails to generate.** `lib/facts/registry.ts:82–88` resolves
   `employer.name` with a fallback to the sponsor record, but `employer.address.*`,
   `employer.phone` and `employer.type` resolve ONLY from `s.intake.business*`.
   The `sponsors` table has no business address, phone or type columns at all, so
   for a sponsored case those facts are unresolvable and the generator errors.
2. **Two open questions have no home.** Whether the sponsoring company holds an
   NYPD Carry Business licence, and who its designated gun custodian is, are facts
   only the sponsor can answer — and they change what the applicant's packet needs.

Both are the same fix: a short sponsor intake, asked ONCE, on first entry to the
sponsor portal, before the sponsor can do anything else.

## H1 — The gate

```
On first load of the sponsor portal, if sponsor intake is incomplete, show the
intake and nothing else. Not a dismissible banner — a gate. It is six fields and
it unblocks their own applicant, so it is worth the friction exactly once.
Re-editable afterwards from a "Company details" link. Never re-gated.
```

## H2 — What to ask

```
BUSINESS IDENTITY  (these back employer.* and fix the generator)
  · Legal business name                       → employer.name
  · Business address: street, city, state, zip → employer.address.*
  · Business telephone                        → employer.phone
  · Business type / nature of business        → employer.type

CARRY BUSINESS LICENCE
  · "Does your company hold an NYPD Carry Business licence?"
      Yes / No / I'm not sure
  · If YES  → licence number, and expiration date if known.
  · If NOT SURE → accept it and route to staff. Do not force a guess on a
    question with a legal answer; an "I'm not sure" that reaches a human is worth
    more than a confident wrong yes.

GUN CUSTODIAN
  · "Who is your company's designated gun custodian?"
      Name · title · business telephone · business email
  · Helper text, plain: "The person responsible for the company's firearms — who
    issues and collects them, and who the License Division contacts about them."
  · Same Yes/No/Not sure shape if they don't have one designated: a company with
    no custodian is a real answer and a fact the case team needs.
```

## H3 — Wiring

```
· Add the columns to `sponsors` (or a `sponsor_intake` row keyed to it — match
  whatever the applicant intake already does; do not invent a second pattern).
· Point the employer.* resolvers at the new columns, keeping the existing
  `s.intake.business*` path as the first source so nothing that works today breaks.
  Order: applicant intake → sponsor intake → sponsor record name fallback.
· The three answers that are not employer facts — carry business licence, its
  number, the custodian — surface on the ADMIN case view, flagged when the answer
  was "I'm not sure."
· The letter of necessity (D1) draws items 1, 3 and 5 from this intake. Wire it
  through rather than asking the sponsor the same things twice.
· Fill the applicant-facing generator gap: once the intake is complete, the
  document that currently errors must generate. That is the acceptance test.
· For Chery's case specifically: Pamela sees this gate the next time she signs in.
  Nothing about the applicant's side changes.
```

---
---

## VERIFY

```
PART A
1. Greyscale test — one card per state, converted to greyscale, still nameable.
2. Squint test — needs-you cards are the only bright blocks.
3. Upload: rail brass→signal, chip filled→outline, surface 2→1.
4. No brass anywhere except needs-you.

PART B
5. Adding a third family reference is BLOCKED with a specific message; the
   success banner does not appear on an invalid composition; CP-5 blocks it.
6. A carry-guard case offers no family option and requires 2 non-relatives.
7. Tenure under 5 years warns on both sides and blocks neither.

PART C
8. All twenty questions present, verbatim, with 24/25/26 separate and 21/22 separate.
9. All "no" → NO addendum generated. One "yes" → PD 643-041A with only that
   question number and explanation.
10. The disclosure summary lists every question with its answer and is clearly
    labelled as ours.
11. Existing answers migrated, collapsed ones flagged for re-review.

PARTS D–F
12. Every template in the registry with correct notarize/witness flags; the
    validator passes; no template claims both signable and notarize.
13. Letter of necessity generates with all six statements; sponsor supplies 1, 3, 5.
14. Safeguard acknowledgement captures the witness and validates NY residency.
15. Cohabitant affidavit still uses the Rev 11/16/2023 template, both branches.
16. Residence and employment history capture five years of rows.
17. Proof of residence: lease alone is INCOMPLETE without the tax return.
18. Military discharge requires both DD 214 and discharge papers.
19. A card-type ID is incomplete with only one side; a passport is complete with one.
20. The public records exemption is offered, explained, and generated only on request.
21. The 38 RCNY 5-33 affidavit and the Article 35/265/400 affirmation are TWO
    codes; satisfying one leaves the other outstanding; CP-5 blocks on either.

PART H
22. A sponsor with no intake is gated on first load and cannot proceed past it.
23. After intake, the document that previously errored on missing employer facts
    GENERATES. Re-run the exact failure to confirm.
24. "I'm not sure" is accepted on both the carry-business and custodian questions
    and appears flagged on the admin case view.
25. A sponsor who completes intake is never gated again.

ALL
26. A concealed-carry case and a carry-guard case each seed the right set and
    nothing extra; existing cases migrate without losing satisfied requirements.
27. pnpm build && pnpm test green on macOS. 390px throughout.
```

## DO NOT

- Do not paraphrase the Section B questions — they are sworn answers.
- Do not put "no" answers on PD 643-041A. It is for "yes" explanations only.
- Do not collapse Q24, Q25 and Q26, or Q21 and Q22.
- Do not require safe photographs outside Premise Business.
- Do not apply the four-reference rule to a carry-guard case.
- Do not accept a lease as proof of residence without the matching tax return.
- Do not replace the newer cohabitant template with the 2009 version.
- Do not digitally sign anything marked notarised.
- Do not expose the SSN *number* to the sponsor — the card is a document, the number is not.
- Do not merge the 38 RCNY 5-33 affidavit and the Article 35/265/400 affirmation. Two instruments, two codes.
- Do not force the sponsor to guess on the carry-business or custodian questions. "I'm not sure" routes to staff.
