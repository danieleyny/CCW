# NYPD form templates — extracted from the official packet

Source: `HandGunLicenseApplicationFormsComplete.pdf`, 17 pages, the NYPD License
Division's own combined packet. Each file below is a **page-range extract of that
original**, not a re-creation. The AcroForm field tree was pruned per file so each
template exposes only its own fields.

Extraction was done with `qpdf --pages`, which preserves the original page content
streams byte-for-byte. Nothing was redrawn, retyped or re-flowed.

---

## Files

| File | Pages | Fields | sha256 |
|---|---|---|---|
| `handgun-license-application-643-041.pdf` | 5 | 123 | `371a293013101e2bf315ba6c4c5cc5c937ef0de4e1269b06809d704f07e28c3f` |
| `application-addendum-643-041a.pdf` | 1 | 40 | `e844c9b05d0d154a30f8c32c02afac0ead479cbdf4e459cd916f481f5c5cf40b` |
| `letter-of-necessity.pdf` | 1 | 7 | `439aea3e7f252a477a832760d55f5efc93fde257b1ad8b68c22149f2f35624de` |
| `safeguard-acknowledgement.pdf` | 1 | 15 | `87952cc8096e588865c92b3a688e8ae52f4e1f952a424aba053c5969bd521ce3` |
| `affidavit-familiarity-5-33.pdf` | 1 | 4 | `b1d5b873e45ccd1d5877729baf775a2b4a9f82371b05412abde2d7883dc415be` |
| `public-records-exemption.pdf` | 1 | **0** | `26cc201d790d23401db1186b9be7fc8a24f1d5bf70babcd9af178075b57174d1` |
| `instructions-643-115.pdf` | 1 | 0 | `d9b814f03f3cf28e8bae8fc2190e47f83ccd0e219be06e137da4f4a0e2e1799d` |

`letter-of-necessity.pdf` is page 4-of-5 of the application, extracted standalone.
Its seven fields also exist inside `handgun-license-application-643-041.pdf` under
identical names — fill it in whichever context you need, but do not fill both and
submit both.

---

## READ THIS BEFORE WIRING ANY FILL

**Always call `form.updateFieldAppearances(font)` with an explicitly embedded
font.** Verified: pdf-lib fills and renders all five fillable templates correctly
when a `StandardFonts.Helvetica` is embedded and passed in. Without it, several
widgets carry a field-level `/DA` naming a font that is not in the document's
resource dictionary, and the text is stored in `/V` but renders **blank** in
Preview, Acrobat and pdftoppm. That failure mode is invisible to any test that
only asserts on field values — it looks filled and prints empty.

Do not set `NeedAppearances` and rely on the viewer. Generate the appearances.

Every fill must be verified by rasterising the output and looking at it, not by
reading back `/V`. This is the same class of defect as the child-support date bug.

---

## Field maps

### `handgun-license-application-643-041.pdf`

Checkboxes — export values are `/Yes` and `/No`, off is `/Off`:

```
SectionB10 SectionB11 SectionB12 SectionB13 SectionB14 SectionB15 SectionB16
SectionB17 SectionB18 SectionB19 SectionB20 SectionB20a SectionB21 SectionB22
SectionB23 SectionB24 SectionB25 SectionB26 SectionB27 SectionB28
```

That is all twenty Section B questions, and they map 1:1 onto the questionnaire in
Part C of the compliance prompt. Q24, Q25 and Q26 are three separate widgets on the
form itself — further confirmation they must not be collapsed.

Other checkbox groups:

```
LicenseType          /CarryBusiness /CarryGuardSecurity /SpecialCarry /LimitedCarry
                     /RetiredPoliceOfficer /GunCustodian /Premises
LicenseTypePremises  /Residence /Business
AlienOrCitizen       /Citizen /Alien
```

Identity and contact:

```
1_LastName · 1_FirstName · 1_MI · Maiden NameAlias
2 Legal Address Street No · Apt · City or Town · State · Zip Code · Res Pct
Alien Registration Number · Social Security Number
Home Phone No · Cell Phone No · Email Address
4 Place of Birth  City State Country · Age · Date of Birth
Hgt inches · Wgt · Sex · Color of Hair · Color of Eyes
```

Business:

```
5 Name of Business · Type of Business · Bus Pct
6 Business Address Street No · City or Town_2 · State_2 · Zip Code_2
7 Bus Telephone NoDay
Occupation Owner  Employee  Gun Custodian
```

Existing licences and handguns:

```
LicenseNumber_renewal_applicant · DoYouPosessAnyOtherNYC_handgunLic
OtherNYC_handgunLicType · OtherNYC_handgunLicNo
HowManyOtherPersonsHaveNYC_handgunLice
VALIDATION OF OUT OF CITY LICENSE Special Handgun License ONLY
9 Basic License Number · Issued By · County · Date Issued · Expiration Date
handgun_{1,2}_{make,model,serial,caliber,type,owner}
```

