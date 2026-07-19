# Registry coverage vs. the NYPD official checklist

**Source:** NYPD License Division, *Handgun License Required Documents Checklist*
(`licensing.nypdonline.org/app-instruction/requireddocs`, retrieved 18 July 2026).
Every row below is checked against that document, not against memory. Where the
official wording matters, it's quoted.

**Nothing here has been applied.** Each gap carries a proposed dated migration,
but a new blocking requirement lands on **every live case immediately** — including
your own test account — so these are for you to approve first.

---

## For ALL license & permit types

| # | Official requirement | Our code | Status |
|---|---|---|---|
| 1 | Valid State or Federal Photo Identification | `IDN-01` | ✅ |
| 2 | Proof of Date of Birth (birth cert / U.S. passport / U.S. military record) | `IDN-02` | ✅ |
| 3 | **Social Security Card** | — | ❌ **GAP** |
| 4 | Proof of citizenship or legal U.S. residence | `IDN-03` | ✅ |
| 4a | └ if resident < 7 years: "Certificate of good conduct, or equivalent thereof, **from your country of origin (consulate)**" | `GMC-01` | ⚠️ **WRONG DOCUMENT** |
| 5 | Proof of residence (utility bill — electric, landline, cable/internet, gas; or lease **and** filed NYS tax return) | `RES-01` | ✅ |
| 6 | DMV Lifetime Abstract | `DMV-01` | ✅ |
| 7 | Affidavit of Co-Habitant (notarized), one per person 18+ | `COH-01` | ✅ |
| 8 | **Acknowledgment of Person Agreeing to Safeguard Firearms Form** — completed by the safeguard — **and a copy of their** State/Federal photo ID | — | ❌ **GAP** |
| 9 | Affirmation of Understanding of NYS P.L. Articles 35, 265, 400 | `AFF-01` | ✅ |
| 10 | Two (2) notarized character reference letters | `REF-01` / `REF-02` | ✅ |
| 11 | Proof of Name Change (if applicable) | `NAM-01` | ✅ |
| 12 | All other currently held firearms licenses (NYC/NYS, other states, HR 218 card) | `OOS-02` | ⚠️ **WRONG TRACK** |
| 13 | Arrest info: Certificate of Disposition + detailed written statement | `ARR-01` | ✅ |
| 13a | └ **Certificate of Relief from Disabilities** (felony or serious offense per P.L. § 265.00(17)) | — | ❌ **GAP** |
| 14 | Domestic Incident Report statement | `DIR-01` | ✅ |
| 15 | Order of Protection: copy + detailed written statement | `OOP-01` | ✅ |
| 16 | Military discharge: DD-214 **and** discharge papers | `MIL-01` | ✅ |

## "Premise Business" licenses

| # | Official requirement | Our code | Status |
|---|---|---|---|
| 17 | NYS Filing Receipt | `PRM-01` | ⚠️ bundled |
| 18 | Certificate of Incorporation / business certificate / partnership agreement | `PRM-01` | ⚠️ bundled |
| 19 | All applicable business licenses, permits, certificates, registrations | `PRM-01` | ⚠️ bundled |
| 20 | Proof of Business (choose 2 of: bank statement, filed corporate tax return, current lease, utility bill) | `PRM-01` | ⚠️ bundled |
| 21 | **Photographs of Business** (name and address clearly displayed) | — | ❌ **GAP** |
| 22 | Photographs of Safe — two colour photos, door open and closed, whole safe, **no stock images** | `SAF-01` | ✅ |

## "Concealed Carry" / "Special Carry"

| # | Official requirement | Our code | Status |
|---|---|---|---|
| 23 | DCJS-approved 16-hr training course | `TRN-01` | ✅ |
| 24 | Two (2) **additional** notarized character references | `REF-01` (4 total) | ✅ |
| 25 | List of current & former social media accounts, last 3 years | `SOC-01` | ⚠️ **policy tension** |
| 26 | **Front and back of active New York State county license** | `SPC-01` | ⚠️ advisory only |

## "Carry Guard" licenses

| # | Official requirement | Our code | Status |
|---|---|---|---|
| 27 | 47-hr state-approved firearms course | — | ❌ **track not built** |
| 28 | 20-hour Worksheet | — | ❌ |
| 29 | Letter of Necessity from employer | — | ❌ |
| 30 | Child Support Certification Form | — | ❌ |

