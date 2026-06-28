# CarryPath V2 — Claude Code Build Prompt

> **How to use:** Open Claude Code in the root of this repo (`CCW/`) and paste the prompt below. It references three companion specs already in the repo root — `CCW_V2_Architecture_Plan.md`, `CCW_V2_Data_Model.md`, and `CCW_V2_Roadmap.md` — read those first. Build **one phase at a time**, stopping at each phase's acceptance check for review.

---

## PROMPT — paste everything below this line into Claude Code

You are extending an existing production app, **CarryPath**, a Next.js 16 + Supabase + Stripe + Resend system that guides applicants through the NYC concealed-carry (CCW) license process. **This is an additive build, not a rewrite. Do not drop, rename, or break any existing table, route, or component.**

### First: read the context

Before writing any code, read these files in the repo root and treat them as the source of truth:
- `CCW_V2_Architecture_Plan.md` — what we're building and why.
- `CCW_V2_Data_Model.md` — exact new tables, enums, columns, RLS, migration filenames.
- `CCW_V2_Roadmap.md` — the phase order and per-phase acceptance checks.
- `CCW_System_Plan.md` and `CCW_ClaudeCode_Prompt.md` — the original v1 build, for style.

Then inspect the current code so your additions match conventions exactly:
- `supabase/migrations/*` (schema, RLS helpers `is_admin()`, `is_staff_or_admin()`, `case_visible()`, the `set_updated_at()` trigger, the `handle_new_user()` profile trigger).
- `config/stages.ts`, `config/checklist-templates.ts`, `config/brand.ts`.
- `app/portal/*`, `app/admin/*`, `app/(marketing)/*` (App Router server components + server actions in `actions.ts`).
- `lib/email/index.ts`, `lib/reminders.ts`, `lib/renewals.ts`, `lib/sms.ts`, `lib/stripe/*`, `lib/supabase/{server,client,admin}.ts`, `lib/portal.ts`, `lib/activity.ts`.
- `app/api/cron/reminders/route.ts`, `vercel.json`.

### What we're adding (six modules)

1. **Versioned Requirements Engine** — replace static `config/checklist-templates.ts` with DB tables `jurisdiction_profiles`, `requirements` (dated/versioned, with authority citations + machine-checkable validation rules + trigger conditions + severity), and per-case `case_requirements` (status satisfied/pending/na/rejected, bound to the document/reference/cohabitant/disclosure that satisfies it). A rule change must be a dated data edit, not a code change.
2. **Branching Intake + Disclosure Interview** — a resumable six-step wizard in the portal (`intake_sessions`, `disclosures`) that gates eligibility, enumerates household/disclosures, and **deterministically generates** the personalized `case_requirements` set. Every disclosure "yes" binds a required written narrative; submission is blocked until each is filled. Includes a `file_validator` that enforces <5MB / allowed extension and **auto-sanitizes filenames** (the NYPD portal silently rejects bad names), plus a pre-submission QA checkpoint.
3. **Two-sided Trainer Marketplace** — add `'instructor'` to the `user_role` enum and a new `app/instructor/*` surface. Instructors onboard (DCJS Duly-Authorized-Instructor credential, service area, locations, pricing) and are admin-verified. Clients request training or full help → a geo-matched **`case_offer`** is broadcast to local verified instructors who see a **privacy-redacted** case card in a feed and can **Accept**, which creates an **`engagement`** that grants scoped case access and notifies the client. Use PostGIS for matching.
4. **Scheduling & Calendar** — `training_locations`, `availability_slots`, `bookings` (with an overbooking guard). On confirmation, email both parties an **`.ics`** invite to the training-location address (zero cost). Optional, feature-flagged Google Calendar two-way sync (`calendar_connections`) using the free Google Calendar API. Completed bookings write to the existing `training_sessions` table.
5. **Reference Outreach** — `reference_requests` with opaque tokens; a public, no-login page `app/r/[token]` where each character reference confirms details / uploads / attests, writing back to `character_references` and the bound `case_requirements`.
6. **Notifications & Reminder Engine** — `notifications` table + a bell on all three surfaces; expand `lib/reminders.ts` into a rule-driven engine with a `reminder_log` for idempotency (the daily cron must never double-send). Email via Resend (free tier); **keep Twilio SMS off by default**.

### Hard constraints

- **Stack:** stay on Next.js 16 App Router, Supabase (Postgres + Auth + Storage + RLS), Stripe, Resend, Tailwind + shadcn/ui. Use server actions; service-role client only in server/cron/webhook/token contexts.
- **Cost = $0 recurring.** Resend free tier, native ICS (no Calendly/Cal.com), PostGIS + cached geocoding (no paid geo API), Vercel daily cron (if sub-daily reminders are needed, use a Supabase `pg_cron` Edge Function — do NOT assume a Vercel Pro upgrade). SMS stays behind its flag. Only Stripe's per-transaction fee is acceptable.
- **Security is a feature.** Every new table gets RLS. Add helpers `is_instructor()` and `instructor_engaged(case_id)`. **Disclosures must never be visible to instructors.** The offer feed must be a redacted security-barrier **view** (`instructor_offer_feed`) exposing no client PII before acceptance; acceptance goes through a `security definer` RPC `accept_offer(offer_id)`. Write every cross-actor access to `activity_log`.
- **Don't break v1.** Keep existing routes working. Bind new document uploads to `case_requirements` while leaving the existing `checklist_item_id` link intact; deprecate the static checklist only after `case_requirements` drives the UI.
- After each schema change run the project's type generation (`pnpm db:types`) and keep the build green (`pnpm build`, `pnpm lint`).

### Build process — one phase at a time

Follow `CCW_V2_Roadmap.md` Phases 0→9 **in order**. For each phase:
1. State the phase and what you'll change.
2. Write the migration(s) using the exact filenames and DDL in `CCW_V2_Data_Model.md`; add RLS in the same or the dedicated RLS migration.
3. Regenerate types; write server actions and `lib/*` logic first, then the UI.
4. Keep Stripe/Twilio/Google behind their env flags so the app runs fully without those keys.
5. Add or update seed data so the phase is demoable locally (`pnpm db:reset && pnpm seed`).
6. **Stop and report** against that phase's "Done when" acceptance check before starting the next phase. Do not run ahead.

Start now with **Phase 0 (Foundation hardening)**: enable PostGIS, add the `instructor` role and all new enums and conditional `document_type` values per `CCW_V2_Data_Model.md §1`, add any new env vars to `.env.example`, regenerate `lib/supabase/types.ts`, and confirm the app still builds. Then pause for review.

### Acceptance for the whole build

The end-to-end happy path runs on seed data: applicant completes intake (with a cohabitant + a dismissed arrest that auto-spawn the right requirements and block submission until narrated) → requests training → a local verified instructor sees a redacted offer and accepts → an engagement grants scoped access (no disclosures) → client books an 18-hour slot and both get a correct `.ics` invite → references receive tokenized links and submit → packet is QA'd and assembled → reminders fire exactly once each. RLS test matrix (client / instructor / staff / admin × every new table) passes, with disclosures never instructor-visible and offers redacted pre-accept.

## END OF PROMPT
