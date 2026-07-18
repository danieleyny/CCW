# Gun License NYC — on-platform document engine
### Claude Code prompt: questionnaires → auto-filled documents → complete, all on our platform

**The objective:** a customer should never have to leave our platform to figure out a document. For every requirement, we either (a) give them a short questionnaire and auto-generate the finished, download-ready document, or (b) tell them exactly how to get an external document (with the official link) and let them upload it — never "here's an Upload button, good luck." When a document is done, the requirement flips to complete and the finished file appears on the applicant's profile for the admin (and, only where privacy allows, the trainer).

**What already exists (reuse — don't rebuild):**
- `lib/forms/documents.ts` already generates 6 docs from intake answers (AFF-01 affirmation, SAF-01 safe-storage, SOC-01 social-media, ARR-01 arrest narratives + court-request letters, sole-occupancy). `lib/pdf/builder.ts` builds them. `app/portal/forms/[key]/route.ts` is the generate-on-demand pattern. **These live on a separate `/portal/forms` page, disconnected from the checklist.**
- `lib/references/process.ts` (token reference links, REF-01 recompute) and `lib/cohabitants/document.ts` (COH-01 affidavit) already exist.
- Requirements registry: `supabase/migrations/20260628000900_seed_requirements.sql` — each row has a `kind` (document / attestation / cohabitant_affidavits / references / etc.), authority citation, severity, blocking.
- `case_requirements` (status pending/satisfied) is the ONE checklist; `documents` table + storage bucket holds files; admin case page already renders requirements + documents + disclosures.

**Hard guardrails (from AGENTS.md — do not violate):**
- **Privacy firewall:** instructors NEVER see disclosures, documents, PII, or the applicant's real name (RLS-enforced: `case_requirements_select_instructor`, redacted feed). Any new generated document inherits the SAME RLS. "Show to the trainer" means training-relevant, non-sensitive status ONLY — never disclosure/affidavit/reference/arrest content.
- **No legal advice:** questionnaires collect FACTS. The disclosure flow must be candor-maximizing — never hint at omitting anything, disclose sealed/dismissed arrests, and route "what does my specific record mean" to the attorney-referral seam. Set `needs_legal_review` where a rule interpretation is involved.
- **We never file for the applicant.** We generate documents and a portal-entry worksheet; the applicant submits their own application on licensing.nypdonline.org. Never build auto-submission or touch NYPD portal credentials.
- No guarantee / expedite / fast-track / insider / approval-rate; don't claim our generated document IS the official NYPD form unless we're filling the actual official template — otherwise label it clearly as a prepared/ready-to-file document. Invent no citations.

Run in phases; `pnpm build` + `pnpm test` + the RLS verify harness pass after each.

---

## NYC GROUNDING (use these facts; cite the agency, don't fabricate)

```
- Application is filed ONLINE at licensing.nypdonline.org (paper not accepted since 2018). We prepare; the applicant files.
- Q10–28 "yes" answers → detailed written explanation via the Handgun License Application Addendum (PD 643-041A). One explanation per "yes."
- Each arrest/summons (EVEN IF dismissed, sealed, or nullified) → a Certificate of Disposition from the court + a written statement of circumstances. Candor is mandatory.
- Lifetime driving abstract → required; ~$7 online from NYS DMV (dmv.ny.gov). External — we guide + link, they upload.
- Character references → notarized letters (registry uses 4; NYPD guidance has ranged 2–4 and is contested — keep REF-01=4, note it may change).
- Cohabitant affidavit → notarized, one per household member 18+ (or a "live alone" statement). Household Consent Form / Consent Form B.
- Passport-style photos, government ID, proof of residence, 18-hour training certificate → external; guide + upload.
- Official required-docs checklist: licensing.nypdonline.org/app-instruction/requireddocs
```

---

## PHASE 0 — Audit (no edits)

```
We're building an on-platform document engine so customers complete every requirement without leaving our site. Read:
- lib/forms/documents.ts, lib/pdf/builder.ts, app/portal/forms/page.tsx + app/portal/forms/[key]/route.ts, components/portal/forms-signing.tsx
- lib/references/process.ts, lib/cohabitants/document.ts, lib/signatures.ts
- supabase/migrations/20260628000900_seed_requirements.sql (every req_code + kind), lib/requirements/*, lib/qa-gate.ts
- app/portal/checklist/page.tsx, app/portal/documents/page.tsx, components/portal/document-uploader.tsx
- app/admin/cases/[id]/page.tsx (how admin sees requirements/documents), app/instructor/cases/[id]/page.tsx (the privacy firewall — what instructors CAN'T see)
- AGENTS.md (privacy firewall, no-legal-advice, candor, we-don't-file)

Then reply with: (a) a table of EVERY req_code → its current experience (generate / upload-only / attestation) and whether a generated doc already exists for it; (b) confirm exactly what the instructor RLS hides today; (c) the smallest set of new pieces needed (a requirement→action config, a questionnaire engine, a generated-document store, UI wiring). Don't edit yet.
```

---

## PHASE 1 — Requirement → action taxonomy (the backbone)

```
Create ONE config (e.g. lib/requirements/actions.ts) that maps every req_code to how the customer completes it. Three modes:

MODE "generate" — we ask a short questionnaire and auto-produce the finished document:
  AFF-01 affirmation · SAF-01 safe-storage attestation · SOC-01 social-media list · COH-01 cohabitant affidavit (per adult) + sole-occupancy · REF-01 character references (via the existing token flow) · DSC-01/QUE-01/ARR-01/OOP-01/DIR-01 disclosure addendum + per-item written explanations + certificate-of-disposition request letters.
MODE "obtain" — external document we can't generate; we give step-by-step guidance + the official link + (where useful) a prepared request letter, then they upload:
  IDN-01 ID · IDN-02 proof of DOB · IDN-03 citizenship · IDN-04 passport photos · RES-01 proof of residence · DMV-01 lifetime driving abstract (dmv.ny.gov) · ARR-01 certificate of disposition (court + our request letter) · TRN-01 training certificate · MIL-01 DD-214 · GMC-01 certificate of good conduct · NAM-01 name-change proof.
MODE "attest" — answered on-platform already (intake) or a simple confirm:
  ELG-01/02/03 eligibility · FEE-01 fee readiness · FMT-01 upload format.

Each entry carries: mode, a human title, help text, the questionnaire schema id (for generate), the official source URL + instructions (for obtain), whether it must be NOTARIZED (affects the completion sequence), and whether it's SENSITIVE (disclosure/affidavit/reference/arrest — controls instructor visibility). This config is the single source the UI + engine read.
```

---

## PHASE 2 — Questionnaire + generation engine

```
1. QUESTIONNAIRE ENGINE: a schema-driven form (field types: text, date, select, textarea, repeatable group, yes/no-with-explanation). One schema per "generate" requirement. PRE-FILL every field we already know from intake so the customer never retypes (name, DOB, address, arrests, cohabitants, social handles). Save answers to a per-requirement answers store keyed to the case.
2. GENERATION: on submit, produce the finished PDF.
   - Reuse/extend lib/forms/documents.ts + lib/pdf/builder.ts for our prepared documents (clean, professional, ready to sign/notarize).
   - ADD AcroForm-fill capability to lib/pdf (pdf-lib getForm().getTextField().setText()) so that IF we have an official fillable template (e.g. a real NYPD/DMV AcroForm), we fill the actual form. If we only have a flat official PDF, generate our prepared equivalent AND a "what to enter" worksheet — clearly labeled, never passed off as the official form.
   - APPLICATION WORKSHEET: add a questionnaire that mirrors the NYPD online application fields and outputs a clean summary sheet the applicant copies into licensing.nypdonline.org. We prepare; they file.
3. STORE: write the generated file into the documents bucket + a `documents` row (type + a `generated: true` flag / source req_code), so it shows up wherever documents already render. Same RLS as uploads.
4. DOWNLOAD: the customer can download the finished document from the requirement itself.
Run pnpm build + the RLS verify harness.
```

---

## PHASE 3 — Completion sequence & status

```
Wire the state machine per requirement:
- generate (no notarization): fill questionnaire → generate → stored → mark case_requirement SATISFIED → shows complete. Customer can regenerate if they edit answers.
- generate (NOTARIZED: COH-01, REF-01, sole-occupancy): fill → generate ready-to-sign doc → status "generated · notarize & upload" → customer notarizes offline → uploads the signed copy → THEN satisfied. Make this two-step status explicit and obvious (don't mark satisfied on generation alone).
- obtain: guidance + link + optional prepared letter → upload → reviewed → satisfied (reuse existing upload/review + recompute).
- attest: confirm/auto from intake.
- REF-01 keeps its existing token recompute (satisfied at the required count). Respect any manually rejected/na rows.
- Re-run lib/qa-gate.ts logic: a case still cannot reach application_assembled/filed until blocking requirements are truly satisfied — generation alone must not slip a notarized item past the gate.
```

---

## PHASE 4 — Unify the customer UI (checklist + documents + forms → one place)

```
Today a customer bounces between /portal/checklist (shows "Upload"), /portal/documents (uploads), and /portal/forms (generated docs). Unify so EACH requirement shows the RIGHT inline action, in journey order:
- generate → a "Complete on our platform" / "Fill out & generate" button opening the questionnaire in a drawer/modal; after generation, a Download button + status.
- obtain → an expandable "How to get this" with plain steps + the official link (and a "Download request letter" where we prepare one) + the uploader inline.
- attest → a simple confirm or an auto-checked state from intake.
Keep the existing dark instrument design + components; reuse DocumentUploader and forms-signing. The screenshot's bare "Upload" is replaced by the correct action per item. Show the satisfied/pending/needs-notarization status clearly. Mobile-first.
```

---

## PHASE 5 — Visibility for admin & trainer (respect the firewall)

```
- ADMIN: generated documents already flow into the documents table, so they appear on app/admin/cases/[id] alongside uploads + requirement status. Confirm each generated doc is viewable (signed URL) and the requirement shows satisfied/needs-notarization. Add a small "generated on platform vs uploaded" indicator for the admin.
- TRAINER (instructor): DO NOT expose sensitive documents. The instructor firewall (no disclosures, no PII, no documents, no real name) stays intact — the new generated docs are SENSITIVE by default and must be covered by the SAME instructor-hidden RLS. The trainer's applicant view shows ONLY training-relevant, non-sensitive progress (e.g. "training requirement satisfied", scheduling) — never affidavits, references, disclosures, or the application worksheet. Add a negative RLS test proving an instructor cannot read a generated disclosure/affidavit document.
```

---

## PHASE 6 — The actual questionnaires & content (grounded in NYC)

```
Author each "generate" questionnaire + its output, using the NYC grounding facts (cite the agency, never fabricate):
- AFF-01 affirmation, SAF-01 safe-storage, SOC-01 social-media — extend the existing generators; add any missing questionnaire fields.
- COH-01 cohabitant affidavit — one per adult 18+ (repeatable group: name, relationship, DOB), notarized; plus the "I live alone" sole-occupancy path.
- REF-01 character references — questionnaire captures each reference's details; generate a notarized-ready reference letter template + drive the existing token outreach; note the 4-vs-2 count is contested.
- Disclosure addendum (DSC-01/QUE-01) — a Q10–28 questionnaire; every "yes" opens a required written-explanation field; output the addendum (PD 643-041A style, labeled as prepared). CANDOR-MAXIMIZING copy throughout ("disclose everything, including sealed/dismissed"); route specific-record legal questions to the attorney seam; set needs_legal_review.
- ARR-01 — per arrest: our certificate-of-disposition REQUEST letter (exists) + guidance to get the certificate from the court + the written statement of circumstances.
- OOP-01 / DIR-01 — copy + written narrative for orders of protection / domestic-incident reports (sensitive; same candor + attorney-seam rules).
- Application worksheet — mirrors the online application questions for easy portal entry.
For every "obtain" item write the plain-English how-to + the official link (DMV lifetime abstract, certificate of disposition per court, passport-photo spec, proof of residence, training certificate). Keep language retail-simple and reassuring.
```

---

## PHASE 7 — Verify (adversarial)

```
As a hostile reviewer:
1) PRIVACY FIREWALL: run the RLS harness — prove an instructor CANNOT read any generated disclosure/affidavit/reference/arrest document or the application worksheet, and still can't see PII or the real name. This is the highest-risk check.
2) CANDOR + NO LEGAL ADVICE: grep the disclosure flow — nothing suggests omitting/minimizing; sealed/dismissed disclosure is explicit; specific-record interpretation routes to the attorney seam; needs_legal_review set where required.
3) WE DON'T FILE: confirm there's no auto-submission to NYPD and no handling of NYPD portal credentials; the worksheet clearly says the applicant files their own application.
4) COMPLETION INTEGRITY: notarized items are NOT marked satisfied on generation alone (require the uploaded signed copy); the QA gate still blocks filing until blocking reqs are truly satisfied.
5) STORAGE/RLS: every generated document has the same RLS as uploads; admin can view, instructor cannot; no service-role leak.
6) ACCURACY: facts cite NYPD/DMV/court by name; no invented citations; generated docs are labeled "prepared by Gun License NYC" and not misrepresented as official NYPD forms unless an actual official template is being filled.
7) BUILD: pnpm build && pnpm test && the verify-* harnesses pass; mobile-first at 390px; e-signature still works.
Deliver: the req_code → action table, a list of new questionnaires/generators, screenshots of one generate flow + one obtain flow (customer, admin, instructor views), and the passing RLS negative test.
```

---

### Notes for you (not for Claude Code)
- **The privacy firewall is the thing to watch.** Your instinct — "show it to the admin and trainer" — is right for the admin, but exposing disclosures or affidavits to a trainer would break both your RLS design and the reason instructors are walled off pre-accept. The prompt scopes the trainer to training-only, and Phase 7 proves it with a negative test. If you truly want trainers to see more, that's a separate, deliberate decision.
- **We generate; we don't file.** The official application is submitted on the NYPD portal by the applicant. The engine prepares every document and a copy-paste worksheet, which keeps everything on your platform without crossing into filing on their behalf (which NYPD prohibits for consulting firms).
- **Official templates:** where NYPD/DMV publish a real fillable PDF, the engine fills it; where they don't, we produce a clean prepared document plus a worksheet — clearly labeled, never passed off as the government form.
