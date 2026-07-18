# CCW V3 — Post-Build Verification Punch List
**Date:** 2026-07-13 · **Method:** adversarial code verification against `CCW_V3_BUILD_PROMPT.md`. Commit messages ignored; only code counts.
**Typecheck:** `tsc --noEmit` → **clean.** **Tests:** could not run in Linux sandbox (darwin-arm64 rolldown binaries) — **run `pnpm test` on the host.**

**Overall: a strong build.** Most of the spec is genuinely wired end-to-end, not shelled. The checklist schism is dead, notes/tasks/disclosures/assignment/inbox are real, the reminder engine is complete, tokens are hardened, and the fabricated stats are gone. The docs rewrite is honest — the Phase 4 commit *self-discloses* its own misses, which is a good sign about the work.

But **three items are ship-blockers** and the build reports them as done.

---

## 🔴 BLOCKER 1 — The CP-5 pre-filing gate is bypassable

This is the product's core promise and its legal moat. It does not hold.

**1a. The gate guards 2 of 13 stages.**
`lib/qa-gate.ts:17` — `GATED_STAGES = ["application_assembled","filed"]`. But `config/stages.ts` defines four stages *after* `filed`: `fingerprinting_booked`, `under_investigation`, `decision`, `licensed`. `setCaseStage` (`app/admin/actions.ts:31`) does no adjacency or ordering check — it only validates stage-key membership. The kanban renders **every** stage as a droppable column (`components/admin/pipeline-board.tsx:163`) and `StageControl` offers all 13.

→ **A consultant can drag a case with zero satisfied requirements from `document_collection` straight to `under_investigation` or `licensed`, and the gate never runs.**

**Fix:** reject any move to a stage at or past `stageIndex("application_assembled")` unless the gate passes.

**1b. The `na` escape hatch.**
The blocker filter is `req?.blocking && r.status === "pending"` (`lib/qa-gate.ts:59-62`), but `case_req_status` is `('na','pending','satisfied','rejected')`. The requirements UI exposes an **"N/A" button** to any staffer (`components/admin/requirements-review.tsx:107`). Mark a blocking requirement N/A and it silently stops blocking.

**Fix:** count `na` and `rejected` blocking requirements as open — or forbid `na` on blocking rows entirely (recommended; a legally-required document is never N/A).

**1c. The photo check isn't in the gate.**
Spec required it. `GateBlocker.kind` has no photo variant. Photo validation exists **client-side only** (`lib/files/photo-spec.ts`, header says "Browser-only"). An off-spec photo uploaded via any non-browser path satisfies IDN-04 unchecked.

**Fix:** re-validate dimensions server-side in the gate.

---

## 🔴 BLOCKER 2 — The entire retention product is unreachable

**No code path anywhere writes `cases.license_expires_on` or `county_license_expires_on.`** The only writers in the repo are `scripts/seed.ts:334` and `scripts/verify-v3p3.ts`. `app/admin/actions.ts` can set stage, status, and assigned staff — **there is no admin field to record license issuance or expiry.**

Consequence: the renewal runway (T-9mo), the license-status card, the Special Carry county-license watcher, and the `renewal_runway` / `county_license_expiring` reminder rules are all **correctly built, correctly tested by the math, and reading a column nobody can fill.** Phase 3's whole retention thesis — the 3-year relationship — is inert in production.

**Fix:** add "record license issued" to the admin case file (issue date, expiry, license type, county license expiry for Special Carry). ~1 hour of work that switches on an entire phase.

Also: `/portal/license` and `/portal/appeal` are **not in `components/portal/portal-nav.tsx`** — reachable only via cards on the portal home.

---

## 🔴 BLOCKER 3 — The two most load-bearing functions have zero tests

Vitest is real (4 files, 28 assertions: requirements generator, intake schema, file validator, license math). But:

