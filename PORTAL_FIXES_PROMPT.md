# Gun License NYC — portal fixes & UX pass
### Claude Code prompt: 4 real bugs + 6 UX improvements (all verified in the code)

This pass fixes data-integrity bugs in the new document engine and makes the applicant portal obvious to use. **I have already traced each issue to the exact file — the evidence is inline below, go straight there.**

**Guardrails (AGENTS.md — unchanged):** the instructor privacy firewall stays intact (instructors never see disclosures/documents/PII/real name — generated docs are sensitive by default); candor-maximizing, never suggest omitting; no legal advice (route specific-record questions to the attorney seam); **we never file for the applicant**; the CP-5 QA gate must keep blocking `application_assembled`/`filed`; no guarantee/expedite language. `pnpm build` + `pnpm test` + the `verify-*` RLS harnesses pass after each phase.

---

## PHASE 1 — CRITICAL BUG: generated documents are being saved as "Government photo ID"

```
ROOT CAUSE (confirmed) — lib/requirements/document-engine.ts, the insert around line 242:
    type: doc.documentType ?? "id",   // enum is NOT NULL; req_code carries the truth
Every generated document whose documentType is null — disclosure addendum, arrest statements, order-of-protection statement, domestic-incident statement, application worksheet — is stored with type "id". Because app/portal/documents/page.tsx keys "latest document per type", the ID slot then displays the Disclosure Addendum. A user sees "Government photo ID uploaded", clicks View, and gets the PD 643-041A addendum they never uploaded. This is a data-integrity bug and it also risks the wrong document being treated as an ID at review time.

FIX:
1. Add proper values to the `document_type` enum in a NEW migration (never edit a shipped one): disclosure_addendum, arrest_statement, order_of_protection_statement, domestic_incident_statement, application_worksheet — plus driving_abstract (needed in Phase 2). Follow the 14-digit migration convention; run db:types after.
2. Give every generated document a real documentType in document-engine.ts. DELETE the `?? "id"` fallback entirely — if no type fits, fail loudly rather than mis-file.
3. BACKFILL/REPAIR: write a one-off script (scripts/repair-generated-doc-types.ts) that finds existing documents rows where type='id' but the row is generated (generated=true / has a req_code that isn't IDN-01) and re-types them correctly. Report how many rows it fixed. Do not delete anything.
4. Make the portal + admin document views key on req_code/generated rather than blindly "latest per type", so a generated doc can never occupy an upload slot again.
5. Add a regression test: generating a disclosure addendum must NOT change the state of the IDN-01 / Government photo ID requirement or slot.
```

---

## PHASE 2 — BUG: "obtain" requirements with no upload button (DMV-01)

```
ROOT CAUSE (confirmed) — lib/requirements/actions.ts: the "DMV-01" entry is mode:"obtain" with steps and help text but NO `documentType` key, unlike "IDN-04" which has documentType:"applicant_photo". The uploader only renders when a documentType exists, so the user is told what to do and then has nowhere to put it.

FIX:
1. Give DMV-01 documentType:"driving_abstract" (enum added in Phase 1) so the uploader renders inline.
2. DMV-01 needs MULTIPLE files (one abstract per state of residence in the past 5 years). Support multi-file upload for this requirement, or allow repeat uploads that append versions rather than replace — the user must be able to add NY plus each other state.
3. AUDIT EVERY entry in lib/requirements/actions.ts: any mode:"obtain" without a documentType is the same bug. List them and fix them all. Add a type-level guard (e.g. discriminated union) so mode:"obtain" REQUIRES documentType and the compiler catches this class of bug forever.
```

---

## PHASE 3 — BUG/GAP: generated documents have no signature and no signing date

```
PROBLEM (confirmed): the new questionnaire flow (components/portal/questionnaire-sheet.tsx → lib/requirements/document-engine.ts) never captures or requests a signature — there is no signature handling in questionnaire-sheet.tsx or requirement-action.tsx. So the Affirmation of Understanding, the disclosure addendum, and the rest generate unsigned, and the date shown is just "render date", not a signing date. The OLDER /portal/forms flow did this correctly (app/portal/forms/actions.ts `fileSignedForm` requires getSignaturePng and refuses without it).

FIX — add signing to the questionnaire completion sequence:
1. After the questionnaire is filled, show a SIGN step in the same dialog: capture the applicant's signature (reuse the existing signature capture used by components/portal/forms-signing.tsx + the `signatures` table + lib/signatures.ts). If a signature is already on file, offer "use my signature on file" plus a "re-sign" option.
2. Record a `signed_at` timestamp when they sign. The document's date line must render THAT signing date — auto-filled, not editable, not the render date.
3. Stamp both the signature image and the signing date into the PDF (lib/pdf/builder already has signatureImage — extend it to render "Signed: {date}" beside/below the signature).
4. For SIGNABLE requirements, do not mark the requirement satisfied until it is signed. An unsigned generated draft may be downloadable, but it must be clearly labelled "DRAFT — unsigned" and must not satisfy the requirement.
5. Notarized items (COH-01, REF-01, sole-occupancy) keep their two-step flow: generate → sign → download → notarize offline → upload signed copy → satisfied.
6. Regenerating after an answer edit must invalidate the old signature (re-sign required) so a signature never sits on stale content.
```

