# Gun License NYC — trainer-as-concierge upgrade
### Plan + detailed Claude Code prompt (the two-sided core of the product)

Reposition the engaged trainer from a walled-off training vendor into the applicant's **scoped concierge** — reviewing and approving each document, leaving revision notes tied to specific items, and running many cases from a real dashboard with per-applicant progress and next-step guidance. Gun License NYC becomes the platform that lets trainers deliver concierge service at scale, while keeping the compliance backstops that protect everyone.

## The decided model (your calls — build to this exactly)
- **Trainers are a MIX** of third-party marketplace instructors and your own staff → every instructor carries a `trust_tier` (`partner` = third-party, default; `staff` = your own). Access rules read this tier.
- **Sensitive disclosures are SCOPED OUT of trainers** (all tiers, by default): arrests, orders of protection, domestic-incident reports, mental-health adjudications, and their narratives/documents stay with Gun License NYC's back-office (admin) + the attorney-referral seam. Trainers concierge everything else.
- **Gun License NYC admin is the BACKSTOP:** the trainer is first-line reviewer/approver; admin keeps the final pre-filing QA gate + named sign-off. The applicant always files their own application — neither the trainer nor Gun License NYC files for them.

## What already exists (build on it, don't rebuild)
- **Admin already has the concierge toolkit** we're scoping down to trainers: `DocumentReview` (approve/reject + notes), `RequirementsReview`, `DisclosureReview`, `CaseNotes`, `CaseTasks`, `QaGateCard`, `signPreFilingQa`, `requestBetterNarrative` (app/admin/cases/[id] + app/admin/actions.ts).
- `document_status` enum is already `pending | approved | rejected` with `review_notes` — the three-level status is a short extension.
- Trainer↔applicant chat already exists as a **separate lane** keyed by `engagement_id` (never the staff thread / disclosures).
- Instructor is engaged via `accept_offer`; RLS (`cases_select_instructor`, `case_requirements_select_instructor`) already scopes by active engagement — today it hides documents, disclosures, and even the name.

## Guardrails (AGENTS.md + your decisions — non-negotiable)
- Trainers (any tier) NEVER see disclosures (arrest/OOP/DIR/mental-health) content — enforced by RLS, proven by a negative test.
- A trainer's approval means "documents look complete, correct, and properly formatted" — NOT legal advice and NOT legal sufficiency of a disclosure. Disclosure interpretation stays with admin + the attorney seam (no practice of law).
- Admin keeps the final QA gate; trainer approval is a signal into it, not a replacement. Nothing files without the applicant filing it themselves.
- No guarantee/expedite; identity is revealed to a trainer ONLY for their own active engagements.

`pnpm build` + `pnpm test` + `verify-*` RLS harnesses pass after each phase. This is the highest-risk area in the codebase — treat RLS as the priority.

---

## PHASE 0 — Audit & confirm the model (no edits)

```
We're turning the engaged trainer into a scoped concierge. Read:
- app/instructor/* (cases/[id], feed, page, actions), app/admin/cases/[id]/page.tsx + app/admin/actions.ts, components/admin/{document-review,requirements-review,disclosure-review,case-notes,case-tasks,qa-gate-card}.tsx
- lib/requirements/*, lib/qa-gate.ts, lib/portal/requirement-view.ts, supabase migrations for instructors/offers/engagement-messaging + all RLS policies touching cases/case_requirements/documents/disclosures/messages
- AGENTS.md (privacy firewall, no-legal-advice, candor, we-don't-file)

Reply with: (a) the exact RLS today for what an engaged instructor can/can't read on cases, case_requirements, documents, disclosures, messages; (b) which requirement codes / document types are SENSITIVE (disclosure-related: DSC/ARR/OOP/DIR/QUE + mental-health) vs concierge-safe (IDN/RES/DMV/COH/SAF/AFF/REF/SOC/TRN/photos/forms/fees); (c) the smallest set of changes to deliver the decided model. Don't edit yet.
```

---

## PHASE 1 — Data model: trust tiers, sensitivity tags, the review/approval status

```
1. TRUST TIER: add instructors.trust_tier ('partner' default | 'staff'). Migration + db:types. Admin can set it (app/admin/instructors). Access policies read it; disclosures stay scoped out for BOTH tiers by default (a future toggle may grant staff-tier a disclosure SUMMARY, but ship it OFF).
2. SENSITIVITY TAG: mark every requirement + document as sensitive vs concierge-safe (a column on requirements, and a derivable flag on documents via req_code/type). Disclosure-related items (DSC-01, ARR-01, OOP-01, DIR-01, QUE-01, mental-health, and their generated docs/narratives + the `disclosures` table) are SENSITIVE. Everything else is concierge-safe. This tag is what RLS and the UI filter on — get it exhaustive and default-sensitive for anything unclassified (fail safe).
3. REVIEW/APPROVAL STATUS: extend the item status into the applicant-visible three levels + a revision state:
     pending        → applicant hasn't provided it
     submitted      → applicant provided it (uploaded/generated/signed); awaiting trainer review
     approved       → trainer reviewed and approved
     changes_requested → trainer asked for a fix (with a note)
   Reuse document_status where possible (pending/approved/rejected) and ADD "submitted" + "changes_requested" semantics; record reviewer_id, reviewed_at, and the review note per item. Keep it consistent across uploaded documents, generated letters, and requirement rows.
4. IDENTITY: for a trainer's OWN active engagement, reveal the applicant's name + contact needed to concierge them (scoped to that engagement only). The pre-accept feed stays redacted. Sensitive disclosures remain hidden regardless.
```

