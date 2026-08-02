# Gun License NYC — combined build: auth fixes + admin↔trainer flow
### One Claude Code prompt. Run PART A first, then PART B.

This merges two efforts: (A) authentication fixes — real logout, switch/add account, forgot password; and (B) an admin↔trainer flow & visibility upgrade from an index review of both surfaces. **Do PART A first** — you need clean logout/login to move between the applicant, trainer, and admin accounts while testing PART B.

**Global guardrails (AGENTS.md — hold the line for the whole build):**
- Privacy firewall stays absolute: instructors NEVER see disclosures, case notes, tasks, intake answers, or applicant PII beyond the active-engagement first name + contact. Any new admin↔instructor channel must not leak applicant disclosures. Prove with RLS negative tests.
- The CP-5 QA gate + named sign-off remain the ONLY path to `application_assembled`/`filed`; the auto-advance ceiling (`notarization`) stays. Nothing here bypasses it.
- Applicant choice of instructor is the default model — admin gains a *logged assist/override* lever, not a silent takeover.
- Security on auth: neutral reset messaging (never reveal whether an email exists); reset links single-use + short-lived. Keep the auto-login convenience — the only change is that a real logout truly logs out.
- No guarantee/expedite; no fabricated data. `pnpm build` + `pnpm test` + `verify-*` pass after each PART.

---

# PART A — AUTH FIXES (do first)

## A1 — Make logout truly end the session (the core glitch)
```
BUG: signOut() (app/auth/actions.ts) calls supabase.auth.signOut() then redirect("/auth/login"), but the auth cookies
aren't reliably cleared before the redirect. So the proxy (proxy.ts) still sees a signed-in user and — per its rule
"signed-in users on /auth/login → /dashboard" — bounces them straight back in. Result: click logout, click login,
auto-logged into the same account.
FIX:
1. await supabase.auth.signOut() — ensure the SSR cookie handler deletes ALL Supabase auth cookies, including the
   chunked ones (sb-<ref>-auth-token, .0, .1, refresh token). If the adapter doesn't remove them on signOut, explicitly
   delete every cookie whose name starts with "sb-" via next/headers cookies() in the server action.
2. revalidatePath("/", "layout") THEN redirect("/auth/login?loggedout=1"). Clear cookies BEFORE the redirect throws so
   the Set-Cookie deletions flush.
Do it once in signOut so every logout button benefits (components/admin/topbar.tsx, app/portal/layout.tsx, instructor
layout). After this, visiting /auth/login post-logout shows the FORM, not a bounce. Add a comment in proxy.ts that its
"signed-in → /dashboard" bounce is intentional (the auto-login convenience) — the bug was logout, not the proxy.
```

## A2 — Allow switching / adding a different account
```
1. On the login + sign-up pages, when the visitor IS already signed in (or arrives via a "switch account" link), show a
   clear "You're signed in as <email> — Continue" AND a "Use a different account" option that calls signOut() then lands
   on the fresh login/sign-up form.
2. Implement "Use a different account" as a small server action (sign out → redirect to /auth/login or /auth/sign-up),
   not via the proxy bounce. Add a "Switch account / Sign in as someone else" link in each nav account menu (admin
   topbar, portal, instructor) next to Sign out.
3. Keep the proxy bounce for normal navigation (a signed-in user hitting /auth/login by accident still goes to their
   dashboard) — the switch path explicitly signs out first, so it reaches the form cleanly.
```

## A3 — Forgot-password + reset flow
```
1. LINK "Forgot your password?" on app/auth/login/page.tsx → /auth/forgot-password.
2. /auth/forgot-password (new page + action): email field → supabase.auth.resetPasswordForEmail(email, { redirectTo:
   `${siteUrl}/auth/reset-password` }). ALWAYS show the same neutral success ("If an account exists for that email,
   we've sent a reset link") regardless of existence — no account-existence leak.
3. /auth/reset-password (new page + action): the recovery link lands here with a Supabase recovery session; show a
   "set a new password" form (password + confirm, same strength rules as signup) → supabase.auth.updateUser({ password }).
   On success sign in / redirect to /dashboard. Handle expired/invalid link gracefully with a "request a new link" path.
4. Add /auth/forgot-password + /auth/reset-password to proxy allowances (reachable while signed OUT and while carrying a
   recovery token). Match the existing auth page design (app/auth/layout.tsx + login/sign-up card styling).
5. CONFIG NOTE (owner action, don't hardcode around it): the reset email is sent by Supabase Auth — `${siteUrl}/auth/
   reset-password` must be in the Supabase Auth "Redirect URLs" allowlist, and Auth email sending must be configured
   (Supabase SMTP or Resend). Optionally set the branded Supabase "Reset password" email template. (Note: the earlier
   disabling of signup email confirmation does NOT affect password-reset emails — those are separate and must work.)
```

