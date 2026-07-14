<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Notably: `proxy.ts` (not `middleware.ts`), and `params`/`searchParams`/`cookies` are async.

# CARRY — what this codebase is

A Next.js 16 + Supabase platform that helps New Yorkers obtain an NYPD concealed-carry license, and helps licensed consultants run many such cases at once. Live at ccw-eight.vercel.app; hosted Supabase ref `nabohrqydjzborehqslc`.

Four surfaces: **marketing** `app/(marketing)`, **client portal** `app/portal`, **consultant admin** `app/admin`, **instructor** `app/instructor` — plus tokenized public flows `app/r/[token]` (references) and `app/c/[token]` (cohabitant affidavits).

## Legal guardrails (non-negotiable — they can kill the company)

NYPD's published position: consulting firms **cannot represent applicants**, **cannot expedite**, and are **not endorsed**; only a NY-licensed attorney may represent an applicant before the License Division.

1. **The applicant always submits their own application.** Never build filing-on-their-behalf; never touch NYPD portal credentials.
2. **Candor-maximizing, never disclosure-minimizing.** Sealed/dismissed arrests ARE disclosed (CPL Art. 160). No feature may suggest what to omit.
3. **No legal advice.** Explaining a rule is fine; advising on someone's specific arrest is the practice of law (Judiciary Law §§478/484). Route to the attorney-referral seam.
4. Never use *guarantee, expedite, fast-track, insider, approval rate* in copy. The standing disclaimer lives in `config/brand.ts`.
5. Every registry rule carries provenance and `needs_legal_review`; attorney sign-off happens in `/admin/legal`. Don't invent citations.

## Architecture spine

- **Requirements engine** (the core): `jurisdiction_profiles` → versioned `requirements` (dated rows; a rule change is a data edit — close `effective_to`, insert a new dated version) → per-case `case_requirements` (the ONE checklist both portal and admin read; V1 `checklist_items` is dead). Pure generator: `lib/requirements/generate.ts` (trigger conds incl. `carry_not_renewal`, `premises_only`, `if_renewal`, `if_retired_leo`); DB writer: `lib/requirements/materialize.ts`.
- **Intake**: 6-step wizard (`components/portal/intake/intake-wizard.tsx`), zod boundary `lib/intake/schema.ts` (track-aware reference counts 4/2/0), processing `lib/intake/process.ts` (rebuilds cohabitants + disclosures, materializes requirements, writes training-decay dates).
- **CP-5 pre-filing QA gate**: `lib/qa-gate.ts`, enforced in `setCaseStage` (app/admin/actions.ts) — a case cannot enter `application_assembled`/`filed` until blocking reqs are satisfied, disclosures narrated, training ≤6 months old, track-aware notarized references met, and a named staff sign-off is recorded.
- **Reminders**: `lib/reminders/engine.ts`, idempotent via `reminder_log (rule_key,target,window_key)`; cron `/api/cron/reminders` fails closed without `CRON_SECRET`.
- **Money**: `service_packages` table (admin-write RLS) → `/portal/enroll`; Stripe behind `STRIPE_ENABLED` with an invoice-request fallback; webhook reconciles by `payment_id` metadata.
- **Post-issuance**: `purchase_authorizations` (30d/90d/72h clocks in `lib/license.ts`), `license_reports` (§5-24), `/portal/license`.
- **Privacy firewall**: instructors NEVER see disclosures, notes, or client PII pre-accept (redacted `instructor_offer_feed` view + `accept_offer()` RPC). `case_notes` are staff-only RLS.

## Conventions

- **Auth is three layers**: `proxy.ts` (optimistic redirect) → `requireRole/requireStaff/requireAdmin` in layouts AND every server action → RLS. New tables get RLS in the same migration.
- **Server actions**: `"use server"` → require* → zod parse at the boundary (no `as never` into jsonb) → mutate → `logActivity()` → `revalidatePath()`.
- **Service-role (`createAdminClient`) is a last resort** — every use carries a justifying comment (system generation, token flows, client-initiated writes to staff-only tables with server-derived values).
- **Migrations**: `supabase/migrations/`, 14-digit prefixes (`YYYYMMDDNNNNNN`); version = digits before the first `_`. Never edit a shipped migration. `pnpm db:reset` → `pnpm seed` → `pnpm db:types` after schema changes. Hosted push: `supabase db push --include-all`.
- **RLS pitfalls learned here**: a SELECT policy whose helper re-queries the same table breaks `INSERT…RETURNING`; staff visibility = `is_staff_or_admin()` (assignment is ownership, not visibility — twice this codebase shipped policies confusing the two).
- **supabase-js**: aliased embedded selects type as `GenericStringError` — flatten or cast `as unknown as`.
- **Design system is the strongest asset**: tokens in `config/brand.ts` + `app/globals.css`; bespoke `components/ui/*` (ReticleProgress, HudStat). Extend, never replace; colors only from brand tokens; every animation respects `prefers-reduced-motion`. No tactical cosplay — the register is "my lawyer's office."
- **Verification culture**: each phase has a `scripts/verify-*.ts` harness (per-role anon clients asserting RLS positively AND negatively) — run them after a reset+seed; `pnpm test` runs the vitest unit suite. Local demo logins all use password `Passw0rd!` (admin@/staff@/client1@/client2@/instructor@carrypath.test).

## Current state / open items

- Stripe checkout is fully built but `STRIPE_ENABLED` is off in prod (invoice-request fallback carries revenue); Resend key unset (emails log to console; "Copy link" buttons cover outreach).
- Every registry rule awaits attorney verification in `/admin/legal` before client-facing filing use.
- `config/brand.ts` contact email/phone are real (gunlicensenyc@gmail.com / (929) 352-5961); `domain`/`url` still read `carry.example` (runtime URL comes from `getSiteUrl()`/`NEXT_PUBLIC_SITE_URL`, so it's cosmetic — swap when a custom domain lands).
- Historical docs live in `docs/archive/`; the V3 evidence base is `CCW_V3_AUDIT.md` + `CCW_V3_BUILD_PROMPT.md`.
