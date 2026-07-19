# Gun License NYC — master upgrade build
### Solutions + execution plans + Claude Code prompt for the approved audit items

This executes the 14 approved items from APPLICATION_PROCESS_AUDIT.md. It's sequenced **P0 (compliance) → P1 (leverage) → P2 (value)**. **Run one PART at a time, review, then continue** — do NOT run all three parts in one session; P0 especially must land and be verified before anything builds on it.

**Global guardrails (AGENTS.md + our decisions — every phase):**
- The applicant always files their own application; we prepare/review/hand-off, never submit or represent. No guarantee / expedite / fast-track / insider / approval-rate; no implied NYPD endorsement.
- Candor-maximizing (disclose sealed/dismissed); never suggest omitting. No legal advice — interpretation of a specific record routes to the attorney-referral seam; rules carry provenance + `needs_legal_review` + `/admin/legal` sign-off before client-facing use.
- Privacy firewall: trainers (any `trust_tier`) never see disclosure content; sensitive PII protected by RLS with negative tests. Gun License NYC admin keeps the final pre-filing QA gate + named sign-off.
- Next.js 16 (read node_modules/next/dist/docs/ first); migrations are new dated files, never edit shipped ones; run db:reset→seed→db:types after schema changes. `pnpm build` + `pnpm test` + `verify-*` pass after every phase. Invent no stats/citations/outcomes.
- **Two items need attorney input, not just code (marked ⚖):** the online-notarization provider's NY validity, and data-retention obligations. Build them behind flags / as configurable, and surface the legal question — don't hard-code a legal assumption.

Already drafted separately (do NOT rebuild — sequence around them): portal fixes, document engine, PDF/signing polish, fee-readiness hub, instructor profiles, trainer-concierge, copy voice, SEO/GEO.

---

# PART A — P0: compliance-critical (run first, in order)

## Phase 1 — Per-requirement legal status + SOC-01 fix + review cadence
```
SOLUTION: track each requirement's live enforcement status so we never require something a court has struck down, and surface it for attorney oversight.
EXECUTE:
1. Migration: add to `requirements` (versioned) — legal_status enum ('enforced' | 'enjoined_not_enforced' | 'contested' | 'repealed'), legal_status_note text, legal_citation text, legal_reviewed_at timestamptz, legal_reviewed_by uuid. Default 'enforced'. db:types after.
2. Behaviour: a requirement whose status is 'enjoined_not_enforced' or 'repealed' is NON-BLOCKING and hidden-or-optional in the applicant checklist, shown (if surfaced) as "Not currently required — under court order/injunction ({citation})". The QA gate must NOT block on it. 'contested' stays enforced but flagged for admin awareness.
3. IMMEDIATE: set SOC-01 (three-year social-media list) → 'enjoined_not_enforced' with the Antonyuk citation; make it optional/non-blocking everywhere (checklist, QA gate, packet). (This provision was ruled unconstitutional and is not being enforced.)
4. /admin/legal: add a legal-status column + inline editor (attorney sets status/note/citation, stamps reviewed_at/by); a "review is stale" banner when legal_reviewed_at > 90 days; require attorney sign-off before a status change affects client-facing behaviour.
5. Cadence: create a recurring "Quarterly requirement legal review" admin task (existing task/reminder system) listing every requirement + its last-reviewed date.
GUARDRAIL: we track ENFORCEMENT status with citations/provenance — we do not give legal advice; the attorney owns status changes. Cite the case; never invent one.
DONE WHEN: SOC-01 no longer blocks filing and reads as not-currently-required; /admin/legal shows/edits status with a stale-review banner; the quarterly task exists.
```

