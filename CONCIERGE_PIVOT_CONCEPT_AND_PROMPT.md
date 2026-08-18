# Gun License NYC — Concierge pivot: concept, flow, and Claude Code build prompt

This document has two halves:
- **Part A — the concept.** How the two paths should diverge, the iterations I considered, and the recommended flow. Read this first.
- **Part B — the Claude Code prompt.** A detailed, phased build spec grounded in the real codebase. Paste this into Claude Code when the concept is approved.

---

# PART A — The concept

## The core problem
Today "Full Concierge" and "Self-Guided" are the same portal at two prices. A concierge buyer still does the work — same checklist, same uploads, same chasing. That's why $1,000 doesn't *feel* earned. The fix isn't more features on the same path; it's **collapsing the concierge applicant's effort to almost nothing** and making our work **visible**.

**The concierge promise, restated:** *"You send us your documents and book one call. We do the rest, and you watch it happen. When it's ready, you review, sign, and submit."*

The applicant's entire job becomes five low-effort moments:
1. Sign the agreements (once, ~2 min).
2. Book an intro call (pick a time).
3. Drop documents into a secure vault (upload, we tag/extract).
4. Watch a live dashboard as we prepare everything.
5. Review the finished packet, sign, and file their own application (guided).

Everything between #3 and #5 is done by our team on the admin/trainer side, and the applicant simply *watches it progress*. That visible "done-for-you" motion is the value.

## The compliance spine (non-negotiable, shapes the whole design)
NYPD rules bar consultants from **filing, representing, or expediting**. So concierge is **preparation-as-a-service**, not representation:
- We collect documents, extract the data, assemble the packet, and prepare a copy-paste-ready worksheet.
- **The applicant still reviews and submits their own application, and attends fingerprinting/interview themselves.** We never file, never represent, never guarantee.
- The "watch us work" dashboard shows *our preparation*, and the final step is a *guided applicant submission*.
- This must be made explicit in agreements the applicant signs at the start (limited-scope engagement, not legal representation, applicant files, no guarantee, authorization to handle sensitive PII, e-signature consent).

This is why the concierge dashboard ends at **"Ready for your review & filing"** with a worksheet + assembled packet — not at "Filed."

## Where the fork lives (iteration)
Considered three fork points:
- **At signup** — too early; we can't describe scope or price against a real application, and we'd lose people before they're invested.
- **After the eligibility quiz** — better, but we still don't know their document set.
- **After intake (recommended).** ✅ They've invested, we know their track + requirement set, and we can price honestly. It also slots exactly where the previous intake prompt put the "next step" hand-off — so *the post-intake screen becomes the path-selection screen.* (This supersedes Part 1C of `INTAKE_CHECKLIST_UX_PROMPT.md`.)

**Decision:** the fork is a **path-selection screen immediately after intake completes.**

## How much intake do concierge users do? (iteration)
Tempting to let concierge users skip intake entirely and "just upload." But intake is what runs the **eligibility/attorney-review gate** and determines the **requirement set** we'll prepare. Skipping it means we can't scope or price, and we lose the compliance gate.
**Decision:** everyone finishes the (now-mandatory, streamlined) intake; concierge simply removes *all downstream effort* — the checklist, chasing, and assembly become ours.

## The concierge dashboard metaphor (iteration)
- A **checklist** implies work for them → wrong signal for concierge.
- A bare **status bar** is too thin to feel worth $1,000.
- ✅ A **"control tower"**: a live, human-narrated progress timeline of *what we're doing for them* ("Reviewing your documents → Preparing your worksheet → Collecting your references → Ready for your review"), plus a tiny "here's the only thing we need from you right now" nudge when we're blocked on a document. It reads as *watching a concierge work*, not *doing chores*.