Q29 histories — **four rows each, and row 1 has no "To" field** because the form
pre-prints PRESENT there:

```
ResidenceFrom{1..4} · ResidenceTo{2,3,4} · ResidenceAddress{1..4} · ResidencePrecinct{1..4}
EmploymentFrom{1..4} · EmploymentTo{2,3,4} · EmploymentAddress{1..4}
EmploymentOccupation{1..4} · EmploymentPrecinct{1..4}
```

Four rows is a hard ceiling on the form. If an applicant's five-year history needs
more, the overflow goes on a continuation sheet — do not silently truncate to four.
Detect it and say so.

Q30 / Q31 safeguarding:

```
30_How_will_guns_be_Safeguarded
30_Who_will_guns_be_Safeguarded_by
30_b_Who_will_guns_be_Safeguarded_by
AffirmedSignatureDate
```

**Note the form has no text fields for the sub-details** the questions ask for —
Q12's doctor, Q21's doctor or institution, Q22's doctor, Q23's charge and
disposition, Q24–26's court and complainant. Those all go on the addendum. Collect
them structurally in the questionnaire, then route them to `643-041A`.

### `application-addendum-643-041a.pdf`

```
q1 … q19        question number for each row
q1exp … q19exp  detailed explanation for each row
Date · Signature
```

**Nineteen rows, and they are row slots, not question numbers.** Write the NYPD
question number into `qNexp`'s paired `qN`. The form's own text says "This form may
be reproduced if necessary" — if a case has more than 19 "yes" explanations, emit a
second copy rather than dropping any. Generate this file **only when at least one
answer is yes**.

### `letter-of-necessity.pdf`

```
LetterOfNecessity1 … LetterOfNecessity6   the six numbered statements, in order
LetterOfNecessitySignatureDate
```

Box 1 is by far the largest — it is the "why does this employment require carrying
a concealed handgun" narrative. Boxes 2–6 are two-to-three lines each.

### `safeguard-acknowledgement.pdf`

```
Name of Applicant  Licensee     (two spaces — the field name really is that)
Application  License Number     (two spaces)
Print Name · First · MI         (Print Name is the LAST name box)
Address · Apt · City · NY       (NY is the ZIP box; State is pre-printed on the form)
Telephone Numbers · Cell · Business    (Telephone Numbers is the HOME box)
name_of_person_agreeing_to_safeguard_fireams   (sic — typo is in the original)
Date · Witness name printed
```

Three field names are traps: `Print Name` is last name, `NY` is the zip code, and
`Telephone Numbers` is the home phone. Map them by position, not by name.

Both signatures — the safeguard's and the witness's — are ink. There is no widget
for either. **Witnessed, not notarised.**

### `affidavit-familiarity-5-33.pdf`

```
CountyOf · ThisDay · Month · YearDigit
```

`YearDigit` is the two digits after a pre-printed "200" on the form. The form is old
enough that it reads "200__". Fill `26` and it prints as 20026 — **this template
cannot express 2026 correctly.** See the gaps section.

Signature and notary block are ink. Notarised.

### `public-records-exemption.pdf` — FLAT, NO ACROFORM

This page has zero form fields. It must be filled by overlay at coordinates, or
printed and completed by hand. Page box is 612 × 792.

Content to place:

```
I am: [ ] applicant   [ ] currently licensed
Name · Date of Birth · Address · City · State
Firearms License # (if applicable) · Date Issued
Licensing Authority / County of Issuance or Application
Grounds:  [ ]1 with sub-boxes [ ]A [ ]B [ ]C [ ]D
          [ ]2  (must be explained in item 5)
          [ ]3  with A___ B___ C___ D___
          [ ]4
          5. three free-text lines
Signature · Date
```

Given it is opt-in and rare, hand-completion is an acceptable v1 — generate it
pre-filled where you can and mark the rest for the applicant. Do not fake an
AcroForm onto it.

---

# VERIFIED END-TO-END — and three more traps found doing it

Every fillable template below was filled with pdf-lib, saved, rasterised at 95dpi
and **looked at**. Findings:

## TRAP 1 — the Yes/No boxes are NOT radio groups. `check()` gets them wrong.

Each `SectionB*` question is **one checkbox field with two widgets**, whose on-values
are `/Yes` and `/No`. There is no radio flag on the field. Consequences:

```
form.getRadioGroup('SectionB10')  →  throws. It is a PDFCheckBox.
form.getCheckBox('SectionB10').check()  →  silently ticks /Yes, ALWAYS.
                                           You can never answer "No".
```

The same shape applies to `LicenseType` (7 widgets: `/CarryBusiness`
`/CarryGuardSecurity` `/SpecialCarry` `/LimitedCarry` `/RetiredPoliceOfficer`
`/GunCustodian` `/Premises`), `LicenseTypePremises` (`/Residence` `/Business`) and
`AlienOrCitizen` (`/Citizen` `/Alien`).