## Phase 2 — Field-by-field application coverage matrix
```
SOLUTION: prove we capture every field the official application asks — not just the supporting documents — so no case reaches "done" with a portal field we never collected.
EXECUTE:
1. Build a machine-readable coverage map (config/application-coverage.ts): each official NYPD handgun-license application field/question (PD 643-041, Q1–28 and the identity/residence/employment/physical-description/prior-address sections) → the intake field OR requirement that captures it, OR marked GAP.
   Source the field list from the official NYPD instructions/portal (licensing.nypdonline.org). Do NOT fabricate fields; where a field can't be verified, mark it "verify" and flag for admin/attorney, don't guess.
2. Add any missing intake fields the map reveals (likely: full 5-year address history incl. in-state moves, employment history, physical description, vehicle info if the form asks). Extend lib/intake/schema + the wizard; pre-fill downstream.
3. The application worksheet (from the document engine) RENDERS from this map, so it always mirrors the live form and copies into the portal in order.
4. Admin coverage report: a /admin view (or a generated report) showing official field → captured? → source, with any GAPs highlighted. This feeds the final-QA checklist.
GUARDRAIL: the map is the source of truth for "enough to file"; keep it attorney-reviewable; cite the official instructions.
DONE WHEN: every official field maps to a capture point or an explicit, flagged GAP; the worksheet renders from the map; admin can see the coverage report.
```

## Phase 3 — ⚖ Data retention, encryption & privacy
```
SOLUTION: make our handling of sensitive PII (arrests, mental-health, OOP, identifiers) defensible.
EXECUTE:
1. Inventory: list every column/document holding sensitive PII; confirm encryption at rest (Supabase storage is encrypted; for the most sensitive free-text fields consider pgcrypto/column encryption — evaluate, don't over-engineer).
2. Retention policy (CONFIGURABLE, not hard-coded): a documented, admin-configurable retention window (e.g. purge/anonymize sensitive data N years after case closure or on verified request), implemented as a scheduled job that is OFF by default until legal confirms the window. ⚖ Retention obligations vary and may include minimums — surface this as a decision for counsel; do not auto-delete anything until confirmed.
3. Data-deletion / access request flow: a way for an applicant to request export or deletion of their data, routed to admin, with an audit log.
4. Confirm RLS: re-run negative tests proving trainers can't read disclosures and cross-tenant reads fail. Add a written data-flow note.
5. Draft/refresh the public privacy policy to match actual practice (what we collect, why, retention, sharing = none to instructors for sensitive data, applicant rights).
GUARDRAIL: ⚖ flag retention windows + deletion timing for counsel; ship the mechanism configurable + off-by-default; never prematurely delete records with legal hold/retention minimums.
DONE WHEN: PII inventory + encryption confirmed; configurable retention job exists (off until legal sets the window); deletion-request flow works; RLS negatives green; privacy policy updated.
```

---

# PART B — P1: highest leverage (run after P0 is verified)

## Phase 4 — One-click filing pack
```
SOLUTION: turn the final submission from a scavenger hunt into copy-and-go, without us filing.
EXECUTE: extend lib/packet/assemble.ts to produce a single "Filing pack" containing:
  (a) the assembled, NYPD-ordered combined PDF of all documents (exists — keep);
  (b) a PORTAL-ENTRY WORKSHEET rendering from the Phase-2 coverage map, in the online application's question order, with the applicant's captured answers — so they type/paste into licensing.nypdonline.org quickly;
  (c) an UPLOAD GUIDE: for each document, plain "upload this file in the portal's X section" instructions.
Expose "Download filing pack" to admin AND to the applicant (they file). Bundle as one guided PDF (preferred) or a zip. Label everything "prepared by Gun License NYC — you submit your own application."
GUARDRAIL: no auto-submission, no NYPD credentials, applicant files. DONE WHEN: a QA-passed case produces a filing pack that a person can file from end-to-end without leaving to figure anything out.
```

## Phase 5 — ⚖ On-platform online notarization
```
SOLUTION: kill the biggest "leave the platform" errand — notarizing references, cohabitant affidavits, and sole-occupancy.
EXECUTE:
1. ⚖ Choose a NEW-YORK-VALID Remote Online Notarization (RON) provider (e.g. Proof/Notarize or another NY-authorized RON vendor). Confirm NY legal validity for these document types BEFORE building — NY permits electronic/remote notarization under specific rules; verify the provider meets them. Surface this as the gating legal question.
2. Behind a feature flag: generate the document → hand off to a RON session (provider API/redirect) → receive the notarized, sealed document back → auto-attach to the case + mark the requirement satisfied (the "notarized upload" step becomes automatic).
3. Keep the existing download → notarize-offline → upload path as the FALLBACK (and the default until the provider is confirmed live).
GUARDRAIL: ⚖ do not claim a document is notarized unless a valid NY notarization occurred; keep the offline fallback; store the provider's notarization evidence. DONE WHEN: an applicant can complete a notarized requirement without leaving the platform (flagged on), with a working offline fallback (flagged off).
```