## Document collection (iteration)
- A single giant "dump everything here" vault gets us incomplete files.
- A long checklist re-creates the self-serve burden.
- ✅ A **short, guided vault**: a handful of plain asks ("A photo of your passport or license," "Proof you live at your address," "Your training certificate — or tell us you still need it") with a big drop zone, **smart-document tagging** (one passport satisfies photo-ID + DOB + citizenship — see the smart-documents idea already speced), and clear "✓ got it" states. Simple for them, complete for us. Private storage, encrypted, RLS-scoped.

## Who does the concierge work, and how the two sides link (confirmed)
"Connect their email" means **the applicant's account and the admin-run case are linked by a shared email address** — NOT inbox/OAuth access. The applicant creates an account with their email; admin begins the intake keyed to that *same* email; the two connect automatically. Concretely:
- **Email is the join key, both directions.** Admin (or a concierge-agent trainer) can **create a client + case by email**. If that person already has an account, the case attaches to their profile immediately; if they sign up *later* with that email, their new profile **claims the waiting case** on creation. Either order works, no manual matching. (This extends the existing `ensureClientCaseForProfile`, which is already email-keyed.)
- Staff then **work the case on the applicant's behalf**: organize the uploaded documents, fill the internal worksheet fields, advance the milestones the applicant watches, request specific documents, and message them — all **logged as acting-on-behalf** for the audit trail.
- **Access scoping:** concierge agents get the document access they need to prepare; sensitive disclosure material stays governed by the existing privacy model (a third-party trainer who is *not* a concierge agent still never sees disclosures). Every on-behalf action is attributed and logged.

## Signatures — capture once, adopt per document (confirmed)
Yes, we collect a digital signature from the applicant and apply it across the documents *they* sign, with a per-document approval — you already have the pieces (`components/sign/signature-pad.tsx`, the sign-document flow, `lib/pdf/builder.ts`). The compliant pattern:
- **Capture once.** The applicant draws or types a signature and gives e-sign consent; it's stored securely as their adopted signature (part of the agreements step).
- **Adopt per document.** For each document the applicant is the signer of — affirmation of understanding (AFF-01), safe-storage statement (SAF-01), disclosure addendum (DSC-01), sole-occupancy statement, and the engagement agreements — we present the finished document and they one-tap "review & apply my signature." Each adoption records **intent + an audit trail** (timestamp, IP, document hash, signature image) so it holds up under ESIGN/UETA. Staff assemble and QA the packet around it.
- **Never auto-apply the signature to three classes of document** (legal reasons): **notarized third-party documents** (reference letters, cohabitant affidavits — those people sign in front of a notary themselves), and the **NYPD application itself** (the applicant signs and submits that on the portal). This keeps us squarely in "prepare, don't file/represent."
- Effort for the applicant collapses from signing each document cold to a short "review & adopt" pass across the applicant-signed set.

## Intro call scheduling (iteration + decision)
Options weighed:
- **Calendly embed** — fastest to ship, zero scheduling logic, the rep manages availability in Calendly; we capture the booking via a webhook. You named it. ✅ **Recommended for v1.**
- **Cal.com** — open-source, self-hostable, embeddable; better long-term ownership, more setup.
- **Native (reuse the existing `slot-booker`)** — no third-party, full control, but we rebuild availability/reminders and it's more work now.
**Decision:** **Calendly embed for v1**, recorded onto the case via webhook, behind an env-configured link so it's swappable. Leave a clean seam to move to native later.

## The end-to-end flow (recommended)

```
Eligibility quiz ─▶ Account + agreements (concierge only signs the fuller set) ─▶ Intake (mandatory, streamlined)
      │
      ▼
POST-INTAKE PATH SELECTION  ──▶  Self-Guided  ──▶  (today's checklist / documents / marketplace, unchanged)
      │
      └────────────────────▶  Concierge  ──▶  Concierge onboarding:
                                             1) sign agreements (e-sign, gates the rest)
                                             2) book intro call (Calendly)
                                             3) secure document vault (guided, smart-tagged)
                                                    │
                                             CONCIERGE CONTROL TOWER (live, we work it on the admin/trainer side)
                                             "Reviewing docs → Preparing worksheet → Collecting references →
                                              Assembling packet → Ready for your review"
                                                    │
                                             REVIEW & FILE (guided): applicant reviews packet + worksheet,
                                             e-signs what they must, and submits their OWN application.
```

