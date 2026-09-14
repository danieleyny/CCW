# CARRY GUARD ALIGNMENT — portal-verified corrections

**Source of truth for this prompt:** a live, signed-in walk of the NYPD portal's
Carry Guard path, steps 1–16, on 10 Sep 2026. Where this document and
`config/application-coverage.ts` disagree, this document wins — that file is built
from the *paper* form PD 643-041 and says so in its own header.

---

## The objective this serves

A guard lands on our site because getting an NYPD licence is confusing and slow.
Our job is to make it **the simplest possible path to a licence** — not to build the
most complete form. Every change below is judged against that.

So do not read this as "add the fields NYPD asks for." Read it as five rules:

1. **Ask the applicant only what only the applicant can answer.** A serial number
   needs the gun in his hands. A past employer's ZIP needs his memory. Those we ask.
2. **Derive anything derivable.** Precinct comes from a ZIP code. Never make someone
   look up a police precinct in an 81-option dropdown.
3. **Route third-party data to the third party.** The gun custodian belongs to the
   sponsor. The safeguard person's email and ID belong to the safeguard person. Do
   not ask the applicant to be a courier for other people's data.
4. **Defer what NYPD lets us defer.** The training certificate is *not* a required
   upload and step 12 accepts "will receive training" — so filing does not wait on
   training. Do not gate on it.
5. **Never render a field on a surface where it cannot be answered.** An unanswerable
   red-flagged box is worse than no box: it teaches staff to ignore red flags.

If any task below would make the applicant's path longer without one of those rules
justifying it, stop and flag it instead of building it.

---

## ALREADY DONE — do not redo these

Four tasks were applied directly before this prompt was handed over. `npx tsc --noEmit`
passes. The unit tests could **not** be run in that environment (the installed
`rolldown` native binding is macOS-only), so **run `pnpm test` first** and fix any
fallout before starting anything below.

| # | Change | Files |
|---|---|---|
| 1 | Gun custodian now emitted on portal worksheet **step 3**, required (red when empty), gated to guard tracks via a new `isGuardTrack()` helper. `custodianName` / `custodianLicenseNumber` added to `ApplicationValues`, resolved sponsor-first from the fact layer. | `lib/disclosures/worksheet-portal.ts`, `lib/forms/application.ts` |
| 2 | **Step 12 separated from the LON document.** New `portalStep12StatementsFor()` returns the portal's five (lop2–lop6); `lonStatementsFor()` is unchanged so lop1 is still collected for the § 5-04 letter. Worksheet step 12 now uses the new function. `REQUIRED_LON_STATEMENTS` deliberately untouched. | `lib/requirements/lon.ts`, `lib/disclosures/worksheet-portal.ts` |
| 6 | **NYS ID** added as an optional fact and emitted on worksheet step 1. **Alien Registration / Visa Number** now emitted on step 1 whenever citizenship resolves to non-citizen. | `lib/facts/registry.ts`, `lib/forms/application.ts`, `lib/disclosures/worksheet-portal.ts` |
| 10 | Safeguard **NY-residency** comment corrected — records both the step-7 "ideally" and the step-15 "must be a resident of New York State", states that we advise on the stricter reading, and carries an `OPEN:` marker. No hard block added. | `lib/facts/registry.ts` |

**Remaining work is Tasks 3, 4, 5, 7, 8 and 9 below.** Tasks 1, 2, 6 and 10 are kept in
place for context — read them, don't re-implement them.

---

## Task 1 — Emit the gun custodian on portal worksheet step 3  ✅ DONE

`lib/disclosures/worksheet-portal.ts`, `put(3, …)` renders the employment block only.
The two most Carry-Guard-specific **required** portal fields — the employer's gun
custodian name and licence number — are collected at sponsor provisioning
(`sponsor.custodianName`, `sponsor.custodianLicenseNumber`, both `required` on
`components/admin/provision-sponsor-form.tsx`) and resolved as facts, but never reach
the worksheet. Staff transcribing step 3 have nothing to copy.

- Add both to `put(3, …)`, after the business address block, matching the portal's
  own on-screen order and heading: *"Please provide your employer's Gun Custodian
  information"* → `Name`, `License Number`.
