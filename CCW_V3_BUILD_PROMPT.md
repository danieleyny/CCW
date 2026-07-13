# CCW / CARRY — V3 Build Prompt (Claude Code + Fable 5)

> **How to use:** open Claude Code in this repo with **Fable 5**. Paste the ORIENTATION + GUARDRAILS sections, then run phases in order. Each phase has an acceptance gate — stop, review, commit, then continue. Read `CCW_V3_AUDIT.md` first; it is the evidence base for everything below.

---

# ORIENTATION

You are upgrading **CARRY** — a Next.js 16 / Supabase platform that helps New York City residents obtain an NYPD handgun / concealed-carry license, and helps licensed consultants manage many such cases concurrently.

**Two personas, both first-class:**
- **Applicant** — needs the most intimidating bureaucratic process of their life reduced to a calm, obvious, one-thing-at-a-time flow.
- **Consultant** — runs 20–60 concurrent cases. Needs a cockpit: everything about a case in one place, nothing hidden, and a queue that tells them what to do next.

**The controlling insight, from your own architecture doc, which is correct:**
> *"NYC carry is not a form you submit — it is an investigation you assemble evidence for."*

Two levers follow from it, and the product must be built around them:
1. **Long-lead parallelism.** Training (18 hr, expires 6 months after completion) and fingerprinting are the long poles. They must start on day one, in parallel with document collection — not sequentially.
2. **Disclosure discipline.** The dominant denial grounds (38 RCNY § 5-10(e) and (n)) are *false statements* and *lack of candor* — not the underlying conduct. The product's job is to drive **complete, well-narrated disclosure**, never to help anyone minimize it.

**Current state:** the V2 upgrade (requirements engine, branching intake, disclosures, instructor marketplace, tokenized reference/cohabitant flows, e-signature, PDF packet assembly) shipped to the **client portal** and the **instructor** surface, and **never shipped to `/admin`**. The consultant is running on the V1 data model. That is the central defect you are fixing.

**Stack:** Next.js 16 (note: `proxy.ts`, not `middleware.ts` — read `node_modules/next/dist/docs/` before writing Next code), React 19, Supabase (Postgres + RLS + Storage + PostGIS), Tailwind v4 (CSS-first, no config file), bespoke shadcn-derived UI, Stripe (coded, flag-off), Resend, Twilio, pdf-lib, pnpm, Vercel.

---

# GUARDRAILS — non-negotiable

## Legal (this is the one that can kill the company)

NYPD publishes an explicit position on consulting firms: they **cannot represent an applicant** before the License Division (only a NY-licensed attorney can), **cannot expedite**, and are **not endorsed**. The License Division was the subject of a federal bribery prosecution of consultant "expediters." **This category is presumed dirty until proven otherwise. Build the proof.**

1. **The applicant always submits their own application**, through the NYPD portal, with their own credentials. Never store, request, or use NYPD portal credentials. Never build a feature that files on their behalf.
2. **Candor-maximizing, never disclosure-minimizing.** No feature may suggest what to omit, how to characterize, or whether something "needs" disclosing. When in doubt the product says: *disclose it, and narrate it fully.* Sealed and dismissed arrests **are** disclosed to the License Division — the product must say so plainly.
3. **No legal advice.** Explaining *what a rule requires* is fine. Advising *what to do about a specific arrest* is the practice of law (NY Judiciary Law §§ 478/484 — a misdemeanor). Anything adjudicative or advisory must route to a NY-licensed attorney. Build the referral seam.
4. **Never** use the words *guarantee, expedite, fast-track, insider, approval rate* in any copy, ever.
5. Every legal citation in the requirements registry must carry an authority reference and be flagged for attorney verification. Do not invent citations. If unsure, mark `needs_legal_review`.

## Engineering

- **Do not redesign the design system.** `config/brand.ts`, `app/globals.css`, and `components/ui/*` are the strongest assets in the repo. Use the existing tokens, the existing `Button`/`Card`/`Badge` variants, `.glass-premium`, `.engraved`, `ReticleProgress`, `HudStat`. Extend, never replace. Colors come **only** from `config/brand.ts`.
- **Every animation respects `prefers-reduced-motion`.** This is already correctly done — don't break it.
- **Mobile-first**, verified at 390px.
- **Three-layer auth stays:** `proxy.ts` (redirect only) → `requireRole/requireStaff/requireAdmin` in layouts *and* every server action → RLS. New tables get RLS in the same migration. No exceptions.
- **Zod on every server action.** Parse at the boundary. No `as never` casts into jsonb.
- **Never widen service-role usage.** `createAdminClient()` is a last resort and every use must be justified in a comment.
- Write a migration per logical change; never edit a shipped migration.
- Regenerate types (`pnpm db:types`) after every schema change.

