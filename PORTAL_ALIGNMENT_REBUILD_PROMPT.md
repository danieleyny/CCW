# Rebuild around the real filing surface: the NYPD online portal

**Every field, question, dropdown and rule below was read directly off the live
portal, step by step, on a real in-progress Concealed Carry application.** Where this
document disagrees with PD 643-041, the paper checklist, or any earlier spec, this
document wins.

## The model

```
1. The applicant uploads the documents we need.
2. The applicant answers every disclosure question, in the portal's own words.
3. The system generates ONE document — their answers, the portal's four
   affirmations, and an authorization — which the applicant SIGNS DIGITALLY.
4. Staff transcribe from a portal-ordered worksheet into the NYPD portal.
```

We do not produce a filled government form. We collect, we record, the applicant
attests, we transcribe.

## The portal's 17 steps, confirmed

```
 1  Identity, contact, home address, citizenship, SSN last 4
 2  Residence history (5 years)
 3  Employment — current
 4  Employment history (5 years)
 5  Other licenses
 6  Existing guns
 7  Safekeeping + safeguard person
 8  Questions 1–6
 9  Questions 7–12
10  Questions 13–15
11  Confidentiality — the Public Records Exemption form, INLINE
12  Letter of Necessity statements
13  Document uploads
14  Counsel + preparer
15  Verify Your Information
16  Affirmations + post-submission duties → "Finalize and Pay"
17  Payment type → NYC CityPay
```

---

# PART 1 — Delete the paper-form path

Paper is dead: *"As of January 1, 2018 … Applications on paper will no longer be
accepted."*

```
DELETE
· assets/form-templates/handgun-license-application-643-041.pdf
· assets/form-templates/application-addendum-643-041a.pdf
· assets/form-templates/letter-of-necessity.pdf
· assets/form-templates/public-records-exemption.pdf        ← see Part 5
· lib/forms/templates.ts → nypd_handgun_application, nypd_disclosure_addendum,
                            nypd_letter_of_necessity, nypd_public_records_exemption
· lib/forms/application.ts · application-readiness.ts · section-b.ts · partial.ts
· prepareApplication() + components/portal/prepare-application-button.tsx
· the prepared-application block in lib/packet/filing-pack.ts
· tests/section-b-list.test.ts, application-readiness.test.ts, PD 643-041 cases
· ALL PRECINCT LOGIC — fields, derivation, the find-your-precinct note. The portal
  computes the precinct itself from the address and shows it read-only; there is
  nowhere to enter one.
```

**Keep a readiness gate**, recomputed against the field set below. "You're ready" /
"here's what's missing and where to fix it" is what makes the product work.

---

# PART 2 — Steps 1–7: fields and formats

Every value is stored canonically and rendered in the portal's format on the
worksheet. **Closed lists must be selects in our UI, using these exact values** —
a free-typed "Blonde" that has to become "Blond" is a transcription error waiting.

## Step 1 — Identity

```
First Name · Middle Initial · Last Name
Gender          SELECT: Male · Female · Other
Date of Birth   M/D/YYYY   (8/23/2002 — not zero-padded, not ISO)
Height          SELECT: 3'00" … 8'00", every inch. NOT total inches.
Weight          numeric (renders 130.00)
Hair Color      SELECT: Black · Brown · White · Red · Gray · Blond · Auburn ·
                Chestnut · Bald · Sandy · Dyed · Salt & Pepper · Frosted · Other
Eye Color       SELECT: Black · Blue · Brown · Gray · Green · Hazel ·
                Two Different · Other
Email Address · Primary Phone · Other Phone
Home address:   Building Number · Street Name · Apt/Unit/Suite · City · State · Zip
CHECKBOX        "My mailing address is different from my home address"
                → reveals the mailing block. CONDITIONAL, not always required.
Are you a U.S. Citizen?   Yes / No
SSN Last 4 digits         ← FOUR DIGITS ONLY
```

```
CHANGES FROM WHAT WE STORE
· SSN: stop storing a full SSN. The portal wants the last four. Less sensitive data
  on our side for the same outcome. Migrate to a 4-digit fact and drop the rest.
· Citizenship is a plain Yes/No. There is NO alien-registration field on this step.
  Keep applicant.alienRegistrationNumber as an interview fact; it has no portal home.
· Place of birth does NOT appear anywhere in the 17 steps. Keep it for the
  interview; do not put it on the worksheet.
· Height must become feet-inches. Store both parts.
· Mailing address is behind a checkbox — model it as a boolean + conditional block.
```