## Decisions I made for you (say the word to change any)
1. **Fork = after intake** as a two-card selection screen. (Supersedes the earlier post-intake hand-off.)
2. **Everyone completes intake**; concierge removes downstream effort, not intake.
3. **Concierge agents = admin + the lead trainer/operational partner**, with logged on-behalf access; disclosures still scoped.
4. **Applicant + admin linked by shared email** — applicant signs up with their email; admin begins intake keyed to that same email; the two auto-connect, either order. No inbox access.
5. **Signature captured once, adopted per document** with an audit trail; never auto-applied to notarized third-party docs or the NYPD application.
6. **Scheduling = Calendly embed for v1**, webhook-recorded, env-swappable.
7. **Concierge ends at "review & file,"** never at "filed" — the applicant submits. (Compliance.)

---

# PART B — Claude Code build prompt

> Build the Concierge experience as a distinct, done-for-you path that forks after intake, plus the admin/trainer concierge workspace that operates cases on the applicant's behalf. Self-Guided stays exactly as it is today. Work in phases; each ends with `pnpm build` + `pnpm test` + `verify-*` green and mobile-first at 390px.

**Global guardrails (AGENTS.md — hold the line):**
- **We never file, represent, or expedite.** Concierge = preparation & organization only. The concierge journey ends at "ready for your review & filing"; the applicant reviews, e-signs, and submits their own application and attends fingerprinting/interview. No guarantee/expedite/approval-rate language anywhere.
- **CP-5 QA gate + named sign-off** remain the only path to `application_assembled`/`filed`; the auto-advance ceiling stays. Concierge milestones the applicant sees are a *narrative layer*, not a bypass.
- **Privacy firewall intact.** A third-party trainer who is not a designated concierge agent still never sees disclosures, notes, tasks, intake answers, or PII beyond the active engagement. New "act on behalf" access is a scoped, logged capability — prove it with RLS negative tests.
- **Sensitive PII** (IDs, disclosures, arrest/mental-health data) lives in **private storage with RLS**; nothing sensitive in URLs; retention policy respected. Every on-behalf action is attributed in the activity log.
- Packages/pricing come from `service_packages` (DB), never hardcoded. Amounts from the schedule.

## PHASE 0 — Data model & service mode
```
1. Add case.service_mode enum ('self_guided' | 'concierge'), nullable until the applicant chooses at the fork.
   Keep payments.package_key for billing; service_mode is the experience switch. Migration + types.
2. Agreements: new table case_agreements (case_id, kind, version, signed_at, signer_name, signed_ip, document_id?)
   with kinds: 'engagement_limited_scope', 'privacy_authorization', 'esign_consent', 'applicant_files_ack',
   'no_guarantee_ack'. Content lives in a versioned config (config/agreements.ts) so wording is auditable and
   re-sign is possible when a version bumps. RLS: a client sees only their own; concierge agents/admin see their cases.
3. Intro call: new table intro_calls (case_id, provider 'calendly', external_event_id, scheduled_at, status,
   join_url?, rep_id?) so a booking is recorded on the case regardless of provider.
4. Concierge milestones: DON'T invent a parallel stage machine. Add a light concierge_milestones config
   (config/concierge-milestones.ts) that MAPS the existing 13 case_stages + key case_requirements states into a
   human, done-for-you narrative ("Reviewing your documents", "Preparing your worksheet", "Collecting your
   references", "Assembling your packet", "Ready for your review"). The control tower renders from real case
   state — it never lies about progress.
5. Concierge agents: a way to mark which staff/trainers are concierge agents (e.g. profiles.is_concierge_agent or a
   role grant). Drives the elevated, logged on-behalf access in Phase 5.
```