---

## PHASE 2 — RLS: engaged-trainer concierge access (the highest-risk phase)

```
Write new/updated RLS so an ENGAGED instructor can, for THEIR active-engagement cases only:
- read the case + applicant identity/contact,
- read and review CONCIERGE-SAFE requirements + documents (non-sensitive only),
- write review status + review notes on those items,
- read/write their engagement message lane.
And can NEVER, at any tier:
- read any SENSITIVE (disclosure) requirement, document, narrative, or the `disclosures` table,
- read the client↔staff message thread or case_notes,
- read another trainer's cases or any case they're not actively engaged on.
Implement with security-definer helpers (like instructor_owns_engagement) + the sensitivity tag. Fail safe: anything unclassified is treated as sensitive/hidden.
NEGATIVE TESTS (add to the verify harness): an engaged trainer selecting a disclosure/arrest document, the disclosures table, case_notes, or the staff thread returns ZERO rows; a non-engaged trainer sees nothing. This is the acceptance gate for the whole feature.
```

---

## PHASE 3 — Trainer review & approval workflow

```
Give the engaged trainer a scoped version of the admin's review tools, on CONCIERGE-SAFE items only:
- Per document/letter: Approve, or Request changes (with a required note). Approving sets status=approved + stamps reviewer_id/reviewed_at; requesting changes sets changes_requested + the note.
- Approval must be visible ON the item to the applicant (Phase 4) so they trust it was checked.
- Item-anchored notes: a note references a SPECIFIC document/requirement (not just a case-level chat), and creating a changes_requested note NOTIFIES the applicant (in-app + existing notification path) that a specific item needs a revision.
- Reuse/adapt components/admin/document-review.tsx + requestBetterNarrative patterns, but SCOPED (no disclosures, no legal-sufficiency language). Trainer approval copy = "reviewed for completeness & correctness," never legal advice.
- Sensitive disclosure items appear to the trainer only as a locked row ("Handled by Gun License NYC — sensitive") so their progress view is complete without exposing content.
```

---

## PHASE 4 — Applicant-facing three-level status + revisions

```
On every requirement/document in the applicant's checklist + documents views, show the clear status ladder:
    Pending  →  Submitted (in review)  →  Approved      (+ a distinct "Needs revision" state)
- "Submitted" = provided, waiting on the trainer. "Approved" shows a trainer-approved check/badge on the item so the applicant sees it was vetted (less friction, fewer filing surprises).
- "Needs revision" surfaces the trainer's note on the exact item with a clear "what to fix" and a way to re-submit; it clears back to Submitted on resubmission.
- Keep it warm and reassuring ("Your instructor reviewed this — looks good" / "Your instructor asked for a small fix"). Reuse existing portal design; mobile-first.
- Sensitive disclosure items show their normal status but are reviewed by Gun License NYC, not the trainer — don't imply the trainer saw them.
```

---

## PHASE 5 — The trainer dashboard (scale to many cases)

```
Build the trainer a real book-of-business dashboard (app/instructor):
1. MULTI-CASE OVERVIEW: a list/board of their engaged applicants, each row showing: applicant name, current stage, a PROGRESS BAR (approved-of-applicable requirements), what we're waiting on, and — most importantly — a "NEEDS YOUR REVIEW" flag with a count when items are submitted and awaiting them. Sort/filter by "action needed", stage, newest.
2. A "NEEDS YOUR REVIEW" QUEUE across all their cases — the single most useful screen for a concierge running volume: every submitted-but-unreviewed item, one click to review/approve/request-changes.
3. PER-APPLICANT CONCIERGE VIEW: the scoped case detail — progress bar, requirement/document list with review controls (concierge-safe items), item-anchored notes, the engagement chat, sessions/training, and a NEXT-STEPS panel.
4. NEXT-STEP GUIDANCE ENGINE: compute and show, per case, the concrete next action:
     - "Waiting on the applicant: proof of residence, 2 references." (what's outstanding)
     - "3 items need your review." (their action)
     - When everything concierge-safe is submitted + approved: "You're all set on your end — hand off to Gun License NYC for final QA and filing prep." (the admin backstop hand-off), plus a button that flags the case ready-for-final-QA to admin.
   Drive this from the requirement/status engine so it's always accurate, never hardcoded.
5. Keep the existing dark instrument design; make the dashboard genuinely usable at volume (a trainer with 20 cases should see at a glance who needs what).
```