## Phase 6 — QA-gate cockpit + admin queue views
```
SOLUTION: let admin work a queue instead of opening cases one by one.
EXECUTE: an /admin dashboard driven by evaluatePreFilingGate() across all cases:
  - "Near ready" list: cases close to filing with EXACTLY what's blocking each (the gate blockers), sorted by fewest blockers.
  - Queue tabs: Awaiting applicant · Awaiting trainer review · Ready for final QA · Filed / awaiting decision.
  - From a row: jump to the case, sign off (existing signPreFilingQa), or nudge.
Reuse the QA gate logic unchanged — this is a VIEW + navigation layer.
GUARDRAIL: gate logic + sign-off unchanged. DONE WHEN: admin sees, in one screen, every near-ready case and its blockers, and can action from the queue.
```

## Phase 7 — Live timeline / status tracker + milestone reminders
```
SOLUTION: reduce applicant anxiety + support load with a "package tracker" for the application.
EXECUTE:
1. Applicant-facing TIMELINE: the stages as a visual track (from the stage engine, incl. the auto-advance work), each with plain-language state, what's next, and a realistic ETA framed as TYPICAL ("about six months once filed — set by NYPD, not us"). Clearly mark the parts outside anyone's control.
2. MILESTONE REMINDERS via lib/reminders/engine.ts (idempotent): training-cert 6-month expiry clock, references outstanding, fingerprint appointment, fee readiness, interview date. In-app + email where enabled.
GUARDRAIL: ETAs are typical, never promised; no expedite language. DONE WHEN: the applicant always sees where they are, what's next, and gets timely nudges without duplicate nags.
```

## Phase 8 — Trainer templated messaging + bulk review + performance view
```
SOLUTION: give a trainer running many cases real leverage (extends the trainer-concierge build).
EXECUTE:
1. Saved-reply TEMPLATES in the trainer↔applicant chat (common asks: "please re-upload clearer", "book your range session", etc.), editable per trainer.
2. BULK actions in the "needs your review" queue (approve / request-changes across multiple concierge-safe items at once).
3. Trainer PERFORMANCE view: active cases, avg time-to-approve, completion rate — real data only, NO fabricated or outcome/approval-rate claims.
GUARDRAIL: concierge-safe items only (no disclosures); no outcome claims. DONE WHEN: a trainer can clear their review queue fast and see honest metrics on their book of business.
```

---

# PART C — P2: strong value (run last, pick per appetite)

## Phase 9 — Interview-prep module
```
SOLUTION: prepare applicants for the One Police Plaza interview, honestly.
EXECUTE: a portal module — what the interview involves, what to bring, appointment guidance, and honest practice questions. Content-driven, reassuring, retail-simple.
GUARDRAIL: prep, NOT coaching to mislead; candor intact; no guarantee. DONE WHEN: an applicant can walk in knowing what to expect.
```

## Phase 10 — Renewal lifecycle automation
```
SOLUTION: retention + recurring revenue via renewals.
EXECUTE: track license issue/expiry; remind before expiry (reminders engine); one-click re-open a RENEWAL case (RNW track exists — reference-exempt, 2-hr live-fire within 6 months); render the renewal-specific requirement delta.
GUARDRAIL: renewal requirements are their own versioned rows; no expedite. DONE WHEN: an expiring licensee is reminded and can start a renewal in one click.
```

## Phase 11 — Multilingual support (phase it)
```
SOLUTION: NYC is highly multilingual — meet applicants in their language, and match to instructor `languages`.
EXECUTE: add an i18n framework (e.g. next-intl) to the portal + marketing; externalize strings; ship top NYC languages first (Spanish, Chinese, then others). Use instructor `languages` for match/display. This is a large lift — deliver the framework + one additional language first, then expand.
GUARDRAIL: legal disclaimers + candor copy must be accurately translated (attorney/native review for legal-bearing text). DONE WHEN: the portal works end-to-end in at least one additional language, framework ready for more.
```