## PHASE 1 — Post-intake path selection (the fork)
```
When intake completes, route to a new PATH SELECTION screen (replaces INTAKE_CHECKLIST_UX_PROMPT.md Part 1C's
hand-off). New route app/portal/choose-path (or a state on portal home):
- Two premium cards from service_packages: SELF-GUIDED and FULL CONCIERGE, each with a 2–3 line plain-English
  description of what the applicant does vs. what we do, the price/label, and a single clear CTA.
    Self-Guided blurb: "You drive it, we guide it — your checklist, your uploads, our system keeping it all on track."
    Concierge blurb:  "We drive it, you watch — send your documents, book one call, and we prepare everything.
                       You review and file at the end."
- Selecting a path → set case.service_mode → run the existing enroll/checkout (app/portal/enroll) for that
  package → on payment success, route to the path:
    self_guided → /portal (today's checklist/documents/marketplace, UNCHANGED)
    concierge   → /portal/concierge (Phase 2+)
- Until a path is chosen, the post-intake portal nudges here. Choosing is reversible before payment; after payment,
  switching paths is an admin action (logged).
```

## PHASE 2 — Concierge onboarding (agreements + book the call)
```
New concierge home app/portal/concierge with a strict first-run order:
1. AGREEMENTS GATE (blocks everything else): render each config/agreements.ts document; the applicant e-signs
   (reuse components/sign/signature-pad.tsx + the sign-document flow). On sign, write case_agreements rows with
   name/timestamp/IP, and generate a stamped PDF copy via lib/pdf/builder.ts stored privately. The dashboard's
   working areas stay locked until the required set is signed. Wording is limited-scope + applicant-files +
   no-guarantee + privacy authorization + e-sign consent — plain, honest, non-representation.
   ALSO CAPTURE THE REUSABLE SIGNATURE HERE: as part of e-sign consent, capture the applicant's adopted signature
   (drawn or typed) ONCE and store it securely (new signatures table or profile-scoped record: image/vector +
   consent timestamp + IP). This is the signature Phase 6B adopts onto each applicant-signed document — so they
   never redraw it per document.
2. BOOK YOUR INTRO CALL (first thing they see after signing): embed Calendly (env CALENDLY_CONCIERGE_URL). On
   booking, capture it onto intro_calls via a Calendly webhook (new app/api/calendly/route.ts, signature-verified)
   → set scheduled_at/join_url and surface "Your intro call: <date/time>" on the dashboard. Keep the provider
   behind an interface so a native scheduler can replace it later. If Calendly isn't configured, fall back to a
   "request a call" form that creates a task for a rep.
```

## PHASE 3 — Secure document vault (simple for them, complete for us)
```
A guided, minimal collection on the concierge dashboard — NOT the self-serve checklist:
- A short list of plain asks tailored to their track (photo ID/passport, proof of residence, training certificate
  or "not yet", plus track-specific items), each a big drop zone with a "✓ got it" state.
- Reuse the smart-document tagging already speced (INTAKE_CHECKLIST_UX_PROMPT.md Part 4 / lib/requirements/
  smart-documents.ts): one passport satisfies photo-ID + DOB + citizenship; utility bill → residence; etc. The
  applicant uploads once and we attach it everywhere it belongs.
- References: the applicant only lists names + emails; WE send the notarized-letter links and chase them (reuse the
  references roster). Concierge means they don't manage this — they just give us the names.
- Storage: private bucket, RLS to the client + concierge agents only; encryption at rest; validated uploads
  (existing enforceUploadedFile). Nothing sensitive in URLs. Show a calm "Everything you send is encrypted and only
  seen by your concierge team."
- The vault reports upward: uploads flow into the same documents/case_requirements the admin side reads, so staff
  see them immediately.
```