- **`lib/qa-gate.ts` has zero unit coverage.** The single most legally load-bearing function in the repo — the thing you market on, the thing that reduces denials — has **no test on any blocker path.** (And per Blocker 1, it's broken.)
- **There is no RLS test matrix.** The spec asked for one test per role per table asserting both allow *and* deny. Grep `tests/` for `rls|policy` → nothing. RLS is exercised only by ad-hoc `scripts/verify-*.ts` needing a live DB.

Given that RLS is the only thing standing between a client and someone else's arrest record, this is not optional.

---

## 🟠 Should fix before launch

| # | Issue | Evidence |
|---|---|---|
| 4 | **`clients.track` is never written from intake.** A self-serve applicant who selects "premises" or "non-resident" gets the correct *requirements* but keeps `track = 'resident'` in the DB and in every admin display. The enum lacks `retired_leo` / `premises_business` entirely. The track field is a lie. | `20260608194250:10`; only writers are the lead form and admin create-client |
| 5 | **The backfill is a script, not a migration** (`scripts/backfill-requirements.ts`). If it isn't run against prod, legacy cases render an **empty checklist on both sides**. | not in `supabase/migrations/` |
| 6 | **`requirements_write` RLS is still `is_staff_or_admin()`.** `requireAdmin()` was added at the app layer only — a `staff` session hitting PostgREST directly can still rewrite the legal registry. Defense-in-depth hole. | `20260628000200:102-104` |
| 7 | **Stripe is still flag-off, and the balance-on-filing half of the deposit flow does not exist.** Nothing ever creates the balance payment row; `/pricing` advertises "Deposit to start, balance on filing." The checkout code is real and correct — it's one env var from live, but GATE 3 ("a stranger can buy without talking to anyone") is not met today. | `lib/stripe/index.ts:10`; `app/api/stripe/webhook/route.ts:36-46` |
| 8 | **No training-expiry warning.** Training decays at 6 months and the reminder engine has **13 rules, none for it.** The countdown renders in admin; nobody gets told. | `lib/reminders/engine.ts` |
| 9 | **`lib/portal.ts:10-19` `getMyCase()` repeats the bug you just fixed** — `.order().limit(1)` with no profile filter, relying on RLS. Safe today only because `/portal` is client-only — and Phase 0.2 just widened `case_visible` for staff. A latent landmine. | `lib/portal.ts:10` |
| 10 | **Fees only half config-driven.** The `fees` table exists and is read for FEE-01 notes, but `$340` / `$88.25` are still hardcoded in `enroll/page.tsx:43`, `faq/page.tsx:16`, `pricing/page.tsx:73`, `message-templates.ts`. A fee change is still partly a deploy. `fees.retired_leo_application` is added and never read. | — |
| 11 | **HEIC still fails on desktop Chrome/Firefox.** `createImageBitmap()` can't decode it; compression falls back to the original and the 5 MB cap rejects it. Works on iOS Safari (the main path), but the desktop gap is real. | `lib/files/compress.ts:51` |

---

## 🟡 Deferred / disclosed (fine to ship with)

- **`loading.tsx` = 0, Suspense = 0, skeletons = 0, `.shimmer` still dead.** The Phase 4 commit *self-discloses* this (built, then removed over a streaming-reveal defect). Crash screens are handled (4 `error.tsx` + `not-found.tsx`); **blank stalls on navigation are not.** Worth revisiting.
- **Intake wizard still uses raw `<input type=checkbox>` and `<select>`** with bolted-on `aria-label`s, rather than the unused `components/ui/checkbox.tsx` / `select.tsx`. Skip link, `aria-current="step"`, and `role="alert"` all landed.
- **Photo validator has no crop tool** and no live preview (validates on submit). It does auto-downscale oversized square photos, which is better than the spec asked.
- **`Magnetic` / `JourneyScroll` untouched** since the initial commit. BootIntro, CursorReticle, and PrecisionTest **are genuinely deleted** (−348 lines, no importers).
- **De-dupes not done:** `document-uploader`/`notarized-upload` and `reference-flow`/`cohabitant-flow` are still twins. `lib/geo/nyc.ts` still hardcoded centroids.
- **`config/brand.ts` still has `carry.example` and `(212) 555-0142`.** Honestly listed as open in `AGENTS.md` — but you can't launch with a placeholder phone number.
- **Eligibility quiz still loses state on refresh** (pure `useState`), though answers *are* carried into intake once submitted.
- **`booking_2h` reminder can only fire if cron runs ≥ every 2 hours.** Confirm the `vercel.json` cadence or it will never fire.

---

## ✅ Genuinely done (verified in code, not taken on faith)

- **The checklist schism is dead.** `config/checklist-templates.ts` and `checklist-engine.tsx` deleted; zero `checklist_items` reads/writes anywhere; admin and portal both read `case_requirements`. This was the central defect and it is genuinely fixed.
- **Disclosures are readable by the consultant** — narratives, bound Certificates of Disposition, a quality flag, and a working "request a better narrative" action.
- **`case_notes` exists and is wired** (searchable, pinnable). Tasks: create / assign / due / priority / reopen + a cross-case **My Queue**.
- **Case assignment/reassignment UI** exists. Left-rail vitals are all *computed*, not stubbed: blocking count, days in stage, client idle days, training countdown (red at T-30).
- **Reference/cohabitant token status is visible in admin, with working resend + revoke.** Tokens now have `expires_at` + `revoked_at`, and **they are actually checked at all six public entry points** — not dead columns. Rate limiting added.
- **Reminder engine: all 9 spec rules present** (+4 lifecycle rules), all idempotent via `reminder_log`. `lib/reminders.ts` / `engine.ts` properly consolidated.
- **Instructor identity bug fixed** (`profile_id` filter). Staff RLS visibility restored. `requireAdmin()` applied at the app layer. Cron fails closed. `captureLead` has a honeypot + rate limit.
- **Zod at the intake boundary is real** — DOB ≥ 21, valid reference emails, track-and-renewal-aware reference counts (4 carry / 2 premises / 0 renewal).
- **Legal domain corrections landed correctly** — and were done the *right* way: the wrong v1 rows were closed with `effective_to` and dated v2 rows inserted, using the versioned registry as designed rather than editing a shipped migration. SOC-01 is non-blocking with the Antonyuk injunction cited. Every new rule carries `authority` + `source_url` and ships `needs_legal_review = true`.
- **`/admin/legal`** replaces the ephemeral `verify-live` with a persisted, audited attorney-verification workflow.
- **Fabricated stats are gone.** The counters are now true and verifiable. The disclaimer renders on every marketing page, at signup, and in the privacy policy. Every hit for *guarantee/expedite/fast-track* in the codebase is now a **negation**.
- **BootIntro, CursorReticle, PrecisionTest deleted.**
- **`AGENTS.md` / `README.md` rewritten honestly**, including a candid open-items list. Stale V2 prompts archived.

---

## Recommended next run

**Fable 5 — one focused pass, in this order:**
1. Fix the CP-5 gate (all three sub-defects) **and write its test suite.**
2. Write the RLS test matrix.
3. Add the license-issuance write path + portal nav entries.
4. Write `clients.track` from intake; extend the enum.
5. Convert the requirements backfill into a migration.
6. Tighten `requirements_write` RLS to admin-only.
7. Add the training-expiry reminder rule (T-60 / T-30).
8. Fix `lib/portal.ts:getMyCase()`.

**Then, separately (Opus 4.8 is fine):** real contact details in `config/brand.ts`, finish the fee config, turn Stripe on, build the balance-on-filing payment.

**Then: the attorney review.** Nothing in this list substitutes for it.