- They are **required** on the portal: emit them via `f(...)` with no `optional`, so
  an empty value flags red.
- Only for sponsored / carry-guard cases. On a case with no sponsor, use `na(...)`
  with a reason — never a blank required field.

## Task 2 — Separate the Letter of Necessity from portal step 12  ✅ DONE

The portal's step 12 shows **five** textareas for Carry Guard. Our
`lonStatementsFor("carry_guard")` returns **six**, because `lonCategoriesFor()` adds
`business`, which pulls in `lop1` ("the employment, and why it requires carrying a
concealed handgun").

**Do not delete `lop1`.** It is legitimately required — Pamela's sponsor checklist
collects exactly that narrative under 38 RCNY § 5-04, and the step-15 review page
carries a "Letter of neccessity" heading. `lop1` belongs to the **LON document**, not
to the step-12 portal textareas.

- Keep `lop1` in scope for **collection** (questionnaire + sponsor authoring + the
  LON PDF) exactly as it is today.
- Introduce a separate notion of which statements appear on **portal step 12**, and
  have `worksheet-portal.ts` `put(12, …)` use that. For `carry_guard` it is
  statements **2, 3, 4, 5, 6** — mapping to the portal's five in this order:
  1. carried only in the course of the job → `lop2`
  2. manner secured when not in use → `lop3`
  3. trained or will receive training → `lop4`
  4. employer aware of disposal / licence return on termination → `lop5`
  5. familiar with Penal Law Art. 35, 265, 400 → `lop6`
- Do **not** change `REQUIRED_LON_STATEMENTS` yet — that depends on the open
  question below.
- Add a comment recording that step 12 and the LON document are two surfaces drawing
  on one statement set, so the next reader doesn't "fix" it back.

## Task 3 — Firearms: the licensed flag and licence number  **[start here]**

`FirearmEntry` in `lib/intake/answers.ts` is `{make, model, caliber, serial}`. The
portal's modal is three levels deep: repeater → firearm → **"Is this firearm
licensed?"** (Yes/No, required) → conditional **License/Permit Number**.

- Add `licensed?: "Yes" | "No"` and `licenseNumber?: string` to `FirearmEntry`.
- Render `licenseNumber` only when `licensed === "Yes"` — a real conditional, not an
  always-visible optional.
- Emit both on `worksheet-portal.ts` `put(6, …)`.
- Note for a later pass, do not build now: the portal's **Make** is a constrained
  lookup against NYPD's manufacturer table, not free text. Add a `// TODO` where
  `make` is defined.

## Task 4 — Employment history needs a structured address

The portal requires **Building Number, Street Name, City/Town, State, Zip** for every
past employer. `EmploymentHistoryEntry` carries a single `employerAddress` line, and
`put(4, …)` emits only name / title / start / end.

- Extend `EmploymentHistoryEntry` with `city`, `state`, `zip` (and keep
  `employerAddress` as the street line, split at render via `splitStreet` exactly as
  the residence rows already do).
- Emit the full address on `put(4, …)` using the existing `addressFields` helper.
- Follow the pattern `AddressHistoryEntry` already set — do not invent a second shape.

## Task 5 — Country on residence history

The portal makes **Country required** on every residence row (it is *optional* on
employment rows — reproduce that asymmetry, don't normalise it away).

- Add `country?: string` to `AddressHistoryEntry`, defaulting to `United States`.
- Emit on `put(2, …)` as required.
- In the UI, show it only when the applicant indicates a non-US address, so the common
  case stays one click shorter. Rule 1: don't lengthen the path for everyone.

## Task 6 — Two step-1 fields that never reach the worksheet  ✅ DONE

- **Alien Registration / Visa number.** The fact exists
  (`applicant.alienRegistrationNumber`, correctly conditional on lawful permanent
  resident). `put(1, …)` emits the citizenship answer but not the number. Emit it
  whenever citizenship is not "U.S. citizen".
- **NYS ID.** The portal has a `NYS ID` text field on step 1. A grep for it returns
  nothing in `lib/` or `app/`. Add it as an **optional** fact in
  `lib/facts/registry.ts` (group `you`) and emit it on `put(1, …)` as optional.

## Task 7 — Precinct: derive, never ask  **[do last; separate PR]**

The portal wants a **Precinct** on step 1 (home) and a **Business Precinct** on step 3.
Neither exists anywhere in our codebase. NYPD gives a "Precinct Finder" lookup for the
*business* address but only a bare 81-option dropdown for the *home* address — the
harder case is the unassisted one.

- Build a ZIP → precinct lookup as a pure function with a static table, in the shape of
  the existing notary locator. **Do not add a question to intake.**
- Emit a derived value on `put(1, …)` and `put(3, …)`, labelled so staff can see it was
  derived and override it.
- The precinct string must match the portal's own format exactly: `Borough - 0XX PRECINCT`.

## Task 8 — Close the third-party loop

Two required things belong to people who are not our client:

- **Safeguard person's email** is required on portal step 7. The fact
  (`safeguard.email`) already exists — good. The gap is upstream: Chery's
  "What to gather" checklist asks for that person's name, address, relationship, phone
  and ID photo, but **not their email**. Fix the checklist copy.
- The safeguard person also owes a **photo of their government ID** (required upload
  slot 5). Migration `20260830000100_safeguard_invites.sql` exists — confirm the invite
  flow actually collects the ID photo and the email, and wire it if not. This is the
  same invite-and-chase pattern as character references; reuse it, don't rebuild it.

## Task 9 — Validate the histories we already collect

The portal requires From/To on residence rows but leaves them optional on employment
rows, and enforces no continuity anywhere. A gap in a sworn five-year history is what
generates a deficiency letter months later.

- Require start/end dates on **both** histories regardless of what the portal tolerates.
- Warn (do not block) on gaps and overlaps, and require the most recent row to run to
  present. Surface it as guidance to the applicant, in his words, not a validation error.

## Task 10 — Correct the safeguard residency comment  ✅ DONE

`lib/facts/registry.ts` currently records: *"21+ is the portal's HARD rule for the
safeguarding person (NY residency is only 'ideally')."*

The portal contradicts itself: step 7 says "ideally from New York State", the step-15
review page says "must be at least 21 years old **and a resident of New York State**".

- Update the comment to record **both** readings and that we advise on the stricter one.
- Do not add a hard block on non-NY yet — flag it for review instead. Chery's checklist
  already takes the strict line, which is the right client-facing position.

---

## Open questions — do NOT guess these in code

1. **Where does the LON live for Carry Guard** — step-12 textareas, or a separate
   document? Decides Task 2's `REQUIRED_LON_STATEMENTS` change.
2. **Safeguard NY residency** — "ideally" or "must"? Confirm with the License Division.
3. **Training** — upload slot 7 cites the **18-hour DCJS** course under PL 400.00(19).
   The NYS **armed guard** path has a separate **47-hour** course under DCJS security
   guard registration. An armed-guard applicant likely needs both; this is unverified.
   Do not put either claim in client-facing copy until DCJS confirms it.

Leave a `// OPEN:` comment at each site rather than picking an answer.

---

## Non-goals

- Do **not** gate filing on the training certificate. It is not a required upload and
  step 12 accepts "will receive training" — filing and training run in parallel.
- Do **not** add a full SSN anywhere. The portal wants last four; we store only that.
- Do **not** fork the schema per licence type. The portal is one 17-step engine with
  per-type show/hide, and `config/portal-steps.ts` already models it correctly.
- Do **not** add fields to the applicant's intake that a derivation or a third-party
  invite could supply.

## Verification

- `pnpm test` — extend `tests/form-fill.test.ts` and `tests/compliance-prd3.test.ts`
  to cover: custodian emitted on step 3; step 12 yields five statements for
  `carry_guard`; a licensed firearm round-trips its licence number; an employment
  history row round-trips city/state/zip.
- Add a case to the coverage report proving `license_type` now distinguishes Carry
  Guard, and downgrade that entry from `partial`.
- Walk the staff worksheet for a sponsored carry-guard case end to end and confirm no
  step shows a red-flagged field that cannot be answered from collected data.