---

# PHASE 0 — Correctness & safety (do this first; it's cheap and it's bleeding)

## 0.1 Fix the instructor identity bug (data leak)
`lib/instructor.ts:getMyInstructor()` and `app/instructor/actions.ts:myInstructorId()` both do:
```ts
.from("instructors").select(...).order("created_at").limit(1).maybeSingle()
```
with **no `profile_id` filter**, relying on RLS. But policy `instructors_select_verified` is `using (verified = true)` — so every verified instructor is selectable by any signed-in user. **"My instructor row" currently resolves to the oldest verified instructor in the table, not the caller.** Filter explicitly by `profile_id = auth.uid()` in both. Audit for the same pattern elsewhere.

## 0.2 Fix staff visibility
Migration `20260608204200_fix_self_referential_select_rls.sql` dropped `is_staff_or_admin()` from `clients_select`, leaving `is_admin() OR assigned_staff = auth.uid() OR profile_id = auth.uid()`. **A `staff` user with no assigned clients sees an empty pipeline.** Meanwhile `/admin/cases/[id]/packet` uses the service-role client after only `requireStaff()`, bypassing it — inconsistent. Decide the intended semantics (recommend: staff see all cases; assignment is for *ownership*, not *visibility*) and make RLS, the layouts, and the packet route agree.

## 0.3 Restore `requireAdmin()`
It's defined and never used. `setInstructorVerified`, `retireRequirement`, and `addRequirementVersion` are **legal-compliance-bearing** actions currently open to any `staff` user. Gate them with `requireAdmin()`.

## 0.4 Harden the public token flows
`reference_requests.token` and `cohabitants.token` are `randomUUID()` with **no expiry, no revocation, no rate limit**, served by the service-role client, behind which sit names, addresses, and notarized affidavits. Add: `expires_at` (default 30 days), `revoked_at`, a rate limit on the public routes, and a revoke/resend action in the (new) admin People tab.

## 0.5 Close the other holes
- `captureLead` — unauthenticated service-role insert. Add rate limiting + a honeypot or captcha.
- `/api/cron/reminders` — **open when `CRON_SECRET` is unset.** Fail closed.
- `lib/files/validator.ts` — **add HEIC/HEIF to `ALLOWED_EXTENSIONS`** (iPhone default; users are currently hard-blocked on a *required* document — the gun-safe photo). Add client-side downscale/compression before upload so a 12 MB phone photo becomes a compliant ~2 MB JPEG instead of a 5 MB rejection.

## 0.6 Zod the intake wizard
`app/portal/intake/actions.ts` has **zero zod**. `saveIntakeStep`/`completeIntake` write `answers as never` straight to jsonb. Define a `WizardAnswers` zod schema, parse in the action, and wire client-side validation via `react-hook-form` + `@hookform/resolvers` + `components/ui/form.tsx` (all installed, all unused here). Enforce: DOB present and ≥21, valid reference emails, **the correct reference count for the selected track** (see 1.1), narrative required for every disclosure.

## 0.7 Delete the fabricated social proof
`app/(marketing)/page.tsx` — `HudStat` shows "1200+ clients guided" and "98% on-time filing" for a pre-launch service. This is a GBL § 349 / DCWP deceptive-practices exposure in a category already under scrutiny. **Remove or replace with true numbers.** Add the standing disclaimer: *"We are not attorneys and do not represent you before the NYPD License Division. We cannot expedite or guarantee any outcome. You submit your own application."*

**GATE 0:** No unfiltered instructor query. Staff see their caseload. Admin-only actions are admin-only. Tokens expire. iPhone photos upload. Intake rejects invalid input. No fake stats. Commit.

---

# PHASE 1 — Correct the legal domain model

