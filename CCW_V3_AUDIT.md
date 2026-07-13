# CCW / CARRY — V3 Audit & Upgrade Analysis
**Date:** 2026-07-13 · **Scope:** full-system audit against market-readiness for NYC (NYPD License Division)

---

## 0. Executive summary

**The build is far better than you think it is.** 34 tables with full RLS, 13 migrations, 55 server actions, a working requirements rule-engine, a real PDF packet assembler, tokenized public reference/cohabitant flows with e-signature, a PostGIS instructor marketplace, and a genuinely distinctive design system. This is not a prototype.

**Your instinct that it "isn't ready and doesn't fully do what it needs to do" is correct — but for reasons other than the ones you named.** The problems are not breadth. They are:

1. **A legal exposure that must be resolved before launch** (§1). This is the only item that can kill the company. Everything else is engineering.
2. **The V2 upgrade shipped for the applicant and never shipped for the consultant.** The admin surface is still reading V1 tables. Your consultant literally cannot see the applicant's disclosures, intake answers, bookings, or real requirement checklist. (§3)
3. **No revenue path.** Stripe is fully coded and switched off. Pricing buttons link to a quiz. The only way to get paid is for a human to manually raise an invoice. (§4)
4. **The highest-stakes form in the product has zero validation.** The intake wizard writes unvalidated JSON to the database. Nothing enforces 4 references, a valid email, a DOB. (§4)
5. **The visual problem is real but inverted from what you assume.** The design *system* is your strongest asset. The *marketing surface* is over-designed to the point of undermining trust. (§5)

---

## 1. ⚠️ LEGAL — READ THIS BEFORE ANY ENGINEERING

This is not a footnote. It determines what you are allowed to build.