## Phase 12 — AI factual-narrative assistant for disclosures (guardrailed, compliance-sensitive)
```
SOLUTION: help applicants write a clear, FACTUAL written explanation from THEIR OWN stated facts — the single most-stuck step — without crossing into legal advice.
EXECUTE: an assistant that takes the applicant's own inputs (date, court, charge, disposition, what happened, outcome) and organizes them into a clear, complete, candor-maximizing narrative draft the applicant edits and owns. Hard rules: never suggests omitting/minimizing anything; never advises legal strategy or "what will help you get approved"; routes any specific-record interpretation to the attorney seam; sets needs_legal_review; a human (admin/attorney) reviews before it's used. Disclosures stay admin/attorney-scoped (NOT trainer-visible).
GUARDRAIL: this is the highest legal-risk feature — it ORGANIZES the applicant's facts, it does not advise. Ship behind a flag with the attorney-seam and review step mandatory. DONE WHEN: an applicant gets a factual draft from their own facts, clearly labelled as their statement, with legal interpretation routed out.
```

## Phase 13 — Trainer onboarding / quality certification
```
SOLUTION: keep brand quality as the (mixed) trainer network scales.
EXECUTE: a required onboarding checklist/short quiz before a trainer goes live — platform rules, the privacy firewall (what they can/can't see), candor + no-legal-advice, and the applicant-files-their-own-app rule. Gate go-live on completion + admin verification + trust_tier.
GUARDRAIL: ties into the existing verification gate. DONE WHEN: no trainer reaches applicants without completing onboarding + verification.
```

## Phase 14 — Denial / appeal support module polish
```
SOLUTION: make a denial recoverable and reassuring (the appeal flow exists at /portal/appeal).
EXECUTE: polish it — plain-language administrative-review window guidance, a one-click EXPORT of the complete case file for an attorney, the attorney hand-off seam, and warm, candor-safe copy ("a denial isn't the end; here's the path, and only you or a licensed attorney can pursue it").
GUARDRAIL: we don't pursue the appeal or represent; attorney hand-off only; no outcome promises. DONE WHEN: a denied applicant has a clear path + an exportable file for counsel.
```

---

# FINAL — verification (run after each PART, and once at the end)
```
As a hostile reviewer, confirm across everything built:
1) COMPLIANCE: SOC-01 (and any enjoined rule) does not block filing and reads as not-currently-required; legal-status editable with attorney sign-off + stale-review banner; coverage matrix maps every official field or flags a GAP; retention job is configurable + off until legal sets it; privacy policy matches practice.
2) FIREWALL/RLS: negative tests prove trainers still can't read disclosures; the AI narrative assistant and filing pack never expose disclosures to trainers.
3) FILING: the filing pack lets a person file end-to-end; nothing auto-submits; applicant files their own app; notarization only claims real NY notarizations (else offline fallback).
4) NO OVERCLAIM: grep for guarantee/expedite/fast-track/insider/approval-rate/"we file"/"endorsed" and outcome/rate stats in all new copy — zero; performance/metrics use real data only.
5) INTEGRITY: QA gate + named sign-off remain the only path to application_assembled/filed; auto-advance never bypasses it.
6) BUILD: pnpm build && pnpm test && verify-* pass; mobile-first at 390px; migrations follow conventions.
Deliver: the coverage report, the RLS negative-test output, the legal-status admin view, a sample filing pack, and an honest list of anything left — especially the two ⚖ items awaiting counsel (RON validity, retention window).
```

---

### Notes for you (not for Claude Code)
- **Run PART A alone first.** The legal-status + coverage + retention work is the foundation everything else leans on, and #1 (SOC-01) is the one with real current exposure — a court struck that provision and it isn't enforced, so requiring it is a liability worth removing this week.
- **Two things are your attorney's call, not Claude Code's** (marked ⚖): whether your chosen online-notarization provider is valid in NY for these documents, and what your data-retention window must be. The prompt builds both as configurable/flagged so nothing legal ships on a guess — but you need counsel to set them.
- **Phase 12 (AI disclosure helper) is the highest-reward/highest-risk item.** Built correctly it removes the single most painful step for applicants; built loosely it's practice of law. It's guardrailed to *organize the applicant's own facts*, never advise — keep it that way, behind a flag, with human review.
- **Sequencing the whole thing:** PART A (compliance) → Phase 4 + 5 (filing pack + notarization: the two biggest friction cuts) → Phase 6/7/8 (admin + applicant + trainer leverage) → PART C as appetite allows.