The requirements registry (`supabase/migrations/20260628000900_seed_requirements.sql`) has real errors. Its own header admits the citations are "BEST-EFFORT." Fix them, then have a lawyer verify.

## 1.1 Corrections (verified against NYPD's checklist, 38 RCNY, DCJS standards — July 2026)

| Code | Fix |
|---|---|
| **SOC-01** | **The CCIA social-media disclosure is permanently enjoined** (2d Cir. *Antonyuk*; cert denied Apr 2025; NY consented to permanent injunction 2026). NYPD's published checklist **still lists it** — the PDF is stale. → Change severity to **advisory/optional**, never blocking. Add an explanatory note citing the injunction. Do not collect it as mandatory. |
| **REF-01** | Track-dependent: **Carry/Special Carry = 4 total, ≥2 non-family** (§ 5-03(a)(1)), operationalized by NYPD as 2 + 2 **notarized** letters. **Premises = 2, non-family** (§ 5-05(b)(8)). **Renewals = exempt entirely** (§ 5-05(c)). Currently one flat rule — make it a function of `track` + `is_renewal`. |
| **TRN-01** | **16 hr in-person classroom + 2 hr live-fire**; written test ≥80%; live-fire qualification 4-of-5 at 4 yards on a 25½"×11" target. **Carry only — NOT premises.** **Must be completed ≤6 months before submission** (§ 5-03(a)(2)) → training is a **decaying asset**; model `completed_on` + `expires_on` and warn at T-60/T-30 days. Renewals: 2-hr live-fire cert dated within 6 months of renewal. |
| **FEE-01** | **$340** application (new *and* renewal) → NYPD. **$88.25** fingerprint fee → **NYS DCJS**, paid separately. (nyc.gov says $89.75; the portal says $88.25 — portal is likelier current.) No cash, no personal checks. All non-refundable. Retired LEO: application fee waived, print fee still owed. **Make all fees config-driven, not hardcoded.** |
| **DMV-01** | Lifetime abstract for **every state of residence in the past 5 years** (§ 5-05(b)(12)), not just NY. |
| **RES-01** | **Cell phone bills are NOT accepted.** Utility / cable / landline / gas only, OR lease/deed **plus** a filed NYS tax return with a matching address. |
| **Photo** | **Square, 600×600–1200×1200 px, taken within 30 days, chest-up, nothing obscuring identification** (§ 5-05(b)(1)). This is machine-checkable — build the validator (Phase 4). |
| **ARR-01** | Certificate of Disposition + affirmed written statement for **every** arrest and every criminal/OATH/TAB summons — **even if dismissed, sealed, or nullified.** Sealed arrests **are** disclosed to the License Division under CPL Art. 160; the UI must say this. Felony/serious offense → Certificate of Relief from Disabilities. |

## 1.2 Add the missing tracks

- **Non-resident carry** (38 RCNY § 5-03(b), eff. 1/5/2025). Requires an out-of-state background-investigation form completed by **local law enforcement in every jurisdiction of residence in the last 5 years**, plus disclosure of firearms licenses held elsewhere. You already price a `non_resident` package at "Custom" with **no requirements behind it.** Underserved, high-margin.
- **Retired LEO.** Separate document set: "Good Guy letter" (PD 643-155), Property Receipt/Discontinuance of Service (PD 520-013), Certificate of Service on agency letterhead. **Application fee waived.** Easy, high-conversion.
- **Premises Business.** Business docs + **two safe photos (door open, door closed, full safe, no stock images)**.

## 1.3 Every requirement carries provenance
`authority` (e.g. `38 RCNY § 5-03(a)(1)`), `source_url`, `verified_by`, `verified_on`, `needs_legal_review boolean`. Surface a **"Legal Verification" admin view** listing every unverified requirement. This replaces the ephemeral `/admin/verify-live` (which is `useState` and persists nothing).

**GATE 1:** Requirements are track- and renewal-aware. SOC-01 is non-blocking. Training expiry is modeled. Non-resident and Retired-LEO tracks generate correct checklists. Every rule cites an authority. Commit.

---

# PHASE 2 — THE CONSULTANT COCKPIT (the main event — this is where Fable 5 earns its price)

**This is the reason for the whole project.** The consultant is the paying customer's proxy; if they can't work fast and see everything, the product has no reason to exist.