## Step 2 — Residence history (5 years)

```
Repeating table. Columns:
  From (M/D/YYYY) · To (M/D/YYYY) · Building Number · Street Name ·
  Apt/Unit/Suite · City · State · Zip Code
```

Our `{ fromMonth, toMonth, address: "one string" }` must become full dates and six
address parts.

## Step 3 — Employment, current

```
Name of Business
Start Date (M/D/YYYY)
Industry   SELECT, exactly these 41 values (their typos included):
  ACCOUNTING FIRM · ALARM INSTALLLER · ARMORED CAR CARRIER · ART DEALER ·
  AUTHORIZED PROPRIETARY · AUTOMOBILE REPAIR · BAIL ENFORCEMENT AGENT · BANK ·
  CAR DEALERSHIP · CK CASHING - AUTH TO HIRE EMPLOYEES ·
  CK CASHING - NOT AUTH FOR EMPLOYEES · CONSTRUCTION · COURIER SERVICE ·
  FEDERAL AGENCY · FOREIGN COUNTRY SECURITY · FUNERAL HOME · GASOLINE STATION ·
  GUN DEALER · HOTEL/MOTEL BUSINESS · JEWELER · LAW FIRM · MANUFACTURER ·
  MEDICAL PROFESSION · NYC AGENCY · NYS AGENCY · OTHER · PAWNBROKER BUSINESS ·
  PEACE OFFICER · PHARMACY · PLUMBING BUSINESS · PRIVATE INVESTIGATOR ·
  REAL ESTATE BUSINESS · RELIGIOUS INSTITUTE · RESTAURANT BUSINESS ·
  RET COURT CLERK/COURT OFFICER · RETAIL FOOD SERVICE · RETAIL HARDWARE ·
  TAXI-LIVERY SERVICE · VENDING MACHINE · WATCH GUARD & PATROL AGENCY ·
  WHOLESALE FOOD SERVICE
Job Title
Building Number · Street Name · Apt/Unit/Suite · City · State (SELECT) · Zip Code
Business Phone
Business Precinct — READ-ONLY, portal-computed. Do not collect.
Employed — Yes / No
```

`employer.type` becomes this closed list.

## Step 4 — Employment history (5 years)

```
Repeating table. Columns:  Business Name · Job Title · Start Date · End Date
NO address in the history rows.
```

## Step 5 — Other licenses

```
"Do you have any handgun or rifle shotgun licenses or permits issued by NYC and/or
 any other licensing authority?"  Yes / No
→ table: License/Permit Number · Issuing Agency or Authority ·
         State and County of Issuance · Date Issued · Expiration Date
```

## Step 6 — Existing guns

```
"Do you currently own any handguns or rifle/shotguns?"  Yes / No
→ table: Make · Model · Caliber · Serial Number
```

## Step 7 — Safekeeping and safeguard

```
"How and where will your handgun or rifle/shotgun be secured when not in use?"
→ plus a full address block for where it is secured.

SAFEGUARD PERSON — show the portal's own instruction verbatim:
  "Identify an individual (not yourself) to safeguard and turn in your firearms in
   case you become incapacitated or in the event of your death. YOU WILL BE REQUIRED
   TO SUBMIT A PHOTOGRAPH OF THEIR GOVERMENT ISSUED IDENTIFICATION."
  · Must be at least 21 years old.
  · Ideally from New York State.
  · Must be aware of where you store your firearm(s) and assist the License Division
    in securing the firearm(s) in the event of your incapacity or death.

  First Name · Last Name · Relationship to Safeguard · Email Address · Phone Number
  + Building Number · Street Name · Apt/Unit/Suite · City · State (SELECT, all 50
    + DC) · Zip Code
```

```
CORRECTION — NY RESIDENCY IS NOT A HARD RULE.
The paper form said "must be a N.Y. State resident". The live portal says "Ideally
from New York State" and offers every state. Make it a WARNING, never a blocker.
AGE 21 IS the hard rule — validate that.
Capture the safeguard's DOB or an explicit 21+ confirmation; we cannot validate
today because we hold neither.
```