---

## PHASE 4 — Remove FMT-01 from the customer's checklist; enforce it server-side

```
The user should never be asked to "Confirm" upload format compliance — we already do it for them. components/portal/document-uploader.tsx line ~67 already enforces size + allowed type and sanitizes the filename before upload.

FIX:
1. Remove FMT-01 from the customer-facing checklist. Either drop it from the customer view entirely, or auto-satisfy it as a system requirement (system-verified, not user-confirmed) so admin/QA still sees the control satisfied.
2. Move/duplicate the validation SERVER-SIDE (in the record/upload server action) as defense in depth — a client-side-only check is bypassable: enforce max size, allowed MIME types (PDF/JPG/PNG/BMP/TIF), and sanitize/normalize the stored filename there.
3. Where a file is close to the limit or a wrong type, fix it FOR them where safely possible (e.g. re-encode/compress oversized images, normalize the filename) and tell them what we did — rather than rejecting with an error. That's the "we handle it" promise.
4. Apply the same treatment to any other requirement that is really a system control rather than a user task — audit lib/requirements/actions.ts for mode:"attest" entries that we can verify ourselves, and stop asking the user to confirm things we already know.
```

---

## PHASE 5 — Clearer titles + visual examples for every upload item

```
Current IDN-04 reads "Photo — square, 600×600–1200×1200 px, taken within 30 days" — that's spec-speak. Rewrite every upload requirement's customer-facing title into plain language, with the spec as secondary detail:
  IDN-04 → "A square photo of you, taken in the last 30 days"  (detail: passport-style, plain background, 600×600–1200×1200 px — we check it for you)
Do the same for ID, proof of residence, safe photos, training certificate, driving abstract, etc. Title = what to do in human words; the technical spec goes in the help text underneath.

VISUAL EXAMPLES: add a small "See an example" reference image to each upload requirement so users can see what good looks like.
IMPORTANT — do NOT scrape random photos off the web: real people's photos carry copyright and privacy problems, and a stranger's ID/document image is worse. Instead CREATE our own illustrative example graphics (simple on-brand SVG/CSS illustrations rendered in the app — e.g. a correct vs incorrect photo diagram: framing, plain background, square crop; a safe photo with door open vs closed; a redacted mock utility bill showing which corner the name/address must be visible in). Where an official government spec image exists and is public-domain (e.g. federal passport-photo composition guidance), it may be used with attribution — verify the license first and log it.
Show examples inline (a thumbnail that expands), keep them light, and make sure they're aria-described for screen readers.
```

---

## PHASE 6 — Questionnaire opens CENTERED, not as a right-side drawer

```
components/portal/questionnaire-sheet.tsx currently uses <Sheet> with <SheetContent side="right">. Replace with a CENTERED modal (<Dialog>/<DialogContent>) so the form opens in the middle of the screen.
- Desktop: centered, comfortable max-width (~640px), scrolls internally on long questionnaires.
- Mobile (390px): full-screen or near-full-screen sheet is fine — whichever is more usable on a phone; no horizontal scroll, inputs ≥44px, keyboard doesn't cover the submit button.
- Preserve focus trap, ESC to close, focus-visible rings, and the existing "unsaved answers" behaviour. Rename the component if the name no longer fits.
```

---

## PHASE 7 — Checklist filters

```
components/portal/requirements-checklist.tsx already computes applicable/satisfied counts but offers no filtering. Add filter controls at the TOP of the checklist:
  [ All ]  [ To do ]  [ Completed ]      (+ "Needs notarization" if that state exists)
- Default to "To do" if anything is outstanding, else "All" — the point is the user immediately sees what's left.
- Show the count on each filter chip (e.g. "To do 12"). Keep the existing "X of Y requirements satisfied" summary.
- Keep "not applicable" items out of the main list (collapsed as today).
- Client-side filtering, keyboard accessible, state preserved when a drawer/modal closes.
```

---

## PHASE 8 — Rebuild the Documents tab as the full document library

```
Today /portal/checklist and /portal/documents overlap confusingly, and Documents shows only a curated upload list. Restructure Documents into ONE complete library with two clear groups:
  1. "Still needed" — every document not yet provided (uploads outstanding AND generated forms not yet completed/signed), each with its inline action (upload, or open the questionnaire).
  2. "Completed" — everything already provided: uploaded files AND documents we generated for them, each with the correct real name, date provided, status (pending review / accepted / needs fix), and View/Download.
- Drive BOTH groups off the same requirement/action config as the checklist, so the two pages can never disagree (this is what caused the confusion).
- Show clearly whether each item was "uploaded by you" or "prepared by Gun License NYC".
- After Phase 1, verify a generated document never appears under an upload slot it doesn't belong to.
- Keep both tabs (checklist = the journey/status view; documents = the file library), but make their relationship obvious in the nav labels/descriptions.
```