---

## PHASE 6 — Admin backstop & hand-off

```
- The trainer's approvals surface in the admin case view (app/admin/cases/[id]): each concierge-safe item shows "trainer-approved" + reviewer + timestamp, feeding the admin's QA picture. The QaGateCard shows trainer-review completeness alongside the existing blocking-requirements gate.
- The "ready for final QA" flag from Phase 5 creates an admin task / surfaces the case in the admin queue.
- FINAL AUTHORITY unchanged: lib/qa-gate.ts + signPreFilingQa remain the gate to application_assembled/filed, with named staff sign-off. Trainer approval is a strong signal, NOT a bypass. Sensitive disclosures are reviewed by admin (+ attorney seam) as today.
- Confirm the applicant still files their own application; nothing here files for them.
```

---

## PHASE 7 — Deep completeness review: is what we collect enough to file?

```
Audit the requirements registry (supabase seed_requirements) against the OFFICIAL NYPD License Division required-documents checklist (licensing.nypdonline.org/app-instruction/requireddocs) and current NYC carry rules. For EACH official requirement, confirm we collect it; list any GAPS and propose registry additions (new dated requirement rows — never edit shipped ones). Check especially:
- Business/non-resident track extras (proof of business, letter of necessity/need for carry where applicable), spousal/partner notification, name-change, veteran (DD-214), certificate of good conduct for <7yr LPRs, gun-safe photos, passport-photo count/spec, lifetime driving abstract per state, social-media 3-year list, fees + receipts.
- Track- and renewal-aware differences (carry vs premises vs special; renewal reference exemption).
Deliver a coverage table: official requirement → our req_code (or GAP → proposed addition). Cite the agency; invent nothing. Any additions flow through the same generate/obtain/attest engine + the trainer review flow.
```

---

## PHASE 8 — Verify (adversarial)

```
1) RLS (ACCEPTANCE GATE): negative tests prove an engaged trainer of ANY tier cannot read a single disclosure/arrest/OOP/DIR/mental-health row or document, the disclosures table, case_notes, or the staff message thread; a non-engaged trainer sees nothing; unclassified items are hidden by default. Show the harness output.
2) PRACTICE OF LAW: the trainer's review UI/copy is completeness/format only — no legal-sufficiency judgement on disclosures; disclosure items show as "handled by Gun License NYC"; the attorney seam is intact.
3) STATUS MODEL: pending→submitted→approved + changes_requested behaves correctly across uploads, generated letters, and requirements; a revision notifies the applicant on the exact item and clears on resubmit; approved shows to the applicant.
4) DASHBOARD: multi-case overview shows accurate progress + "needs your review" counts; the next-step engine names the true outstanding items and produces the admin hand-off when done.
5) BACKSTOP: trainer approvals feed admin QA but never bypass signPreFilingQa/qa-gate; application_assembled/filed still require admin sign-off; applicant still files their own app.
6) COMPLETENESS: the coverage table lists every official requirement mapped or flagged; proposed additions are dated migrations.
7) IDENTITY: a trainer sees the applicant's name/contact only for their own active engagements, never otherwise.
8) pnpm build && pnpm test && verify-* pass.
Deliver: the RLS negative-test output, before/after of the trainer dashboard + per-applicant view, the applicant status ladder, the admin backstop view, and the completeness coverage table.
```

---

### Notes for you (not for Claude Code)
- **Phase 2 is the whole ballgame.** Everything else is UI; the RLS is what protects you legally. The negative tests (a trainer literally cannot select a disclosure row) are the acceptance gate — don't ship without them green.
- **Why disclosures stay out even for your own staff-tier trainers (for now):** a third-party trainer reviewing someone's arrest record is the clearest practice-of-law / privacy hazard, and since your network is a *mix*, the safe default treats all trainers the same. I left a `trust_tier` hook so you can later grant staff-tier a disclosure *summary* deliberately — but it ships off.
- **The admin backstop is a feature, not overhead.** It's what lets you onboard third-party trainers without betting your NYPD-facing compliance on each one. If a trainer approves an incomplete case, your QA gate still catches it before anything's filed.
- **"Get everything submitted for them" — one word matters:** we prepare, review, and hand off, but the applicant submits. Keeping that line bright is exactly what keeps you on the right side of NYPD's rule that consulting firms can't file or represent.
- **Phase 7 is worth reading closely** — it's the honest answer to "do we collect enough?" It maps our registry to NYPD's official list and flags gaps before a trainer ever tells an applicant they're "done."