---

# PART 3 — Steps 8–10: the questions, verbatim

Fifteen numbered questions plus two conditional ones. **Yes/No each, with an
explanation field revealed on "Yes".** Do not paraphrase.

```
1.  Have you ever used any variation in the spelling of your name, or have you ever
    used any other name (an alias)?
2.  Have you ever been discharged, fired, or terminated from any employment?
3.  Have you ever been denied appointment to a position in a civil service system,
    federal, state or local?
4.  Have you ever been rejected for military service?
5.  Have you ever served in the armed forces of this or any other country?
6.  If you answered "Yes" to Question Number 5, were you dishonorably discharged?
7.  Have you ever been arrested, indicted, or received a criminal court summons or
    any other summons, for ANY offense other than a parking violation, in ANY
    jurisdiction - federal, state, local, or foreign?
    NOTE, verbatim, always displayed:
      "You must answer 'Yes' to this question even if the arrest or summons was
       dismissed, sealed, voided, or nullified by operation of law. The New York
       State Division of Criminal Justice Services will report to us every instance
       involving the arrest of an applicant. DO NOT rely on anyone's representation
       that you need not list a previous arrest or summons because it was dismissed,
       sealed, voided, or nullified by operation of law. If you were ever convicted
       of, or pleaded guilty to, a felony, or a serious offense as defined in Penal
       Law Section 265.00(17), an original Certificate of Relief from Disabilities
       must be submitted."
8.  Have you ever used narcotics, controlled substances, or tranquilizers?
9.  Have you ever used illegal drugs?
10. Have you ever been addicted to any drug, narcotic, or other substance?
11. Have you ever been diagnosed with mental illness, or due to mental illness
    received treatment, been admitted to a hospital or institution, or taken
    medication?
12. Have you ever had any disability, condition, illness, or impairment that may
    interfere with your ability to safely possess or use a firearm? Note, you must
    list any such disability, condition, illness, or impairment, including, but not
    limited to, epilepsy, diabetes, fainting spells, blackouts, temporary loss of
    memory or any nervous disorder.
13. Have you ever had, or do you now have, an Order of Protection issued against you?
14. Have you ever been the protected person on an Order of Protection?
15. Have you ever been involved in a domestic incident which was reported to police?

[LAW ENFORCEMENT APPLICANTS ONLY]
    Have your Firearm(s) ever been removed from you or surrendered for any reason
    throughout your career as a law enforcement?
```

```
TRAPS
· DRUGS ARE THREE QUESTIONS (8, 9, 10). Not one.
· Q11 is "diagnosed with", NOT "suffered from". Narrower, and it is the sworn wording.
· Q14 is the PROTECTED PERSON direction. Our old Q25/Q26 asked about orders issued
  BY the applicant. Different question — flag every existing answer for re-asking,
  migrate none.
· Q6 is conditional on Q5. When Q5 is No, Q6 is NOT ASKED — never record it as "No".
· GONE from the portal: the subpoena question, the other-agency-licence question,
  and both corporate-licence questions (old Q20 / Q20a). Delete that machinery.
· Q7 = Yes with a felony or serious-offense conviction CREATES the Certificate of
  Relief from Disabilities requirement — original, signed.
· An unanswered question is NEVER recorded or rendered as "No". This rule already
  holds in the codebase; do not regress it.
```

---

# PART 4 — Step 11: confidentiality, filled INLINE

**CORRECTION.** This is not an upload. The portal says: *"The form is included here
on this page — see immediately below. You just need to fill out the form here and
click 'submit'."* Delete `public-records-exemption.pdf` and any upload requirement
for it; collect the answers as data instead.

```
Grounds (check all that apply):
 1. My life or safety may be endangered by disclosure because:
      A. active or retired police, peace, probation, parole or corrections officer
      B. protected person under a currently valid order of protection
      C. is or was a witness in a criminal proceeding involving a criminal charge
      D. is or was a juror or grand juror in a criminal proceeding
 2. My life or safety, or that of my spouse, domestic partner or household member,
    may be endangered for some other reason  → MUST be explained in item 5
 3. I am a spouse, domestic partner or household member of a person in 1A–D
      → its own A / B / C / D checkboxes
 4. I have reason to believe I may be subject to unwarranted harassment on disclosure
 5. Additional supportive information (free text)

Then exactly one of:
 (A) apply this request to all my NYC handgun license applications and licenses
 (B) I am not submitting a request, and withdraw any previous requests
```