## 2.1 Kill the two-checklist schism (do this first)

`/admin` reads `checklist_items` (V1, from `config/checklist-templates.ts`). `/portal` reads `case_requirements` (V2, from the rule engine). **The consultant and the client are looking at different checklists.**

Migrate every admin surface to `case_requirements`. Backfill existing cases. **Delete `config/checklist-templates.ts` and `components/admin/checklist-engine.tsx`'s V1 path. Delete the V1 fallback in `app/portal/checklist/page.tsx`.** One source of truth. This unblocks everything else in this phase.

## 2.2 Rebuild `/admin/cases/[id]` as a real case file

The current 6-tab layout is a good skeleton. Give it the V2 data it's missing. Target: **a consultant can answer any question about this case without leaving the page.**

**Left rail — always visible:**
- Applicant identity, track, borough, `ReticleProgress` (13 stages)
- **Blocking-requirement count** — the number that matters
- **Days in current stage** + **days since last client activity** (both currently uncomputed anywhere)
- Assigned consultant (with a **reassign** control — there is currently *no way to assign a case in the UI at all*)
- **Training expiry countdown** (from 1.1) — red at T-30
- Next appointment; last message

**Tabs:**
1. **Requirements** — `case_requirements`, grouped by stage, each showing status / bound document / authority. Bulk-approve. Filter to blocking-only.
2. **Disclosures — NEW, and the most important tab in the product.** `disclosures` + `intake_sessions.answers` are captured today and rendered **nowhere in admin.** A consultant currently *cannot read the applicant's arrest narratives before filing.* Build: every disclosure, its narrative, its bound Certificate of Disposition, a narrative-quality flag (empty / too short / unaffirmed), and a **"request a better narrative"** action that messages the client. Read-only on the facts — the consultant may prompt for completeness, never coach the content.
3. **Documents** — keep the existing review flow (it's good: signed URLs, approve, "needs fix" + note + auto-email). Add: side-by-side viewer, version history, and the **photo-spec validator result**.
4. **People** — references + cohabitants, each with **token status (sent / opened / submitted / notarized)**, a **resend** and a **revoke** action. Today admin sees only a static received/notarized table with no token visibility and no resend.
5. **Training & Scheduling** — the marketplace data (`case_offers`, `engagements`, `bookings`, `availability_slots`) that admin currently **cannot see at all**. Which instructor, which slot, confirmed or not, live-fire done, cert uploaded, **expiry date**.
6. **Notes — NEW TABLE.** There is no notes table anywhere in the schema. A consultant on 40 cases cannot remember 40 conversations. `case_notes (case_id, author, body, pinned, created_at)`. Pinnable. Searchable. **This is the single highest-leverage missing feature in the repo.**
7. **Messages** — keep `MessageThread`; add templates (2.5).
8. **Activity** — keep the append-only log.

## 2.3 Tasks that actually work
Today `TaskList` can only **close** a task; tasks are created only by the seed script and the lead form. A consultant cannot write *"call client re: safe photos, due Friday."* Build: create, assign (to any staff), due date, priority, reopen, per-case task list, and a **cross-case "My Queue"** on `/admin`.

## 2.4 The pre-filing QA gate (CP-5) — mandated by your own architecture doc, enforced nowhere
`setCaseStage` currently enforces **nothing** — any stage can be dragged to any other on the kanban. Add a server-side gate:

**A case cannot enter `application_assembled` / `filed` unless:**
- every **blocking** `case_requirement` is `satisfied`
- every `disclosure` has a non-empty, affirmed narrative
- the training certificate exists **and is dated within 6 months** of today
- the reference count matches the track (4 for carry, 2 for premises, 0 for renewal), with the notarization requirement met
- the photo passes the NYPD spec
- **a named staff member has signed off**, recorded in `activity_log` with their user id and timestamp

Failing the gate returns a **specific, actionable blocker list** — not a generic error. Persist the sign-off per case (replacing the ephemeral `/admin/verify-live`). This gate is your legal and commercial moat: it is the mechanism by which you actually reduce denials, and it's the thing you can honestly market.

## 2.5 Consultant throughput features
- **Unified inbox** — messages are currently reachable *only* by opening each case one at a time. Build a cross-case inbox with unread badges.
- **Message templates** — the 15 things a consultant types every week.
- **Cases table** — add sort, pagination (it currently fetches every case unbounded), and columns for last activity, days in stage, blocking count, assigned staff. Add an **"assigned to me"** filter.
- **Pipeline board** — surface the stall signal on the card: days in stage, blocking count, a red edge past SLA.
- **Saved views** — "my blocked cases," "awaiting doc review," "ready to file."
- **Keyboard-first**: `⌘K` command palette (jump to case, jump to client, create task).

## 2.6 Finish the reminder engine
Only 4 of 9 rules exist (`doc_rejected`, `reference_unfilled`, `booking_confirmed`, `new_offer`). Build the missing five:
- **booking 24h / 2h** reminders
- **stage stalled** (configurable per stage)
- **long-lead nudge (day 3 / day 7)** — *your own architecture doc names this the primary lever* and it was never built. If training and prints don't start in week one, the case is already late.
- **pre-filing QA ready** — tell the consultant when a case has cleared 2.4

Keep the `reminder_log` idempotency pattern. Consolidate `lib/reminders.ts` and `lib/reminders/engine.ts` — both exist; that's a v1/v2 leftover.

**GATE 2:** One checklist. A consultant can read every disclosure narrative, see every booking, resend a reference link, write a note, create a task, reassign a case, and is *physically prevented* from filing an incomplete application. Commit.

---

# PHASE 3 — Revenue and retention

## 3.1 Turn on the money
Stripe is **fully coded** (Checkout, Connect, webhooks, 10% platform fee) and **switched off by flag**. `SERVICE_PACKAGES` ($499 / $1,999 / Custom / $399) renders the pricing page — and **the buttons link to `/eligibility`.** The only way to get paid today is for a human to manually raise an invoice.

- Self-serve purchase from `/pricing` and from the eligibility-quiz result.
- Move `SERVICE_PACKAGES` out of `lib/stripe/index.ts` and into the DB so pricing changes don't need a deploy.
- Deposit → balance-on-filing flow.
- Keep the manual-invoice path for the custom/non-resident track.

## 3.2 The 3-year relationship (this is the real business)
The license is valid **3 years**. Your product currently ends at "filed." Build the post-issuance lifecycle (38 RCNY §§ 5-24, 5-25) — every item is a notification, a compliance feature, and a retention hook:
- **Purchase authorization** — valid **30 days**; countdown.
- **One handgun per 90 days** — enforce/track the window.
- **72-hour inspection window** after purchase, before the licensee may take possession — a hard, easily-missed deadline. This alone justifies the app staying installed.
- **§ 5-24 reporting duties** — address change, **email change**, arrest/indictment/summons/conviction, psychiatric or substance-abuse treatment, becoming subject to an OOP/TOP/ERPO. Each is a guided flow.
- **Renewal runway** — NYPD mails renewal instructions; you cannot submit before receiving them. Start the runway at T-9 months. Renewals need **no references** but **do** need a live-fire cert dated within 6 months.
- **Special Carry dependency** — voids automatically if the underlying county license lapses. Model it; watch it.

## 3.3 The appeal seam
Denial → 90-day window → sworn, notarized appeal → **only the applicant or a NY-licensed attorney may submit it**; no new documents are considered. You **cannot** file it. You **can**: assemble the record, produce the packet, and hand off to a partner attorney. Build the referral seam and the record-export. Honest, valuable, and a revenue share.

**GATE 3:** A stranger can buy a package without talking to anyone. A licensed client still has a reason to open the app 18 months later. Commit.

---

# PHASE 4 — Trust, polish, and taste

## 4.1 The marketing restraint pass
**Keep the entire design system.** `config/brand.ts` + `globals.css` + `components/ui/*` + `/style-guide` are excellent — obsidian/brass/signal-cyan, Space Grotesk, JetBrains Mono `.engraved` labels, the tight `0.3rem` radius, `.glass-premium`, `ReticleProgress`, `HudStat`, and correct `prefers-reduced-motion` gating throughout. Do not touch the tokens.

**Delete the tactical cosplay.** Your buyer is a nervous first-time applicant — a professional, often older, often a woman — paying up to $1,999 because this process frightens them. They need "my lawyer's office," not a HUD:
- **Delete `BootIntro`** — a 2-second "CALIBRATING OPTICS / SECURING SESSION" splash on every session.
- **Delete `CursorReticle`** — a crosshair cursor.
- **Delete `PrecisionTest`** — a reaction-time shooting mini-game on the homepage of a legal-compliance company.
- Tone down `Magnetic` buttons and `JourneyScroll`.

Target the restraint level of the **portal**, which is already the best-looking surface in the app. Same visual language, adult volume.

## 4.2 The photo validator (a visible trust win)
NYPD's spec is machine-checkable: **square aspect, 600×600–1200×1200 px, ≤30 days old, chest-up.** Validate client-side, show a live pass/fail with a crop tool. This is the kind of small, concrete competence that sells the whole product.

## 4.3 Loading and error states — currently *zero*
`find app -name loading.tsx` → **0 files.** Zero `error.tsx`, zero `not-found.tsx`, zero `global-error.tsx`. Every portal page is an async server component running sequential Supabase queries with no streaming — a **blank stall on every navigation**, and a default Next.js crash screen on any throw. You already wrote a `.shimmer` utility in `globals.css` and never used it. Add `loading.tsx` + `error.tsx` per route group, Suspense boundaries, and skeletons.

## 4.4 Onboarding
Signup drops the user cold onto `/portal` with three competing banners and no "start here." Build a 60-second welcome: what happens, how long it takes, what you'll need, **and start the long-lead items (training, prints) immediately** — that's the whole thesis. Persist the eligibility-quiz answers (currently pure `useState`; a refresh loses them) and carry them into intake.

## 4.5 Accessibility
~30 aria attributes in the whole codebase, mostly `aria-hidden` on decorations. Intake uses raw `<input type=checkbox>` and raw `<select>` with no label wiring while `components/ui/checkbox.tsx` and `select.tsx` sit unused. Fix: real form controls, `aria-current="step"` on the StepRail, focus management on overlays, a skip link, `role="alert"` on validation errors. (Reduced-motion is already handled well — preserve it.)

## 4.6 Debt
- De-duplicate: `document-uploader` / `notarized-upload` (~80% shared → one hook); `reference-flow` / `cohabitant-flow` (near-identical twins → one parameterized flow).
- Replace the hardcoded borough/ZIP centroids in `lib/geo/nyc.ts` with a real geocoder.
- Create the missing `/api/calendar/google/callback` route, or remove the Google Calendar path entirely and rely on the (working) ICS invites.
- Replace the placeholder contact data in `config/brand.ts` (`carry.example`, `(212) 555-0142`).

## 4.7 Tests — there is no test framework at all
No jest, no vitest; only ad-hoc `scripts/verify-p*.ts`. Add **Vitest** and cover, at minimum:
- the requirements rule engine (every track × renewal × disclosure permutation)
- **an RLS test matrix** — one test per role per table, asserting both allow and deny
- the pre-filing QA gate (2.4) — every blocker path
- the file validator (HEIC, size, filename sanitization)

## 4.8 Documentation
`AGENTS.md` and `CLAUDE.md` carry **zero project knowledge** despite ~1,800 lines of migrations and four architecture docs. `README.md` omits the instructor surface, the marketplace, intake, the requirements engine, and signatures — and still says "CarryPath." Rewrite both. Archive the stale V2 prompt docs (`CCW_V2_Master_Build_Prompt.md` and `CCW_V2_ClaudeCode_Prompt.md` contradict each other and the build already ran).

**GATE 4:** The site reads like a law firm, not a shooting range. Nothing stalls blank. Nothing crashes to a Next.js error page. Tests pass. Commit.

---

# WORKING AGREEMENT

- **One phase at a time.** Stop at each gate. Show me the diff and a summary. Wait for approval.
- **When the plan and reality disagree, tell me** — don't paper over it. The V2 docs are already stale in exactly this way.
- **When a requirement is legally uncertain, mark it `needs_legal_review` and surface it.** Do not guess at law and do not invent citations.
- **You may push back on this spec.** If Phase 2 should be sequenced differently, or a feature is a trap, say so before building it.
- Every phase ends with: migration + types regenerated + zod at the boundary + RLS + a test + a working UI. No phase is "done" with a TODO in it.

---

*Companion document: `CCW_V3_AUDIT.md` — the evidence base, with file paths and line-level findings.*