## PHASE 4 — The concierge control tower (what they watch)
```
The concierge dashboard's centerpiece: a live, human-narrated progress view rendered from REAL case state via
config/concierge-milestones.ts (Phase 0). For each milestone show: done / in-progress / upcoming, a plain-English
line of what we're doing, and — only when we're actually blocked on them — ONE gentle "the only thing we need from
you right now" nudge (e.g. "We still need your proof of residence"). Include: assigned concierge/rep, next intro
call, a message thread with the team, and an honest note on NYPD-controlled stages ("this part is the NYPD's clock,
not ours"). No fake progress; it moves when the case moves.
```

## PHASE 5 — Admin/trainer concierge workspace (operate on their behalf)
```
1. CREATE A CLIENT BY EMAIL (email is the join key, both directions): admin (and concierge-agent trainers) can
   intake a customer from the admin/trainer side — enter name + email → provision account + case (reuse
   lib/onboarding.ensureClientCaseForProfile), set service_mode='concierge', send a branded invite to set their
   password and sign agreements.
   - If the email ALREADY has an account, attach the case to that profile immediately.
   - If it doesn't, create a pending/invited case keyed to the email; when the applicant later SIGNS UP with that
     same email, their new profile CLAIMS the waiting case on creation (do this in the signup/provision path so it
     works regardless of who acted first). Never leave a duplicate or orphaned case; match case-insensitively on
     normalized email. This is the whole "the applicant makes an account and admin's intake auto-connects to it."
2. WORK ON BEHALF: a concierge case workspace (extend app/admin/cases/[id] and the instructor case detail) where a
   concierge agent can: organize/label uploaded documents, fill the internal worksheet fields (lib/requirements/
   worksheet.ts) we extract from their documents, advance the concierge milestones the applicant sees (mapped to
   real stage/requirement changes — never a cosmetic override of the QA gate), request a specific document (creates
   the applicant's single "we need this" nudge), and message the client. EVERY on-behalf action is logged via
   logActivity with the acting agent + "on behalf of" attribution.
3. ACCESS SCOPING (prove it): concierge agents get the document + worksheet access needed to prepare; a trainer who
   is NOT a concierge agent keeps today's restricted view (no disclosures/PII). RLS negative tests must show: a
   non-agent trainer still can't read disclosures; an agent's access is scoped to their assigned concierge cases
   only; nothing widens self-guided or other cases.
4. We PREPARE, we don't file: the worksheet + assembled packet are outputs the applicant uses to file themselves.
   No admin action "submits to NYPD." The QA gate + sign-off still govern application_assembled.
```

## PHASE 6 — Review & file (the compliant hand-off)
```
When the packet passes QA, the concierge control tower flips to "Ready for your review & filing":
- The applicant reviews the assembled packet + the copy-paste worksheet (what to enter on the NYPD portal),
  e-signs anything requiring their signature, and is walked — step by step — through submitting their OWN
  application at licensing.nypdonline.org and what to expect at fingerprinting/interview.
- Nothing here files for them. Clear, warm, honest copy: "We prepared everything. This last step is yours by law —
  here's exactly how to do it, and we're on the line if you get stuck."
- After they self-report "filed," the dashboard moves into the NYPD-controlled stages with honest ETAs.
```