Client-facing context worth saying plainly: **names, zip codes and licence type are
public record by default** and are released to newspapers on request unless this is
granted.

---

# PART 5 — Step 12: Letter of Necessity, gated by licence type

**CORRECTION.** Not six statements for everyone. Five statements, each scoped:

```
Carry Guard/Security ONLY
  · handgun may only be carried during the course of and strictly in connection with
    the applicant's job, business or occupational requirements
ALL applicants
  · the manner in which the handgun will be secured when not being used
Concealed Carry, Special Carry, Carry Guard/Security
  · the applicant has been trained or will receive training in the use and safety of
    a handgun
Carry Guard/Security ONLY
  · the employer, or if self-employed the applicant, is aware of the responsibility
    to properly dispose of the handgun and return the license to the License Division
    on termination of employment or cessation of business
ALL applicants
  · has read and is familiar with Penal Law Articles 35 (use of deadly force),
    265 (criminal possession and use of a firearm) and 400 (responsibilities of a
    handgun licensee)
```

**A Concealed Carry applicant answers THREE, not six.** Gate them. A sixth field,
"Need/Employment Details", appears only on the business-related tracks.

---

# PART 6 — Step 13: uploads

Uploads happen **inside** the application flow, before finalizing. (Further
documents can be added after submission, which is what the instructions page
describes.)

```
REQUIRED (*)
 * Recent Photograph
     "A recent color passport-type photograph, front view. Do not wear any article
      of clothing or adornment that obscures your facial feature (hats, headgear and
      glasses of all kinds must be removed except for religious purposes).
      Absolutely NO 'Selfies' will be accepted."
     · same requirements as a U.S. Passport Book, taken within the last 30 days
     · head not tilted · eye line ~55% above the bottom · head width ~70% of frame
     · well lighted
     · IMAGE FORMATS ONLY: tif, jpg, jpeg, gif, png, bmp — a PDF is REJECTED
     · THE PORTAL AUTO-VALIDATES IT and reports Pass/Fail. Validate on our side
       first — a fail here stalls the filing.
 * Identity Verification — government issued ID (Driver's License, State ID)
 * Proof of date of birth — Birth Certificate, Military Record, Passport
 * Proof of Residence — Utility Bill, Real Estate Tax Bill, Ownership in co-op
     condo, Lease, Maintenance Bill
     → RELAX our rule. We restrict utilities to four types and require a tax return
       alongside a lease. The portal does not. Match the portal.
 * Safeguard's Government Issued Photo ID / All Firearm Licenses
     → NEW. Their photo ID; if the applicant holds a firearm licence, front AND back.
 * Affidavit of Co-habitant — NOTARIZED. We generate it; applicant notarises and
     uploads. KEEP our generator.

NOT REQUIRED AT THIS STAGE
   Training Certificate/Documentation — 18-hour DCJS course, P.L. 400.00(19)
     → not starred. It can follow. Keep the six-month expiry tracking.
   Additional Documents

FILE RULES — enforce at upload so nothing bounces at submission
   ≤ 5 MB · pdf, tif, jpg, jpeg, gif, png, bmp (Photograph: images only)
   Filename must contain no accents, tildes or symbols (è, é, ñ, &, *, #).
   Sanitise and tell the applicant we renamed it.

The portal's own document labels, which our destinations should mirror:
   Photo ID · Residence Proof · DOB Proof · Training Documents · Cohabitant ·
   Safeguard · Photograph
```

## Held for the interview / our file — NOT portal uploads

Keep collecting all of these; label them so nobody uploads them by mistake.

