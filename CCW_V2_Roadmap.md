# CarryPath V2 — Phased Build Roadmap

*Build order for Claude Code, sequenced so each phase ships something usable and nothing gets reworked. Each phase lists scope, the files it touches, and a concrete "done when" acceptance check. Phases are ordered by dependency: the requirements engine and intake underpin everything; the marketplace and calendar build on those; automation ties it together.*

Conventions for every phase: write the migration(s), regenerate Supabase types (`pnpm db:types`), add/extend RLS, build server actions before UI, keep Stripe/Twilio behind their existing flags, and add a seed/test path so the phase is demoable locally.

---

## Phase 0 — Foundation hardening (0.5 day)
**Scope:** Enable PostGIS; add the `instructor` role value; add the new enums and conditional `document_type` values; set up env vars (`GOOGLE_OAUTH_*` optional, `NEXT_PUBLIC_SITE_URL` confirmed). Regenerate types.
**Files:** `supabase/migrations/20260628_0001_enums_v2.sql`, `.env.example`, `lib/supabase/types.ts`.
**Done when:** migrations apply on a fresh `supabase db reset`, types regenerate clean, app still builds.

---

## Phase 1 — Requirements Engine (1–2 days)
**Scope:** `jurisdiction_profiles`, `requirements` (versioned), `case_requirements`. Seed NYC + Special Carry from the operational map Section 03. Pure generator `generateCaseRequirements(profile, answers)`. Replace the checklist UI's data source from `config/checklist-templates.ts` → `case_requirements` (keep the config as fallback during migration). Admin "verify-live" registry editor (dated rows).
**Files:** `migrations/..._requirements_engine.sql`, `..._seed_requirements.sql`, `lib/requirements/*`, `app/portal/checklist/*`, `app/admin/requirements/*`.
**Done when:** a case shows a personalized satisfied/pending/N/A checklist driven by DB rows, each item showing its `req_code` + authority; editing a registry row's `effective_to` and adding a new version changes future cases without touching old ones.

---

## Phase 2 — Branching Intake + Disclosure (2–3 days)
**Scope:** `intake_sessions`, `disclosures`. Six-step resumable wizard (eligibility gate → identity → household → disclosure interview → carry-specific → generation gate). Conditional document spawning into `case_requirements`. Hard gates (under-21, prohibitor flags → attorney-review track). Every disclosure "yes" binds a required narrative; submission blocked until filled. `file_validator` (size/ext/filename sanitize, `FMT-01`). Pre-submission QA checkpoint before `application_assembled`.
**Files:** `app/portal/intake/*`, `lib/intake/*`, `lib/files/validator.ts`, `migrations/..._intake_disclosure.sql`.
**Done when:** a test applicant with one cohabitant + one dismissed arrest completes intake and the generated checklist auto-includes a cohabitant affidavit and an ARR-01 Certificate of Disposition + narrative; submission is blocked until the narrative is written; a bad filename is auto-sanitized on upload.

---

## Phase 3 — Instructor accounts & profiles (1–2 days)
**Scope:** Bind `instructors` to auth profiles; instructor signup + onboarding (DCJS credential, service area, locations, pricing, bio); admin verification flow; new `app/instructor` surface with layout + dashboard shell. Geocode service area + `training_locations` (PostGIS).
**Files:** `app/instructor/*`, `app/admin/instructors/*`, `lib/geo/*`, `migrations/..._marketplace_instructors.sql` (instructor + locations portion).
**Done when:** an instructor can sign up, get verified by admin, and appear in a geo query; an unverified instructor never appears to clients.

---

## Phase 4 — Marketplace: offers, feed, accept (2–3 days)
**Scope:** `case_offers`, `offer_matches`, `engagements`. Client actions: "Schedule training" and "Hire help." Geo-match → broadcast offer → `instructor_offer_feed` redacted view. `accept_offer()` RPC creating the engagement, granting scoped RLS access, notifying the client. Privacy scoping (no PII pre-accept; `scope_full_assist` consent gate). Instructor case view (scoped).
**Files:** `app/portal/(marketplace)/*`, `app/instructor/feed/*`, `app/instructor/cases/*`, `lib/marketplace/*`, `migrations/..._marketplace_instructors.sql` (offers/engagements portion + RLS view + RPC).
**Done when:** a client in Brooklyn creates an offer; only verified instructors within radius see a **redacted** card; one accepts; an engagement is created; the client is notified; the instructor now sees the scoped case and nothing more; a non-matching instructor sees nothing.