## PHASE 6B — Reusable signature: adopt per document, staff finalize
```
Turn "sign every document" into a short "review & adopt" pass:
1. The applicant's adopted signature is captured once (Phase 2). For each document the APPLICANT is the signer of —
   AFF-01 (affirmation of understanding), SAF-01 (safe-storage statement), DSC-01 (disclosure addendum), the
   sole-occupancy statement, and the engagement agreements — present the finished PDF and let them one-tap
   "Review & apply my signature." Render the signature onto the PDF via lib/pdf/builder.ts.
2. Per-document AUDIT (ESIGN/UETA): record signer name, timestamp, IP, the document hash/version, and the applied
   signature for every adoption. A document is only "signed" when the applicant affirmatively adopts it — capturing
   the signature once is consent to a method, not blanket authorization; each document still needs its own intent.
3. Staff assemble/approve around it (QA gate unchanged). The applicant can batch-review ("here are the 5 documents
   that need you") but each is individually adopted and logged.
4. HARD EXCLUSIONS — never auto-apply the applicant's signature to:
   - notarized THIRD-PARTY documents: reference letters (REF-01/02) and cohabitant affidavits (COH-01) — those are
     signed by those people in front of a notary;
   - the NYPD application itself — the applicant signs and submits that on licensing.nypdonline.org.
   Enforce this in code (a signable-by-applicant allowlist), not just copy.
```

## PHASE 7 — Notifications & reminders
```
Reuse lib/email + the reminders engine for the concierge moments: agreements signed, intro call booked/updated,
"we need one document" requests, rep assigned, packet ready for review, and gentle nudges when we're blocked on the
applicant. Idempotent (respect reminder_log). Keep copy done-for-you and calm.
```

## VERIFY (adversarial)
```
1) COMPLIANCE: nowhere does the product file/submit for the applicant; the concierge journey ends at review & file;
   agreements (limited-scope, applicant-files, no-guarantee, privacy, e-sign) are signed and gate the dashboard;
   no guarantee/expedite language.
2) PRIVACY/RLS: a non-agent trainer still cannot read disclosures/notes/tasks/intake/PII; concierge agents are
   scoped to their assigned concierge cases; self-guided and other cases are untouched; the vault bucket is private.
3) FORK: after intake, path selection sets service_mode, runs checkout, and routes correctly; self_guided is
   byte-for-byte the current experience; concierge routes to the new dashboard.
4) CONTROL TOWER HONESTY: milestones derive from real stage/requirement state and the QA gate — no cosmetic
   advancement; NYPD-controlled stages are labeled as such.
5) ON-BEHALF AUDIT: every staff action on a concierge case is logged with the acting agent + on-behalf attribution;
   admin "create client by email" provisions correctly and invites the applicant; a later signup with the same
   email CLAIMS the waiting case (no orphan/duplicate), and an existing account attaches immediately.
5b) SIGNATURES: the applicant's signature is captured once; each applicant-signed document requires its own adopt
   action with a full audit record (name/time/IP/doc-hash); the applicant's signature CANNOT be applied to reference
   letters, cohabitant affidavits, or the NYPD application (enforced in code, not just copy).
6) SCHEDULING: Calendly booking records onto intro_calls via signature-verified webhook; missing config degrades to
   a request-a-call task, never a broken screen.
7) pnpm build && pnpm test && verify-* pass; mobile-first at 390px on every new screen.
Deliver: before/after of the post-intake fork, the concierge dashboard (agreements → call → vault → control tower →
review&file), the admin "create client + work on behalf" flow, and the RLS negative-test output.
```

---

### Notes for you (not for Claude Code)
- **This supersedes Part 1C** of the intake prompt (the post-intake hand-off becomes the path-selection fork) and **reuses Part 4** (smart documents) as the vault's tagging engine. The height/DOB/forced-intake pieces of that prompt still stand.
- **Biggest value, least effort:** Phases 2–4 (agreements → call → vault → control tower) are what make concierge *feel* worth the price. Phase 5 is the engine that lets your team actually deliver it.
- **One thing to confirm before build:** my read of "connect their email" as *staff operate the case on their behalf* (not inbox OAuth). If you meant literal email/inbox access, say so — it's a separate, higher-risk scope.
- **One thing that's yours, not code:** the exact legal wording of the five agreements should get a quick attorney pass — I've scoped the mechanism (versioned, e-signed, stamped PDF), but the words are a legal call.
```