```
· Character reference letters — KEEP, with the existing composition rules.
· Social Security card · Proof of citizenship · DMV Lifetime Abstract ·
  NYS Income Tax Return · Affirmation of Understanding · Safeguard Acknowledgement
· Affidavit of Familiarity (38 RCNY 5-33) — its substance is AFFIRMED INLINE at
  step 16. Hold it for the interview; it is not a portal upload.
· NOTARIZED RELEASE(S) — step 16 affirms the applicant "will provide signed and
  notarized Release(s)" authorizing the License Division to obtain any relevant
  information. Sample in the portal's Forms section. This is what forms-auth-rel.pdf
  is for. Make it a tracked, notarised requirement.
· Certificate of Relief from Disabilities — conditional on a felony / serious-offense
  conviction per Q7. ORIGINAL, signed.

Add a `destination` field to every requirement: portal_upload | interview | internal.
Group the checklist by it. The applicant must bring ORIGINALS of everything uploaded
to the fingerprint appointment — say so.
```

---

# PART 7 — Step 14: counsel and preparer

```
"Are you being represented by counsel?"  Yes / No
  → First Name · Last Name · Name of Firm · Email Address · Phone Number
"Did anyone assist you in preparing the application?"  Yes / No
  → First Name · Last name · Organization Name · Email Address · Phone Number
```

**The preparer block is us, and it is not optional.** Default it to Gun License NYC
with our contact details, pre-filled on the worksheet, and make it a checked item on
the staff checklist. **Never** populate the counsel block with our details.

---

# PART 8 — Step 16: the affirmations, and what the applicant must sign

Staff will tick these on the applicant's behalf. **The applicant must therefore have
made them to us first.** All four go verbatim into the signed document.

```
1. "The undersigned affirms and acknowledges that he/she has knowledge of and shall
    be responsible for compliance with all laws, rules, regulations, standards and
    procedures, promulgated by federal, state, or local jurisdictions, and by
    federal, state, or local law enforcement agencies that are applicable to this
    license."
2. "The undersigned affirms that the statements made and answers given herein are
    accurate and complete, and hereby authorizes the New York City Police
    Department, License Division to make appropriate inquiries in connection with
    processing this application. False written statements in this document are
    punishable under Section 210.45 of the New York Penal Law…"
3. "The undersigned affirms that he/she will provide signed and notarized Release(s)
    authorizing the License Division to obtain any and all information that the
    License Division deems relevant to its review of his/her application…"
4. The state-mandated warnings, in full: the firearm-in-home risk warning and the
    responsible-storage warning under P.L. 400.00(18)(b).
    The portal notes this warning "must be printed and saved" — generate it as a
    document the applicant keeps.

POST-SUBMISSION DUTIES — surface as standing obligations with a reminder cadence.
While the application is pending, report IMMEDIATELY to the License Division, New
Applicant Section, (646) 610-5551 / DG_LIC-HandgunIntake@NYPD.ORG:
  1. Arrest, indictment or conviction in any jurisdiction; summons other than a
     traffic infraction; suspension or ineligibility order under CPL §530.14 or
     Family Court Act §842-a
  2. Change of business or residence address
  3. Change of business, occupation or employment
  4. Any change in the circumstances cited in the application
  5. Receipt of psychiatric treatment or treatment for alcoholism or drug abuse, or
     any disability or condition affecting the ability to safely possess a handgun
  6. Becoming the subject or recipient of an Order of Protection, Temporary Order of
     Protection, or an Extreme Risk ("Red Flag") Protection Order
```

## The signed answers + authorization document

```
CONTENTS
 1. Applicant identity as entered.
 2. EVERY question 1–15 (+ the LEO question where applicable) in the portal's
    verbatim wording, with the answer and, for each Yes, the explanation as written.
    Questions not asked (Q6 when Q5 is No) show "not applicable" — never "No".
 3. The application data: addresses, both histories, other licences, existing guns,
    safekeeping, safeguard person, letter-of-necessity statements, confidentiality
    election.
 4. THE FOUR AFFIRMATIONS ABOVE, verbatim, affirmed by the applicant.
 5. AUTHORIZATION: the applicant confirms these answers are theirs, that they have
    reviewed them for accuracy, and that they authorize Gun License NYC to enter
    them on their behalf into the NYPD online licensing portal and to be identified
    there as the person who assisted in preparing the application.
 6. Signature + date, via the existing signaturePng / signedAt mechanism.

RULES
· Unsigned renders as DRAFT with the banner.
· NOT notarised — it is our record, not a government form.
· Regenerates when an answer changes; a change after signing marks the signed copy
  STALE and requires re-signature. Never silently rewrite.
· Replaces the old internal "disclosure summary". One document, not two.
```

