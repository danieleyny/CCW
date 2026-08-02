# Gun License NYC — Admin ↔ Trainer flow & visibility upgrade
### Findings + plan + Claude Code prompt

An index review of the admin and instructor surfaces found the foundations are solid (admin intake view exists; trainer can review/approve requirements, message the applicant, run bookings; early stages auto-advance). The remaining problems are **two data bugs** and a set of **interaction/visibility gaps** where the two roles can't see or control what they need. This prompt fixes them, mapped to the exact files.

**Guardrails (AGENTS.md — hold the line):**
- Privacy firewall stays absolute: instructors NEVER see disclosures, case notes, tasks, intake answers, or applicant PII beyond the active-engagement first name + contact. Any NEW admin↔instructor channel must not leak applicant disclosures to the instructor. Prove with RLS negative tests.
- The CP-5 QA gate + named sign-off remain the ONLY path to `application_assembled`/`filed`; the auto-advance ceiling (`notarization`) stays. Nothing here bypasses it.
- Applicant choice of instructor is the default model — admin gains an *assist/override* lever, logged, not a silent takeover. No guarantee/expedite; no fabricated data. `pnpm build` + `pnpm test` + `verify-*` pass after each phase.

---

## PHASE 1 — Fix the two data bugs (do first)

### 1A. Trainer approval leaves `documents.status='pending'` (desyncs admin's doc queue)
```
PROBLEM: trainer_review_requirement (supabase/migrations/20260718001700_trainer_reviews.sql) sets
case_requirements.status='satisfied' but never updates the linked documents.status. So a document the trainer already
cleared still shows as "pending" in the admin Today "Docs to review" count and the Documents tab.
FIX: when a trainer approval satisfies a requirement that has a linked document_id, also move that document to a
reviewed state (e.g. 'approved' with a note "approved via trainer review by <instructor>"), and reverse it on
changes_requested. Do it in the RPC (preferred) or reconcile in app/admin/actions.ts:reviewDocument-adjacent logic.
Keep the audit trail (who/when). Verify the admin doc count and Documents tab reflect trainer-cleared docs.
```

### 1B. Instructor↔applicant messages leak into the admin client thread but not the unread badge
```
PROBLEM: the admin case-detail message thread queries messages .eq("case_id", id) with NO engagement filter, so
staff see instructor↔applicant messages mixed into the staff↔client thread; meanwhile the Inbox unread badge only
counts role==="client" senders, so those same messages never drive unread. Inconsistent and confusing.
FIX: segment the lanes in the admin case view (app/admin/cases/[id]/page.tsx): show the STAFF↔CLIENT thread
(engagement_id IS NULL) as the primary Messages tab, and surface the instructor↔applicant lane separately (clearly
labeled "Applicant ↔ instructor") — read-only for staff or with its own reply, your call. Fix the Inbox unread logic
(app/admin/inbox/page.tsx) so it's consistent with what the badge claims to count. Don't merge the lanes.
```

---

## PHASE 2 — Give each role the visibility they're missing

### 2A. Instructor dashboard: land on WORK, not setup
```
PROBLEM (biggest instructor UX gap): /instructor/page.tsx shows only profile/verification/onboarding. An instructor
with a full caseload lands on a setup screen — their actual work (cases + "needs your review") lives on
/instructor/cases and /instructor/performance.
FIX: rebuild app/instructor/page.tsx to lead with the book of business — reuse getTrainerCases + totalToReview (already
built): a "Needs your review (N)" queue at the top linking into the items, an active-cases summary with per-case
progress bars, upcoming confirmed sessions, then the profile-completeness / verification card DEMOTED below (still
shown while incomplete, since it gates go-live). Keep the onboarding banner only when incomplete. Mobile-first.
```

### 2B. Admin instructor management: beyond verify-only
```
PROBLEM: /admin/instructors is verify/un-verify ONLY. No detail view, no visibility into an instructor's availability,
bookings, payouts, performance, or profile.
FIX: add an instructor DETAIL route (app/admin/instructors/[id]) showing profile, DCJS/verification, service area,
availability, active engagements/bookings, payout status, and performance (reuse the instructor's own performance
query). Admin can verify/un-verify and correct/flag a profile from here. Read-heavy; no new instructor-side exposure.
```

---

## PHASE 3 — Let admin and trainer actually interact & hand off