---

## Phase 5 — Scheduling, booking & calendar (2 days)
**Scope:** `availability_slots`, `bookings`, overbooking guard. Instructor availability manager. Client booking from matched instructor's slots → instructor confirm. ICS generation emailed to both parties with training-location address + map link. Completed booking → `training_sessions` row (score/pass). Optional Google two-way sync behind a flag (`calendar_connections`). Surface bookings + NYPD `appointments` together in the existing calendar view.
**Files:** `app/instructor/availability/*`, `app/portal/(marketplace)/book/*`, `lib/calendar/ics.ts`, `lib/calendar/google.ts`, `app/admin/calendar/*`, `migrations/..._scheduling_calendar.sql`.
**Done when:** a client books a confirmed 18h combined slot, both parties receive a valid `.ics` invite to the right address, the slot's `booked_count` increments and won't overbook, and completion writes a training session.

---

## Phase 6 — Reference outreach (1 day)
**Scope:** `reference_requests` with tokens. Client/staff send a tokenized link; public `app/r/[token]` page for the reference to confirm details / upload / attest; write-back to `character_references` + bound `case_requirements`. Batch-notary scheduler hint (4 refs + cohabitant affidavits in one session).
**Files:** `app/r/[token]/*`, `app/portal/people/*` (send + status), `lib/references/*`, `migrations/..._reference_outreach.sql`.
**Done when:** entering a reference's email sends a link; the reference submits via the public page with no login; the case's reference requirement moves toward satisfied; reminders fire if unfilled.

---

## Phase 7 — Notifications & reminder engine (1–2 days)
**Scope:** `notifications` + bell UI on all three surfaces. Expand `lib/reminders.ts` into a rule-driven engine with `reminder_log` idempotency. Rules: doc rejected, reference unfilled (3/7d), booking confirmed/24h/2h, stage stalled, long-lead nudge (day 3/7), pre-filing QA, renewal (existing), new offer in feed. Email templates via Resend; SMS stays off. (If sub-daily reminders are wanted, add a Supabase `pg_cron` Edge Function instead of upgrading Vercel.)
**Files:** `lib/reminders.ts`, `lib/email/templates/*`, `components/*/notification-bell.tsx`, `app/api/cron/reminders/route.ts`, `migrations/..._notifications_reminders.sql`.
**Done when:** the daily cron sends each due reminder exactly once (verified by `reminder_log` uniqueness), in-app notifications appear with deep links, and re-running the cron sends nothing new.

---

## Phase 8 — Marketplace payments (1 day, optional/dark)
**Scope:** Stripe Connect (Express) for instructor payouts; application fee; booking deposit + balance via the existing `payments` flow. Ships behind the existing Stripe flag.
**Files:** `lib/stripe/connect.ts`, `app/instructor/payouts/*`, `app/api/stripe/webhook/route.ts` (extend), `migrations` (payments columns).
**Done when:** with test keys, an instructor onboards a Connect account, a client pays a booking deposit, the platform fee is recorded, and the webhook reconciles `payments`.

---

## Phase 9 — Polish, QA, verify-live (1 day)
**Scope:** Mobile pass on all new surfaces; RLS test matrix (client/instructor/staff/admin × every new table — especially that disclosures are never instructor-visible and offers are redacted pre-accept); seed demo data (clients, instructors, offers, bookings); accessibility; the standing NYPD "verify-live" admin checklist before filings.
**Done when:** the RLS test matrix passes, the redaction/PII boundaries hold under test, and a full happy path (intake → match → accept → book → train → collect refs → assemble → file) runs end-to-end on seed data.

---

## Dependency graph

```
P0 ─┬─► P1 ─► P2 ─────────────► P9
    └─► P3 ─► P4 ─► P5 ─► P8 ─► P9
              P1 ─► P6 ─┐
              all  ───► P7 ─► P9
```

## Suggested execution

Run Claude Code phase-by-phase, not all at once — review and test each phase's "done when" before moving on. Phases 1–2 (engine + intake) and 3–5 (marketplace + calendar) are the two big value blocks; 6–8 are smaller add-ons; 9 is the safety gate. Total ≈ 12–17 focused days.