## PART A verify
```
- LOGOUT: sign in → Sign out → land on /auth/login showing the FORM (not bounced); no sb-* auth cookies remain; clicking
  Sign in does NOT auto-log you in. Test admin, portal, instructor.
- SWITCH: while signed in, "Use a different account" reaches a clean form; signing into account B works; A's session gone.
- FORGOT PASSWORD: reset for a real account → email → /auth/reset-password → set new password → sign in with it; old
  password fails; expired link shows graceful retry; non-existent email shows the same neutral success.
- Proxy still auto-routes a genuinely signed-in user from /auth/login → dashboard.
```

---

# PART B — ADMIN ↔ TRAINER FLOW & VISIBILITY

_Index review found the foundations solid (admin intake view exists; trainer can review/approve requirements, message the applicant, run bookings; early stages auto-advance). The remaining problems are two data bugs and a set of interaction/visibility gaps._

## B1 — Fix two data bugs (do first within PART B)
```
1A. TRAINER APPROVAL DESYNCS THE DOC QUEUE: trainer_review_requirement (supabase/migrations/20260718001700_
    trainer_reviews.sql) sets case_requirements.status='satisfied' but never updates the linked documents.status, so a
    doc the trainer already cleared still shows "pending" in admin's Today "Docs to review" count + Documents tab. FIX:
    when a trainer approval satisfies a requirement with a linked document_id, also move that document to a reviewed
    state (e.g. 'approved', note "approved via trainer review by <instructor>"), reversed on changes_requested. Do it in
    the RPC (preferred) or reconcile in app/admin/actions.ts. Keep the audit trail. Verify admin counts + Documents tab.
1B. MESSAGE-LANE LEAK: the admin case-detail thread queries messages .eq("case_id", id) with NO engagement filter, so
    staff see instructor↔applicant messages mixed into the staff↔client thread; the Inbox unread badge only counts
    role==="client", so those never drive unread. FIX: in app/admin/cases/[id]/page.tsx show the STAFF↔CLIENT thread
    (engagement_id IS NULL) as the primary Messages tab and surface the instructor↔applicant lane separately (clearly
    labeled). Fix app/admin/inbox/page.tsx unread logic to be consistent. Don't merge the lanes.
```

## B2 — Give each role the visibility they're missing
```
2A. INSTRUCTOR DASHBOARD LANDS ON WORK, NOT SETUP: /instructor/page.tsx shows only profile/verification/onboarding; an
    instructor with a caseload lands on a setup screen. Rebuild app/instructor/page.tsx to LEAD with the book of
    business — reuse getTrainerCases + totalToReview: a "Needs your review (N)" queue at top linking into items, an
    active-cases summary with per-case progress bars, upcoming confirmed sessions, then DEMOTE the profile-completeness /
    verification card below (kept while incomplete, since it gates go-live). Onboarding banner only when incomplete.
2B. ADMIN INSTRUCTOR MANAGEMENT BEYOND VERIFY-ONLY: /admin/instructors is verify/un-verify only. Add an instructor
    DETAIL route (app/admin/instructors/[id]) showing profile, DCJS/verification, service area, availability, active
    engagements/bookings, payout status, and performance (reuse the instructor's own performance query). Admin can
    verify/un-verify and correct/flag a profile here. Read-heavy; no new instructor-side exposure.
```