### 3A. Admin can engage/assign an instructor + manage bookings (the missing lever)
```
PROBLEM: engagements are 100% applicant-driven (marketplace). If an applicant never picks a trainer, admin has NO
lever — can't assign, invite, confirm, or cancel from the admin side. The case-detail Training tab is read-only.
FIX (assist/override, logged — not a silent takeover):
- From the admin case Training tab, let staff INVITE a specific verified instructor to a case, or (when the applicant
  is stuck) CREATE an engagement on the applicant's behalf — clearly logged via logActivity as an admin assist, and
  surfaced to the applicant ("your consultant matched you with …"). Add the server action in app/admin/actions.ts.
- Let admin CONFIRM/CANCEL a booking and see the training record from the admin side (mirror confirmBooking/
  cancelBooking with admin auth). Keep maybeAdvanceStage wiring intact so stage still moves.
- Respect the model: default remains applicant choice; this is an assist for stuck cases. Don't remove the applicant's
  ability to choose.
```

### 3B. Admin ↔ instructor message lane
```
PROBLEM: staff can message the CLIENT (postMessage) and the client can message the INSTRUCTOR (sendEngagementMessage),
but there is NO staff↔instructor channel. Staff can't reach the assigned trainer at all.
FIX: add a STAFF↔INSTRUCTOR lane keyed to the engagement (a distinct sender/recipient scoping), a thread on the admin
case Training tab and on the instructor's case detail. CRITICAL: this lane carries NO applicant disclosures/PII beyond
what the instructor may already see; it's a staff-to-trainer coordination channel. RLS: instructor sees only their own
engagements' staff lane; never other cases. Negative test it.
```

### 3C. Auto-advance shouldn't be silent
```
PROBLEM: maybeAdvanceStage (lib/cases/advance.ts) moves early stages off milestones but emits NO staff notification/
task and does NOT email the applicant (only manual setCaseStage notifies). So an auto-advance is invisible except the
stage bar.
FIX: on a meaningful auto-advance (e.g. training_complete, signed_up_paid), create a staff notification/activity nudge
(so admin learns without hunting) and decide + implement whether the applicant gets a friendly "you've reached X"
notification. Keep it idempotent (respect the existing reminder_log/idempotency) — no duplicate nags.
```

---

## PHASE 4 — Polish the bare spots
```
- app/admin/page.tsx: the "Docs to review" stat card links to /admin (itself). Point it at a real pending-documents
  queue — either a filtered cases/documents view or a small dedicated page — so the count is actionable.
- app/admin/calendar/page.tsx: it's read-only and self-labeled "full calendar comes in a later phase." At minimum make
  the agenda useful (filter by upcoming/instructor/case, link each appointment to its case); a full scheduler is
  optional/out of scope unless quick.
- Add the un-linked-but-real routes to nav where sensible (or leave intentional ones as deep links) — /admin/clients/new
  and /admin/reports/coverage are reachable via buttons/banners, which is fine; just confirm nothing useful is orphaned.
```

---

## PHASE 5 — Verify (adversarial)
```
1) PRIVACY: RLS negative tests — an instructor still cannot read any disclosure, case note, task, intake answer, or
   another case's data; the new staff↔instructor lane exposes NO applicant disclosures to the instructor and is scoped
   to their own engagements only.
2) DATA SYNC: trainer-approving a requirement with a linked document flips that document out of "pending" everywhere
   (admin Today count, Documents tab); changes_requested reverses it.
3) MESSAGING: staff↔client, client↔instructor, and staff↔instructor are three DISTINCT lanes; none leak into another;
   the Inbox unread badge counts what it claims to.
4) ADMIN LEVER: admin can invite/assign an instructor and confirm/cancel a booking; every such action is logged as an
   admin assist; stage auto-advance still fires; the QA gate + sign-off still the only path to filed.
5) INSTRUCTOR DASH: /instructor lands on the review queue + book of business; setup demoted; upcoming sessions shown.
6) NOTIFICATIONS: auto-advance now produces a staff nudge (and the chosen applicant notification), idempotently.
7) pnpm build && pnpm test && verify-* pass; mobile-first at 390px on the changed screens.
Deliver: before/after screenshots of the instructor dashboard, the admin Training tab (with the new lever + staff↔
instructor lane), and the RLS negative-test output.
```

---

### Notes for you (not for Claude Code)
- **Two of these are bugs, not features** (Phase 1): the doc-status desync and the message-lane leak are why things looked inconsistent between the two roles. Fix them first — they're cheap and they clean up a lot of the "why can't they see/control this" confusion.
- **The single biggest experience win** is Phase 2A — the instructor dashboard. The data already exists; it's just landing them on the wrong page. Small change, big daily impact for trainers running volume.
- **Phase 3A is a deliberate model decision:** today the applicant must pick a trainer with no admin fallback. I've scoped the admin lever as a *logged assist for stuck cases*, not a takeover, so it doesn't undercut the marketplace design or the compliance posture. If you'd rather admin have full assignment power, say so and we widen it.
- Everything here holds the privacy firewall and the QA gate exactly as-is — the review confirmed both are working and worth protecting.