I confirmed the failure: a naive `check()` on `LicenseType` ticked **CARRY BUSINESS**
on a carry-guard application. It renders as a clean, plausible, wrong form.

Use this instead — verified to set all 20 questions and render correctly:

```js
import { PDFName } from 'pdf-lib'

/** Set a dual-widget NYPD checkbox. answer: 'Yes' | 'No' | an on-value name. */
function setNypdChoice(form, name, answer) {
  const af = form.getField(name).acroField
  const want = PDFName.of(answer)
  let matched = false
  for (const w of af.getWidgets()) {
    const on = w.getOnValue()
    const hit = on && on.asString() === want.asString()
    w.dict.set(PDFName.of('AS'), hit ? want : PDFName.of('Off'))
    if (hit) matched = true
  }
  if (!matched) throw new Error(`${name}: no widget with on-value /${answer}`)
  af.dict.set(PDFName.of('V'), want)
}
```

**Throw on no match.** Do not fall back to "first widget" — that is exactly how the
wrong licence type gets ticked. And never wrap this in a bare `catch {}`.

## TRAP 2 — text clips silently at the default font size.

`SECURITY GUARD` in `EmploymentOccupation1` rendered as `SECURITY G`. The Q31
answer rendered as `JANE A. DOE, 123 MAIN ST APT 4B, BROOKLYN NY 1`. No error, no
warning — the value is intact in `/V` and the visible form is truncated.

Call `field.setFontSize(n)` on the narrow fields before
`form.updateFieldAppearances(font)`. Verified: 6pt fits the occupation column, 7pt
fits the Q31 line. Better still, measure with `font.widthOfTextAtSize()` against the
widget `/Rect` and step the size down until it fits, then assert it did.

## TRAP 3 — Q31 is two fields, not one.

```
30_Who_will_guns_be_Safeguarded_by     line 1 — name, relation, address
30_b_Who_will_guns_be_Safeguarded_by   line 2 — telephone
```

Q31 asks for name, address, relation AND telephone. It does not fit on one line.
Split it deliberately across the two rather than overflowing the first.

## Also confirmed by rendering

- Row 1 of both Q29 tables has **PRESENT pre-printed** in the To column. There is no
  `ResidenceTo1` or `EmploymentTo1` field, and none is needed. Row 1 must be the
  current address / current job.
- The form's own Section B header reads "must answer questions 10 through 24" while
  its addendum instruction says "10 through 28". The questions run to 28. Follow 28.

---

# RETRACTED — the "duplicate template" was not a bug

I previously reported that `forms-auth-rel.pdf` and `form-req-app-emp-rec.pdf`
being byte-identical (`475aedf6…`) meant the wrong file had been saved. **That was
wrong.** Verified against the live NYPD site, 2026-08-27:

```
licensing.nypdonline.org/additional-forms lists these as two separate entries:
  "Authorization for Employment Release"          → /additional-forms/forms-auth-rel
  "Request for applicant's employment record"     → /additional-forms/form-req-app-emp-rec

Both slugs serve the SAME PDF, titled REQUEST FOR APPLICANT'S EMPLOYMENT RECORD.
```

The list-page label is NYPD's own mislabel. The identical hashes are faithful to
the source, not a mis-save.

And the label is not even really wrong: that one form **is** the authorization. It
carries the consent paragraph —

> "I hereby give my written consent and request and authorize you to turn over any
> and all employment records relating to my employment."

— over an Applicant's Signature line. One instrument, two names.

**Action: none.** `forms-auth-rel.pdf` is correct as it stands. Do not source a
separate authorization-for-release form; none exists. If a second template key is
ever wanted under the release-facing name, alias it to this same file rather than
treating them as two documents. `lib/forms/templates.ts` has been updated with this
finding in place of the old bug note.

The lesson for the rest of this folder: identical hashes across two filenames are
worth checking, but check them against what the issuer actually publishes before
calling them a defect.

---

# LEAD — a newer official packet exists

Our source packet is **PD 643-115 Rev. 05-12**. NYPD also publishes:

```
Rev. 02-15   .../permits/HandGunLicenseApplicationFormsComplete.pdf
Rev. 09-16   .../permits/HandGunLicenseApplicationFormsComplete_w_rev_09-16.pdf
```

Read against the 09-16 packet, two things are worth knowing:

1. It still contains **no** separate "Affirmation of Understanding of NYS Penal Law
   Article 35 / 265 / 400." The checklist names it; neither packet carries it. That
   requirement still needs its template sourced from the License Division directly.
2. Its Affidavit of Familiarity notary block may print a **blank year** rather than
   the `200__` that makes our copy render "200 26". **UNVERIFIED** — that came from
   text extraction of the remote PDF, not from rendering it, and a pre-printed "200"
   is exactly the kind of detail extraction drops. Download the 09-16 packet and
   render page by page before swapping anything.

Until then the guidance stands: leave `YearDigit` blank and let the notary date it.