---

## PHASE 9 — BUG: the case stage never advances (stuck at "Lead / Inquiry")

```
CONFIRMED: `setCaseStage` exists ONLY in app/admin/actions.ts — stages are advanced manually by staff. Cases are created at "lead" (lib/onboarding.ts, app/(marketing)/actions.ts). So a customer can complete intake, pay, finish training and upload documents while their stage still reads "Lead / Inquiry". The customer sees a stage that contradicts their own progress.

FIX — automatic, milestone-driven advancement for the EARLY stages (server-side, idempotent, never backwards):
  eligibility_screened  ← eligibility check / intake started
  signed_up_paid        ← package purchased / deposit recorded
  training_scheduled    ← a booking is confirmed
  training_complete     ← the instructor marks the session complete (training_sessions row)
  document_collection   ← requirements materialized and uploads under way
  notarization          ← notarized items generated and awaiting notarized upload
Rules:
- Implement as ONE helper (e.g. lib/cases/advance.ts `maybeAdvanceStage(caseId)`) called after the relevant server actions (intake complete, payment, booking confirm, training complete, document accepted). Idempotent; only ever moves FORWARD; logs via logActivity.
- NEVER auto-advance into application_assembled or filed — those stay behind the CP-5 QA gate + named staff sign-off in setCaseStage. Auto-advancement must not bypass lib/qa-gate.ts.
- Admin can still set any stage manually (override wins).
- Surface the stage to the customer in plain language ("Where you are: gathering documents"), not the internal key.
- Add tests: paying advances lead→signed_up_paid; instructor completion advances to training_complete; a case with unmet blocking requirements still CANNOT reach filed.
```

---

## PHASE 10 — Portal home: put "what's next" at the TOP

```
app/portal/page.tsx currently links to the checklist far down the page (around lines 130/205/221). A returning user lands and doesn't know what to do next.
FIX: make the FIRST thing on the portal dashboard a prominent "Your next step" card:
- The single most important outstanding action (next unsatisfied blocking requirement), with a direct button to complete it.
- A compact progress indicator ("8 of 20 done") and a "View everything left to do" link to the filtered checklist.
- If nothing is outstanding, show the current stage + what happens next (e.g. "Waiting on NYPD — nothing needed from you right now"), so the state is never ambiguous.
- Keep it above the fold on a 390px phone. Existing design language, no redesign.
```

---

## PHASE 11 — Verify (adversarial)

```
As a hostile reviewer:
1) DOC TYPES: no documents row has a generated document stored as type "id"; the `?? "id"` fallback is gone; the repair script's results are reported; generating an addendum does not touch IDN-01. Show the before/after row counts.
2) UPLOADS: every mode:"obtain" requirement renders a working uploader (DMV-01 included, multi-file); the compiler now rejects an "obtain" entry with no documentType.
3) SIGNING: no signable generated document can satisfy its requirement unsigned; the stamped date equals the signing timestamp; editing answers invalidates the signature; notarized items still require the notarized upload.
4) FMT-01: gone from the customer checklist; size/type/filename enforced SERVER-side (prove a bad file is rejected/normalized when the client check is bypassed).
5) STAGE: milestones advance the stage automatically and idempotently; stages never move backwards; application_assembled/filed remain QA-gated with staff sign-off; admin override still works.
6) PRIVACY FIREWALL: re-run the RLS harness — an instructor still cannot read any generated disclosure/addendum/affidavit/worksheet document, PII, or the real name. This is the highest-risk regression area.
7) UX: questionnaire opens centered; checklist filters work; Documents shows still-needed + completed consistently with the checklist; portal home leads with the next step; all verified at 390px.
8) LEGAL/CANDOR: no omission-friendly copy; attorney seam intact; nothing claims to be an official NYPD form; we still never file for the applicant.
9) pnpm build && pnpm test && verify-* harnesses pass.
Deliver: a list of files changed, the repair-script output, before/after screenshots (checklist, documents, questionnaire modal, portal home) at 390px and desktop, and an honest list of anything still broken.
```

---

### Notes for you (not for Claude Code)
- **Phase 1 is the one to run first and check carefully.** A generated legal document sitting in the "Government photo ID" slot isn't just cosmetic — at review time someone could treat it as an ID, and it corrupts the QA picture. The repair script fixes existing bad rows.
- **On the stage question you flagged:** you weren't wrong to be suspicious. Nothing in the system advances a case automatically today — it's entirely manual from the admin side, so "Lead / Inquiry" was technically "correct" but meaningless to a customer who'd done half the work. Phase 9 fixes that without weakening the pre-filing QA gate.
- **On example images:** I've deliberately steered away from pulling photos off the web. Real ID/document photos carry copyright and privacy exposure you don't want on a firearms-licensing site. Our own simple illustrations do the job better and are safe to ship.