---

## The findings that matter, in order

### 1. `GMC-01` is the wrong document (⚠️ correctness, not just coverage)

Our registry has `GMC-01` = "Certificate of Good Conduct", `document_type =
cert_good_conduct`, trigger `if_lpr_under_7yr`, on both the `nyc` and
`special_carry` profiles. The trigger is right; the **document is ambiguous**.

In New York, "Certificate of Good Conduct" is a term of art for a specific NYS
DOCCS document issued to someone with a conviction — which is why we classified
`GMC-01` `hidden` from trainers. But the checklist item this trigger fires on asks
for a certificate of good conduct **from the applicant's country of origin, via
that country's consulate**, for anyone resident under seven years. Different
government, different document, no conviction implied.

The registry row doesn't say which one it means. An applicant reading a bare
"Certificate of Good Conduct" will very reasonably go to DOCCS, get told they have
no record to certify, and lose weeks. The `hidden` classification is also wrong for
the consular version — it implies a criminal history to anyone watching who has it.

**Proposed:** close `GMC-01` and insert a dated replacement titled "Certificate of
Good Conduct from your country of origin", naming the consulate in the steps, and
reclassified `full` for trainers. Separately insert `REL-01` (NYS Certificate of
Relief from Disabilities, `if_arrest_hx`, `hidden`) to cover gap 13a — the
`cert_relief_disabilities` document type already exists in the enum with nothing
pointing at it.

*Verified against the DB, not assumed:* both `GMC-01` rows carry authority
`P.L. §400.00(1); 38 RCNY §5-03` and `document_type = cert_good_conduct`; no
requirement anywhere references `cert_relief_disabilities` or `safeguard_ack`.

### 2. `OOS-02` is scoped to the wrong track

"All other currently held firearms licenses" is listed under **For ALL License &
Permit Types**, but `OOS-02` was seeded for `special_carry` only. An NYC resident
holding an out-of-state permit is never asked — and non-disclosure of another
licence is exactly the kind of omission that damages an application.

**Proposed:** insert a dated `OOS-02` row for the `nyc` jurisdiction, `always`.

### 3. The safeguard's form is missing entirely

The checklist wants a form completed **by the person agreeing to safeguard the
firearms**, plus a copy of *their* photo ID. We collect the applicant's storage
plan and safe photos (`SAF-01`) but never that person's acknowledgment. The
`safeguard_ack` document type already exists in the enum, unused.

Worth noting: this is a **third-party document**, like the cohabitant affidavit —
so if added it should be classified `progress` for trainers, not `full`.

### 4. Social Security Card

Listed as mandatory for all types; we don't ask for it at all.

### 5. `SOC-01` — a genuine policy tension, not an oversight

NYPD's checklist still requires the three-year social-media list. Our registry
marks `SOC-01` non-blocking and the UI calls it optional, citing the *Antonyuk*
injunction. That's a defensible legal position, but it means **we tell applicants
something different from what NYPD's own document says**, which is worth being
deliberate about rather than discovering later. Recommend attorney sign-off in
`/admin/legal` on this specific divergence.

### 6. `SPC-01` collects nothing

Special Carry requires the **front and back of the active NYS county license** —
an actual document. `SPC-01` is a non-blocking advisory with no `document_type`,
so nothing is ever collected.

### 7. `PRM-01` bundles four separate official items — and disagrees with itself

One requirement covers the filing receipt, incorporation papers, business licences
and two proofs of business. Splitting them is arguably better UX; at minimum the
help text should enumerate all four. Separately, the registry row has
`document_type = null` while `lib/requirements/actions.ts` declares
`business_documentation` — a live mismatch to reconcile either way.

### 8. Carry Guard is an entire unbuilt track

Four requirements and a 47-hour course. Out of scope for the current product, but
it should be a deliberate exclusion rather than an unnoticed gap — the marketing
site shouldn't imply we handle it.

---

## What I'd do

Ship 1–4 as one dated migration (they're straightforward corrections and
additions). Take 5 to the attorney seam. Treat 6–7 as product decisions. Leave 8
until Carry Guard is a market you want.

Every addition flows through the existing generate/obtain/attest/roster engine
and the trainer review flow automatically — a new `obtain` row needs a
`documentType`, steps and an official source, and the compiler enforces that.