---

# PART 9 — Step 17: payment, and what it means for us

```
Two options: City Pay (online) or In-Person Payment.
· City Pay → NYC Department of Finance (a836-citypay.nyc.gov).
  $340.00 Handgun License Application Fee.
  Credit/debit carries a 2.00% nonrefundable service fee. eCheck has no fee but
  takes about a week to process.
· The APPLICATION NUMBER is issued by confirmation e-mail AFTER payment clears.
  Our cases.nypd_app_ref cannot exist before that — model it as post-payment.
· The $88.25 fingerprint fee is separate and paid at the appointment.
· "After clicking 'Finalize and Pay', you will not be allowed to make any further
  changes to your application."
```

Split readiness into two gates: **ready to enter** (all data + affirmations signed)
and **ready to finalize** (uploads accepted, photo passed). Finalize-and-Pay is
irreversible; the staff checklist must treat it as such.

---

# PART 10 — The staff portal-entry worksheet

Staff-only. The applicant never gets a copy formatted for entry.

```
· In THE PORTAL'S STEP ORDER, 1 through 17, with its section headings.
· Every value in the PORTAL'S FORMAT: 8/23/2002 · 5'05" · 130.00 · split address
  parts on their own lines · closed-list values spelled exactly as the portal spells
  them.
· Copy-to-clipboard per field.
· Missing values flagged in red, never printed as a blank line.
· The preparer block pre-filled.
· Marked as an internal work product on every page.
```

---

# PART 11 — Corrections to existing copy and rules

```
1. TRAINING IS 18 HOURS (16 classroom + 2 live-fire), P.L. 400.00(19). Our copy says
   "16-hour" in several places.
2. SAFEGUARD: 21+ is a hard rule; New York residency is "ideally", a warning only.
3. PROOF OF RESIDENCE: relax to the portal's list.
4. PRECINCTS: delete everything. Portal-computed, read-only.
5. SSN: last four digits only.
6. Place of birth and alien registration number: no portal home. Interview only.
7. The Certificate of Relief becomes a real conditional requirement.
8. The notarized Release becomes a real requirement (forms-auth-rel.pdf).
```

---

# VERIFY

```
 1. No PD 643-041, addendum, letter-of-necessity or public-records-exemption artifact
    is produced anywhere; the build is clean; no precinct logic remains.
 2. All fifteen questions render verbatim, with Q11 as "diagnosed with" and Q3 as
    "Have you ever been denied". Q6 hides unless Q5 is Yes. The LEO question shows
    only for a LEO applicant.
 3. Q8, Q9 and Q10 are three separate answers.
 4. Existing Q25/Q26 answers are flagged for re-asking, not migrated into Q14.
 5. An unanswered question is never recorded or rendered as "No".
 6. Q7 = Yes with a felony/serious-offense conviction spawns the Certificate of
    Relief; a dismissed arrest alone does not.
 7. Height, Gender, Hair Color, Eye Color, Industry and State render as selects with
    the exact portal values.
 8. A Concealed Carry applicant is asked THREE letter-of-necessity statements.
 9. The safeguard requirement blocks under-21 and only WARNS on out-of-state.
10. Upload rejects >5MB, rejects a PDF for the Photograph, and sanitises a filename
    containing é or #.
11. Every requirement declares a destination; reference letters read as "interview".
12. The signed document carries all four affirmations verbatim, every question with
    its answer, and "not applicable" for questions not asked.
13. Changing an answer after signing marks the signed copy stale.
14. Readiness splits into ready-to-enter and ready-to-finalize.
15. A complete case produces a worksheet with NO blank required field. This is the
    real test of the rebuild.
```

# DO NOT

- Do not paraphrase any question or affirmation. They are sworn.
- Do not map old Q25/Q26 onto Q14 — opposite direction.
- Do not record an unasked question as answered.
- Do not block a non-New-York safeguard; warn only.
- Do not upload anything the portal did not ask for.
- Do not fill the counsel block with our details. We are the preparer.
- Do not store a full SSN.