## B3 — Let admin and trainer actually interact & hand off
```
3A. ADMIN CAN ENGAGE/ASSIST + MANAGE BOOKINGS: today engagements are 100% applicant-driven — if an applicant never
    picks a trainer, admin has NO lever. From the admin case Training tab, let staff INVITE a specific verified
    instructor, or (when the applicant is stuck) CREATE an engagement on the applicant's behalf — clearly logged via
    logActivity as an admin assist and surfaced to the applicant. Let admin CONFIRM/CANCEL a booking and see the
    training record from the admin side (mirror confirmBooking/cancelBooking with admin auth; keep maybeAdvanceStage
    wiring). Default remains applicant choice; this is an assist for stuck cases (server action in app/admin/actions.ts).
3B. ADMIN ↔ INSTRUCTOR MESSAGE LANE: staff can message the CLIENT and the client can message the INSTRUCTOR, but there
    is NO staff↔instructor channel. Add a staff↔instructor lane keyed to the engagement, with a thread on the admin case
    Training tab and on the instructor's case detail. CRITICAL: this lane carries NO applicant disclosures/PII beyond
    what the instructor may already see. RLS: instructor sees only their own engagements' staff lane. Negative-test it.
3C. AUTO-ADVANCE SHOULDN'T BE SILENT: maybeAdvanceStage (lib/cases/advance.ts) moves early stages off milestones but
    emits NO staff notification/task and doesn't notify the applicant. On a meaningful auto-advance (e.g. training_
    complete, signed_up_paid) create a staff notification/activity nudge and implement whether the applicant gets a
    friendly "you've reached X" notification. Idempotent (respect existing reminder_log) — no duplicate nags.
```

## B4 — Polish the bare spots
```
- app/admin/page.tsx: the "Docs to review" stat card links to /admin (itself). Point it at a real pending-documents
  queue (filtered view or small dedicated page) so the count is actionable.
- app/admin/calendar/page.tsx: read-only + self-labeled unfinished. At minimum make the agenda useful (filter by
  upcoming/instructor/case, link each appointment to its case). Full scheduler optional/out of scope unless quick.
- Confirm no genuinely useful route is orphaned (the deep-linked /admin/clients/new and /admin/reports/coverage are fine).
```

## PART B verify (adversarial)
```
1) PRIVACY: RLS negative tests — instructor still cannot read any disclosure, note, task, intake answer, or other case's
   data; the new staff↔instructor lane exposes NO applicant disclosures and is scoped to their own engagements.
2) DATA SYNC: trainer-approving a requirement with a linked document flips that document out of "pending" everywhere
   (admin Today count, Documents tab); changes_requested reverses it.
3) MESSAGING: staff↔client, client↔instructor, staff↔instructor are three DISTINCT lanes; none leak into another; the
   Inbox unread badge counts what it claims.
4) ADMIN LEVER: admin can invite/assign an instructor and confirm/cancel a booking; every such action is logged as an
   admin assist; stage auto-advance still fires; the QA gate + sign-off still the only path to filed.
5) INSTRUCTOR DASH: /instructor lands on the review queue + book of business; setup demoted; upcoming sessions shown.
6) NOTIFICATIONS: auto-advance produces a staff nudge (and the chosen applicant notification), idempotently.
7) pnpm build && pnpm test && verify-* pass; mobile-first at 390px on changed screens.
Deliver: before/after screenshots of the instructor dashboard + admin Training tab (new lever + staff↔instructor lane),
the RLS negative-test output, and a clip of logout→login (no auto-login) + the forgot-password round trip.
```

---

### Notes for you (not for Claude Code)
- **Run PART A first.** Clean logout/login is needed to switch between the applicant, trainer, and admin accounts while you test PART B.
- **Bugs before features:** A1 (logout) and B1 (doc-status desync + message leak) are the real defects — cheap fixes that remove most of the "why can't they see/control this" confusion.
- **Biggest daily win:** B2A, the instructor dashboard — the data already exists; it's just landing trainers on the wrong page.
- **One deliberate model decision:** B3A gives admin a *logged assist* for stuck cases, not a takeover, so it doesn't undercut the applicant-choice marketplace or compliance. Say the word if you want full admin assignment power instead.
- **One config step is yours, not code:** for password reset (A3), `/auth/reset-password` must be in your Supabase Auth Redirect-URLs allowlist and Auth email sending must be on — confirm in the Supabase dashboard after the build.