**NYPD publishes an explicit position on companies like yours** ([licensing.nypdonline.org/new-app-instruction](https://licensing.nypdonline.org/new-app-instruction/)):

> "Consulting companies are not required to be used… These firms **cannot** obtain a handgun license… **nor can they expedite your application**… such services are **not required or endorsed** by the New York City Police Department and… **only an attorney licensed by the State of New York can represent you before the License Division.**"

And it is binding at the appeal stage — 38 RCNY (eff. 1/5/2025): *"Appeals… submitted by individuals or business entities other than the applicant or their New York State licensed attorney **shall not be accepted**."*

**Context you need to know:** NYC's License Division was the subject of a federal bribery prosecution in which consultants and attorneys — called "expediters" — paid NYPD supervisors to fast-track licenses. Attorney John Chambers was convicted and disbarred in 2018. Prosecutors called the sector *"a cottage industry of parasitic profiteers."* **Your category inherits that frame by default.** Your product must be visibly, structurally the opposite of that.

### Consequences for the product

| You CAN build | You CANNOT build |
|---|---|
| Document collection, checklist, deadline tracking, reminders | Anything that **represents** the applicant before NYPD |
| Photo/format QA against NYPD's pixel spec | Any claim to **expedite**, **guarantee**, or influence outcomes |
| Referral to DCJS-authorized instructors, notaries, attorneys | Submission of the application under the applicant's credentials |
| Education, interview prep, readiness coaching | Advice on how to *handle* a disclosure (that's law practice — Judiciary Law §§ 478/484, a misdemeanor) |
| Prompts that **maximize candor** | Any feature that helps **minimize or optimize** a disclosure |

### Three product principles to encode, permanently

1. **The applicant submits. Always.** The platform prepares; the human files through the NYPD portal with their own credentials. Never store or use NYPD portal credentials.
2. **Candor-maximizing by design.** § 5-10(e) and (n) make false statements and "lack of candor" the dominant denial grounds. Every disclosure feature should push *toward* fuller disclosure. This is both ethically right and commercially right — a denial is your worst outcome.
3. **Attorneys do the advising.** If you want to analyze someone's 2011 arrest and tell them what it means, that must be delivered by a NY-licensed attorney on the platform, not by your software or your "consultant." Build the attorney-referral seam now.

### Immediate copy fixes (today)

- `app/(marketing)/page.tsx` — the `HudStat` counters ("1200+ clients guided", "98% on-time filing") are **fabricated**. On a pre-launch service, in this category, this is a GBL § 349 / DCWP deceptive-practices liability and a gift to any journalist. **Delete or replace with real numbers.**
- Add a persistent, non-dismissible disclaimer at signup and in the footer: *"We are not attorneys and do not represent you before the NYPD License Division. We cannot expedite or guarantee any outcome. You submit your own application."*
- Purge any copy using: guarantee, expedite, fast-track, insider, approval rate.

**Action: get a NY attorney to review the product surface before launch.** Not optional. Budget for it.

---

## 2. Domain corrections (your requirements registry has errors)

Verified against NYPD's checklist, 38 RCNY, and DCJS training standards.

| Req | Current state | Correction |
|---|---|---|
| **SOC-01 (social media)** | Seeded as a requirement | **The CCIA social-media disclosure is permanently enjoined.** SCOTUS denied cert Apr 2025; NY agreed to a permanent injunction in 2026. NYPD's *published checklist still lists it* (stale). → Make it **optional/advisory with an explanatory note**. Never blocking. |
| **REF-01 (references)** | Verify count | Carry/Special Carry: **4 total, ≥2 non-family** (38 RCNY § 5-03(a)(1)); NYPD operationalizes as **2 + 2 notarized letters**. Premises: **2, non-family** (§ 5-05(b)(8)). **Renewals are exempt from references entirely** (§ 5-05(c)). |
| **TRN-01 (training)** | Verify | **16 hr in-person classroom + 2 hr live-fire**, written test ≥80%, live-fire qualification 4-of-5 at 4 yards. **Must be completed ≤6 months before submission** — training can *expire*. You must track this as a decaying asset. **Carry only** — not premises. |
| **FEE-01** | Verify amounts | **$340** application (new AND renewal) to NYPD; **$88.25** fingerprint fee to **NYS DCJS**, paid separately. (nyc.gov says $89.75 — portal is likelier current.) Cash and personal checks not accepted. All non-refundable. Make configurable. |
| **DMV-01** | Present | Lifetime abstract for **every state of residence in the past 5 years** (§ 5-05(b)(12)) — not just NY. |
| **Photo** | Not validated | **Square, 600×600 to 1200×1200 px, taken within 30 days, chest-up.** This is machine-checkable. Build the validator — it's a visible, high-trust win. |
| **Proof of residence** | Present | **Cell phone bills are NOT accepted.** Utility/cable/landline/gas only, OR lease/deed + filed NYS tax return with matching address. |
| **Arrests** | Present | Certificate of Disposition + affirmed written statement for **every** arrest, summons (criminal/OATH/TAB) — **even if dismissed, sealed, or nullified.** Sealed arrests ARE disclosed to the License Division under CPL Art. 160. Felony/serious offense → Certificate of Relief from Disabilities. |

### Missing from the model entirely

- **Non-resident carry track** (38 RCNY § 5-03(b), eff. 1/5/2025). Requires an out-of-state background form completed by local law enforcement in **every jurisdiction of residence in the last 5 years**. You have a `non_resident` package priced "Custom" and no requirements behind it. **This is an underserved, high-margin segment.**
- **Retired LEO track** — separate document set (PD 643-155 "Good Guy letter", PD 520-013), **application fee waived**. Easy, high-conversion segment.
- **Post-issuance lifecycle** (§ 5-24, § 5-25) — purchase authorization (30-day validity), **one handgun per 90 days**, **72-hour inspection window** after purchase, mandatory reporting of address/email change, arrest, OOP, psychiatric treatment. **This is your retention product.** The license is 3 years; the relationship should be 3 years. Right now the product ends at "filed."
- **Appeal path** — 90-day window, sworn/notarized, no new documents considered. You cannot file it; you *can* prepare the record and hand off to an attorney. Good referral revenue.
- **Special Carry dependency** — voids automatically if the underlying county license lapses. Needs to be a modeled dependency.

---

## 3. The core structural defect: the consultant is running on V1

Your V2 build (requirements engine, intake, disclosures, marketplace, bookings, reference tokens) shipped to the **client portal** and the **instructor** surface. It **never shipped to `/admin`**.

Concretely, `/admin` reads `checklist_items` (V1, seeded from `config/checklist-templates.ts`) while `/portal` reads `case_requirements` (V2, from the rule engine).

**Your consultant and your client are looking at two different checklists.** That is the single most damaging bug in the repo.

`/admin` never touches: `case_requirements`, `intake_sessions`, `disclosures`, `bookings`, `case_offers`, `engagements`, `reference_requests`, `signatures`, `availability_slots`.

### What that means the consultant cannot do

- **Read the applicant's disclosure narratives.** The entire architectural thesis is "disclosure discipline." That data is captured and rendered *nowhere* in admin. A consultant cannot QA a filing they cannot read.
- **See intake answers.** `intake_sessions.answers` is invisible to staff.
- **See the real requirement state.** They see a stale template.
- **See bookings, offers, or which instructor is on the case.**
- **See reference-request token status** (sent / opened / submitted / notarized) or resend a link.

### What a multi-case consultant needs and does not have

| Missing | Why it matters |
|---|---|
| **Case notes** | There is no notes table. None. A consultant on 40 cases cannot remember 40 conversations. **This is the #1 most-used feature in any case-management tool and it does not exist.** |
| **Task creation** | `TaskList` can only *close* tasks. Tasks are created only by the seed script and the lead form. A consultant cannot write "call client re: safe photos, due Friday." |
| **Case assignment** | `clients.assigned_staff` exists, is displayed read-only, and **there is no UI to assign or reassign.** A two-consultant firm cannot divide work. No "my cases" filter. |
| **Cross-case inbox** | Messages are reachable only by opening each case one at a time. No unread badge, no unified inbox, no templates. |
| **Aging / SLA / stall detection** | No "days in stage," no "no client activity in N days," no blocked-reason surfacing. |
| **Pre-filing QA gate (CP-5)** | Your own architecture doc mandates a staff QA gate before `filed`. `setCaseStage` enforces **nothing** — any stage can be dragged to any other. |
| **Cases table basics** | No sort, no pagination, no last-activity column. Fetches every case unbounded. |
| **Calendar that creates anything** | `/admin/calendar` is a read-only agenda and says so: *"Full calendar view comes in a later phase."* |
| **`/admin/verify-live`** | Ephemeral `useState`. Nothing persists, nothing is per-case, nothing is audited. And it isn't even in the sidebar. |

### Reminder engine: 4 of 9 rules built

Built: `doc_rejected`, `reference_unfilled`, `booking_confirmed`, `new_offer`.
**Missing: booking 24h/2h, stage-stalled, long-lead nudge (day 3/7), pre-filing QA ready.** The long-lead nudge is named in your own architecture doc as *the primary lever* — get training and prints started on day one, in parallel. It was never built.

---

## 4. Applicant-side defects

1. **Intake wizard has no validation.** `app/portal/intake/actions.ts` contains **zero zod**. `saveIntakeStep`/`completeIntake` take `answers: WizardAnswers` and write straight to jsonb (`answers as never`). Client-side: no required fields, no email format check, no date sanity, **no enforcement of the 4-reference rule** — the copy says 4 required, the UI accepts 0. `zod`, `react-hook-form`, and `components/ui/form.tsx` are all installed and unused here. **This is the #1 engineering fix.**
2. **Uploads will fail for iPhone users.** **HEIC is not in `ALLOWED_EXTENSIONS`** (`lib/files/validator.ts`) — it's the iPhone default. Plus a 5 MB hard cap with no client-side compression, when a required document is *a photo of a gun safe taken on a phone*. A large share of your users will hit a wall on a mandatory step.
3. **No revenue path.** `SERVICE_PACKAGES` ($499 / $1,999 / Custom / $399) renders the pricing page — and the buttons **link to `/eligibility`**. The only payment flow is: admin manually creates an invoice → client pays it. Stripe is fully coded (Checkout + Connect + webhooks, 10% platform fee) and **switched off by flag**. You have built a payments system and no way to buy anything.
4. **Zero loading and error states.** `find app -name loading.tsx` → **0 files**. Zero `error.tsx`, zero `not-found.tsx`. Every portal navigation is an async server component doing sequential Supabase queries with **no streaming and no skeleton** — a blank stall on every click. A `.shimmer` utility is defined in `globals.css` and never used. Any server throw = default Next.js error screen.
5. **No onboarding.** Signup drops you cold onto `/portal` with three competing banners and no "start here."
6. **Eligibility quiz isn't persisted** — pure `useState`, refresh loses it.
7. **Accessibility is weak.** ~30 aria attributes total, mostly `aria-hidden` on decorations. Intake uses raw `<input type=checkbox>` and raw `<select>` with no label wiring, while `components/ui/checkbox.tsx` and `select.tsx` sit unused. StepRail has no `aria-current="step"`. `BootIntro` is a full-screen overlay explicitly documented as "not a focus trap." No skip link. (Reduced-motion handling *is* excellent — that's the one win.)

---

## 5. The visual verdict — the opposite of what you assumed

**Your design system is excellent and you should keep almost all of it.** `config/brand.ts` + `app/globals.css` + `components/ui/*` + `/style-guide` is a coherent, deliberate identity — obsidian/brass/signal-cyan, Space Grotesk display, JetBrains Mono engraved micro-labels, a tight `0.3rem` radius that immediately separates it from every default-shadcn app, real `.glass-premium` layering, and a full motion vocabulary correctly gated behind `prefers-reduced-motion`. `components/ui/*` is **not** stock shadcn — the buttons, badges, `HudStat`, and `ReticleProgress` are bespoke and good. This is the strongest asset in the repo.

**The problem is taste calibration on the marketing surface, not quality.** In front of a $2,000 legal-compliance service, for an audience of nervous first-time applicants — professionals, older people, women, people who find this process intimidating — you currently have:

- a **2-second "CALIBRATING OPTICS / SECURING SESSION" boot sequence** on every session (`BootIntro`)
- a **custom crosshair cursor** (`CursorReticle`)
- a **reaction-time shooting mini-game** on the homepage (`PrecisionTest`)
- magnetic buttons, a scroll-jacking journey, an animated aurora
- **fabricated social proof**

This reads as tactical cosplay. It signals "gun guy" when your buyer needs "my lawyer's office." The people most likely to pay $1,999 for concierge handling are the people most likely to bounce off a crosshair cursor.

**Recommendation:** keep every token, every component, the glass, the brass, the mono labels, the reticle progress rail. **Delete `BootIntro`, `CursorReticle`, and `PrecisionTest`.** Dial the marketing page down to the restraint level of the portal — which is already the best-looking surface in the app. Same visual language, adult volume.

---

## 6. Technical debt

- **Two competing checklist sources of truth** (`checklist_items` vs `case_requirements`) — the V2 data-model doc said to deprecate the static config; it never happened, and admin still depends on it.
- **Instructor identity-resolution bug** (`lib/instructor.ts:getMyInstructor()`, `app/instructor/actions.ts:myInstructorId()`): both do `.from("instructors").select().order("created_at").limit(1).maybeSingle()` **without filtering by `profile_id`**, relying on RLS — but policy `instructors_select_verified` is `using (verified = true)`, so every verified instructor is selectable by any signed-in user. **"My instructor row" resolves to the oldest verified instructor, not the caller.** Live correctness bug and a data leak.
- **`requireAdmin()` is defined and never used.** Every `/admin` route uses `requireStaff()` — so `staff` can verify instructors and edit the legal requirements registry.
- **Staff visibility is broken.** `clients_select` RLS is `is_admin() OR assigned_staff = auth.uid() OR profile_id = auth.uid()` — `is_staff_or_admin()` was dropped in a fix migration. **A `staff` user with no assigned clients sees an empty pipeline.** Meanwhile the packet route uses the service-role client after only `requireStaff()`, bypassing it. Inconsistent.
- **Public tokens** (`reference_requests.token`, `cohabitants.token`): `randomUUID()`, **no expiry, no revocation, no rate limit**, served by the service-role client. Given the data behind them (names, addresses, notarized affidavits), add expiry + revocation + rate limiting.
- **`captureLead`** — unauthenticated, service-role, row-creating server action. No captcha, no rate limit.
- **`/api/cron/reminders`** is **open when `CRON_SECRET` is unset.**
- **No test framework at all.** No jest, no vitest. Only ad-hoc `scripts/verify-p*.ts`.
- **Missing route:** `/api/calendar/google/callback` is referenced in `.env.example` and does not exist — `calendar_connections` can never be populated.
- **`lib/geo/nyc.ts`** — hardcoded borough + 8 ZIP centroids. All geo-matching resolves to a borough centroid. No real geocoder.
- **Duplication:** `document-uploader` / `notarized-upload` (~80% shared); `reference-flow` / `cohabitant-flow` (near-identical twins); `lib/reminders.ts` **and** `lib/reminders/engine.ts` both exist.
- **`config/brand.ts` has placeholder contact data** — `carry.example`, `(212) 555-0142`.
- **`AGENTS.md` / `CLAUDE.md` carry essentially zero project knowledge** despite ~1,800 lines of migrations and four architecture docs. `README.md` omits the instructor surface, marketplace, intake, requirements engine, and signatures, and uses the old "CarryPath" brand name.

---

## 7. Prioritized roadmap

### P0 — Ship-blockers (nothing launches without these)
1. Legal review by a NY attorney. Disclaimer surface. Delete fabricated stats. Purge expedite/guarantee copy.
2. Correct the requirements registry (SOC-01 optional; REF-01 counts; TRN-01 6-month expiry; FEE-01 amounts).
3. Zod validation on intake + the 4-reference rule.
4. HEIC support + client-side image compression.
5. Fix the instructor identity bug; fix staff RLS visibility; add `requireAdmin()` to registry + verification actions; expire/revoke/rate-limit public tokens; secure the cron route.

### P1 — The consultant cockpit (this is the actual product)
6. Migrate `/admin` to `case_requirements`. Delete `config/checklist-templates.ts`. One source of truth.
7. **Disclosure review surface** — the consultant must read every narrative before filing.
8. **Case notes** (new table) — the single highest-leverage missing feature.
9. **Task creation + assignment + due dates.**
10. **Case assignment / reassignment UI + "my cases" filter.**
11. **Pre-filing QA gate (CP-5)** — `setCaseStage` must block `filed` until every blocking requirement is `satisfied` and every disclosure has a narrative. Persist `/admin/verify-live` per case with an audit trail.
12. **Cross-case inbox** with unread badges + message templates.
13. **Aging/stall surfacing** — days-in-stage, last-client-activity, blocked reason, on the cases table and the pipeline.

### P2 — Revenue + retention
14. Turn Stripe on. Self-serve package purchase from `/pricing`. Move `SERVICE_PACKAGES` into the DB.
15. Non-resident and Retired-LEO tracks (new requirement sets, new revenue).
16. Post-issuance lifecycle: purchase authorization, 90-day rule, 72-hour inspection, § 5-24 reporting duties, renewal runway. **Turn a 6-month transaction into a 3-year relationship.**
17. Complete the reminder engine (5 missing rules — especially the day-3/day-7 long-lead nudge).

### P3 — Polish
18. `loading.tsx` + `error.tsx` + streaming everywhere. Use the `.shimmer` you already wrote.
19. Onboarding flow after signup.
20. Marketing restraint pass — delete BootIntro / CursorReticle / PrecisionTest.
21. Accessibility pass — real form controls, `aria-current`, focus trap, skip link.
22. Photo validator against the NYPD 600×600–1200×1200 square spec.
23. Vitest + an RLS test matrix. Rewrite `AGENTS.md` and `README.md`.

---

## 8. What to hand Fable 5

See **`CCW_V3_BUILD_PROMPT.md`** — the phased build prompt, written to be run in Claude Code with Fable 5.

**Model routing for this project:**
- **Fable 5** — P1 (the consultant cockpit; multi-file, cross-cutting, needs to hold the whole data model in its head), the `/admin` V2 migration, the QA gate, and the post-issuance lifecycle. These are exactly its long-horizon strength.
- **Opus 4.8** — P0 fixes, P2 Stripe wiring, P3 polish. Well-scoped, cheaper, no reason to pay 2×.
- **Sonnet** — copy, content, tests, `loading.tsx` boilerplate.
