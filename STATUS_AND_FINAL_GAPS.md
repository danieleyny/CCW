# Where the system stands, and the eight things still between us and a fileable case

Repo at `febac53`. **372 tests pass**, 184 skipped (the DB suites need live Supabase).
I built a complete concealed-carry applicant — every fact, both histories, a firearm,
the safeguard, all fifteen disclosures — and rendered the staff portal worksheet.

```
87 of 89 worksheet fields populated.
```

That number flatters us slightly: two fields flagged themselves missing, and six more
render a value that is wrong or incomplete. But the shape of the thing is right, and
that is the important part.

---

## What is genuinely done

```
✓ Identity, contact, address     every field, in the portal's format
✓ Dates                          4/12/1990 · 1/3/2022 — M/D/YYYY, not zero-padded
✓ Height / weight                5'10" · 185.00
✓ SSN                            last four only
✓ Address splits                 building number / street name, with a confirm flag
✓ Industry                       the portal's closed 41-value list
✓ Employment                     employed flag, start date, unit/suite, full address
✓ Employment history             Business Name · Job Title · Start · End — right columns
✓ Existing guns                  yes/no + Make · Model · Caliber · Serial
✓ Other licences                 yes/no + the five-column table
✓ All 16 disclosure questions     verbatim, with the LEO one correctly showing N/A
✓ Counsel + preparer             preparer prefilled with Gun License NYC
✓ Photograph deduped             IDN-04 gone, PHO-01 survives
✓ Requirements                   PHO-01 · SGI-01 · REL-01 · COR-01 · CON-01 · LON-01
                                 · AFF-02 all exist
```

The disclosure set, the field formats and the document registry are in good shape.
**Everything below is the last mile — mostly the two history tables and the safeguard
block, which are the two places we never finished reshaping.**

---

# THE EIGHT

## 1. Both history tables still render ISO months — BLOCKER

```
Residence  Row 1 — From:  "2021-03"      should be  3/1/2021
Employment History 1 — Start: "2022-01"  should be  1/1/2022
```

`portalDate()` only matches `YYYY-MM-DD`. The rows store `fromMonth`/`toMonth` as
`YYYY-MM`, so the regex misses and the raw ISO string passes straight through onto a
field the portal wants as M/D/YYYY. Staff would retype it by hand every time, or
worse, paste it.

```
Change AddressHistoryEntry and EmploymentHistoryEntry to fromDate / toDate, full ISO
dates. Migrate existing YYYY-MM values to the 1st of that month and FLAG the row so
the applicant corrects the day — a guessed day on a sworn history is not something to
accept silently.
```

## 2. Residence history is missing four of its eight columns — BLOCKER

The worksheet renders **From · To · Building · Street**. The portal's table is
**From · To · Building Number · Street Name · Apt/Unit/Suite · City · State · Zip**.

`AddressHistoryEntry` has no city, state, zip or apt fields at all — just one
`address` string with building/street parsed out of the front. Staff cannot fill the
table from this.

```
Give the entry real fields: apt · city · state · zip. Parse from the legacy string
where possible, flag for confirmation, and render all eight columns.
```

## 3. The safeguard's address split is broken — BLOCKER

```
Safeguard Address — Street Name: "Vanderbilt Ave, Brooklyn, NY 11205"
Safeguard Address — Apt/Unit:    ""
Safeguard Address — City:        ""
Safeguard Address — State:       ""
Safeguard Address — Zip:         ""
```

`safeguard.address` is one string with no city/state/zip facts behind it, so the
splitter dumps the entire remainder into Street Name and the other four render empty.
Same fix as #2 — real fields, not a parse of a blob.

## 4. The safeguard's email is not wired

`safeguard.email` exists in the fact registry, the applicant can enter it, and
`buildApplicationValues` never reads it — so the worksheet flags it missing even when
it is filled. The portal requires it. One line.

## 5. The safeguard's name is one field, the portal wants two

`Safeguard — First/Last Name: "Dana Reyes"`. The portal has separate First Name and
Last Name inputs. Split the fact.

## 6. The safekeeping LOCATION address is missing entirely

The portal asks *"How and where will your handgun or rifle/shotgun be secured when not
in use?"* **and then a full six-part address** for where it is secured. We hold only
the narrative (`safeguard.method`).

This is a distinct address — it is not the home address, and for a business licence it
often isn't. Six new facts, its own block on the details screen, its own worksheet
rows.

## 7. The Letter of Necessity is not gated by licence type

The worksheet renders six statements and flags Statement 1 as missing on a
**concealed carry** case — where it does not apply. The portal shows five statements,
scoped:

```
Carry Guard only          carried only in connection with the job
ALL                       how it will be secured when not in use
CC / Special / Guard      trained or will receive training
Carry Guard only          employer aware of disposal + licence return duties
ALL                       has read Penal Law Articles 35, 265, 400
```

A concealed-carry applicant answers **three**. We ask six and then flag one of the
irrelevant ones as an omission — which will send someone hunting for an answer that
does not exist.

## 8. The confidentiality election is missing from the worksheet

CON-01 exists as a requirement and step 11 of the portal is a full inline form —
grounds 1(A–D), 2, 3(A–D), 4, free-text 5, and the (A)/(B) election. **The worksheet
has no confidentiality section at all.** Staff reaches step 11 with nothing to type.

---

# ALSO WORTH FIXING, NOT BLOCKING

```
· Renewal: "License for Renewal" and "Application Number" don't render. Renewals only,
  and the application number doesn't exist until payment clears anyway.
· Business address has both an "Apt/Unit" row (blank) and a "Business Unit / Suite"
  row (filled) — two fields for one portal input. Collapse them.
```

---

# WHERE THAT LEAVES US

**The application data model is essentially complete.** Of ~89 portal fields, the
disclosures, identity, employment, firearms, licences and representation blocks are
all correct and correctly formatted. What is not finished is the **three repeating /
nested structures** — residence history, the safeguard block, and the safekeeping
location — plus two omissions (confidentiality on the worksheet, LON gating).

Every one of the eight is a data-shape fix in the same two files
(`lib/intake/answers.ts` for the entry types, `lib/disclosures/worksheet-portal.ts` for
the render) plus the fact registry. There is no architecture left to decide.

**After these eight, a complete case produces a worksheet a staffer can type into the
portal top to bottom without stopping.** That is the finish line, and it is close.

# ORDER

```
1. #1 and #2 together — the history reshape. One migration, both tables.
2. #3, #4, #5, #6 together — the safeguard + safekeeping block.
3. #7 — LON gating.
4. #8 — the confidentiality section.
5. The two non-blocking items.
```

# VERIFY

```
1. A residence row renders 3/1/2021 and all eight columns.
2. An employment history row renders 1/1/2022.
3. A migrated YYYY-MM row shows its day-of-month flagged for correction.
4. The safeguard address renders Building · Street · Apt · City · State · Zip, each
   from its own field, with nothing dumped into Street Name.
5. A filled safeguard email reaches the worksheet.
6. Safeguard first and last name are separate fields.
7. The safekeeping location renders its own six-part address, distinct from home.
8. A concealed-carry case shows THREE letter-of-necessity statements and flags none
   of the Carry Guard ones.
9. The worksheet has a Confidentiality section carrying the grounds, the free text
   and the (A)/(B) election.
10. Re-run the complete-applicant worksheet: every field populated, zero flagged
    missing except the deliberate at-filing blanks.
```
