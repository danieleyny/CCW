# CCW / CARRY — V4 Build Prompt (Claude Code + Fable 5)

> **Hand this whole file to Fable 5 in Claude Code.** Two workstreams: **A) Correctness** (the V3 build reported items as done that are not — three are ship-blockers) and **B) Visual & narrative redesign** (the site is competent and forgettable; it should be the reason people trust you).
>
> Companions: `CCW_V3_AUDIT.md` (original evidence base) · `CCW_V3_PUNCHLIST.md` (verification findings, file:line).
> **Read `AGENTS.md` first.** All V3 guardrails still bind — especially the legal ones.

---

# STANDING GUARDRAILS (unchanged, non-negotiable)

**Legal.** NYPD's published position: consulting firms **cannot represent** an applicant (only a NY-licensed attorney can), **cannot expedite**, are **not endorsed**. The License Division was the subject of a federal bribery prosecution of consultant "expediters." Therefore, permanently:
1. **The applicant always submits their own application.** Never store or use NYPD portal credentials.
2. **Candor-maximizing, never disclosure-minimizing.** No feature may suggest what to omit or how to characterize. Sealed and dismissed arrests **are** disclosed to the License Division — say so plainly.
3. **No legal advice.** Anything adjudicative routes to a NY-licensed attorney.
4. **Never** use *guarantee, expedite, fast-track, insider, approval rate* in any copy. Every current occurrence in the repo is a negation — keep it that way.
5. No invented legal citations. Unsure → `needs_legal_review = true`.

**Engineering.** Zod at every server-action boundary. RLS in the same migration as any new table. `requireRole/requireStaff/requireAdmin` in layouts *and* actions. Never widen `createAdminClient()` usage. Colors only from `config/brand.ts`. Every animation respects `prefers-reduced-motion`. Mobile-first, verified at 390px. Regenerate types after schema changes.

---

# WORKSTREAM A — CORRECTNESS (do this first; it's the part that can hurt you)

The V3 build was strong — the checklist schism is genuinely dead, disclosures are readable, notes/tasks/assignment/inbox are wired, the reminder engine is complete, tokens are hardened. `tsc --noEmit` is clean. But verification against the code (not the commit messages) found three blockers reported as done.

## A1. 🔴 The CP-5 pre-filing gate is bypassable

This is the product's core promise, its legal moat, and the thing you market on. It does not hold. Fix all three defects:

**A1a — The gate guards 2 of 13 stages.**
`lib/qa-gate.ts:17` — `GATED_STAGES = ["application_assembled","filed"]`. But `config/stages.ts` defines four stages *after* `filed`: `fingerprinting_booked`, `under_investigation`, `decision`, `licensed`. `setCaseStage` (`app/admin/actions.ts:31`) validates only stage-key membership — **no ordering or adjacency check**. The kanban renders every stage as a droppable column (`components/admin/pipeline-board.tsx:163`) and `StageControl` offers all 13.

> **A consultant can drag a case with zero satisfied requirements from `document_collection` straight to `under_investigation` or `licensed`, and the gate never runs.**

Fix: reject any transition *into or past* `stageIndex("application_assembled")` unless the gate passes. Gate on the index, not on a hardcoded pair.

**A1b — The `na` escape hatch.**
Blocker filter is `req?.blocking && r.status === "pending"` (`lib/qa-gate.ts:59-62`), but `case_req_status` is `('na','pending','satisfied','rejected')`. The requirements UI exposes an **"N/A" button** to any staffer (`components/admin/requirements-review.tsx:107`). One click on a blocking requirement and it silently stops blocking.

Fix: **forbid `na` on blocking requirements entirely** (a legally-required document is never N/A), and count `rejected` as open. Enforce in the server action *and* a DB check constraint.

**A1c — The photo check isn't in the gate.**
`GateBlocker.kind` has no photo variant; `evaluatePreFilingGate` never touches it. Photo validation exists **client-side only** (`lib/files/photo-spec.ts` — its own header says "Browser-only"). An off-spec photo satisfies IDN-04 unchecked.

Fix: re-validate dimensions server-side inside the gate (square within tolerance, 600×600–1200×1200).

**A1d — Then write its tests.** `lib/qa-gate.ts` currently has **zero unit coverage** — the single most legally load-bearing function in the repo. Cover **every blocker path**: each blocking-requirement state, empty/short narrative, expired training, each track's reference count, off-spec photo, missing sign-off, and each gated stage transition including the bypasses above.

## A2. 🔴 The entire retention product is unreachable

**Nothing in the application ever writes `cases.license_expires_on` or `county_license_expires_on`.** The only writers in the repo are `scripts/seed.ts:334` and `scripts/verify-v3p3.ts`. `app/admin/actions.ts` can set stage, status, and assigned staff — **there is no admin field to record that a license was issued.**

Consequence: the renewal runway (T-9mo), the license-status card, the Special Carry county watcher, and the `renewal_runway` + `county_license_expiring` reminder rules are all correctly built, correctly tested, and **reading a column nobody can fill.** Phase 3's entire 3-year-relationship thesis is inert in production.

Fix: add **"Record license issued"** to the admin case file — license type, issue date, expiry date, and (Special Carry only) the underlying county license expiry. Write it, log it to `activity_log`, and let the lifecycle switch on. Also add `/portal/license` and `/portal/appeal` to `components/portal/portal-nav.tsx` — they are currently reachable only via cards on the portal home.

## A3. 🔴 Write the RLS test matrix

There is none. Grep `tests/` for `rls|policy` → nothing. RLS is the only thing standing between a client and someone else's arrest record, sealed-arrest disclosure, psychiatric history, and home address. Vitest is installed and configured; there are 4 test files and 28 assertions covering the rule engine, intake schema, file validator, and license math — good, but not this.

Build a real matrix: **one test per role (`client`, `staff`, `admin`, `instructor`, anon) per table**, asserting **both allow and deny**. Special attention to: `disclosures`, `documents`, `case_notes`, `intake_sessions`, `reference_requests`, storage objects, and the `instructor_offer_feed` view's PII redaction.

## A4. 🟠 Correctness, second tier

| # | Fix | Evidence |
|---|---|---|
| A4a | **`clients.track` is never written from intake.** A self-serve applicant who selects "premises" or "non-resident" gets the correct *requirements* but keeps `track = 'resident'` in the DB and in every admin display. The enum lacks `retired_leo` and `premises_business` entirely. → Extend the enum; write the track from `completeIntake`. Also: `qa-gate.ts:45` selects `clients(track)` and never uses it. | `20260608194250:10` |
| A4b | **The requirements backfill is a script, not a migration** (`scripts/backfill-requirements.ts`). If it isn't run against prod, **legacy cases render an empty checklist on both sides.** → Convert to an idempotent migration. | not in `supabase/migrations/` |
| A4c | **`requirements_write` RLS is still `is_staff_or_admin()`.** `requireAdmin()` was added at the app layer only — a `staff` session hitting PostgREST directly can rewrite the legal registry. → Tighten RLS to `is_admin()`. | `20260628000200:102-104` |
| A4d | **No training-expiry warning.** Training decays at 6 months; the reminder engine has 13 rules and **none for it.** The countdown renders in admin; nobody is ever told. → Add `training_expiring` at T-60 / T-30, to client and assigned consultant. | `lib/reminders/engine.ts` |
| A4e | **`lib/portal.ts:10-19` `getMyCase()` repeats the bug you just fixed** — `.order().limit(1)` with no profile filter, relying on RLS. Safe today only because `/portal` is client-only — and A-phase widened `case_visible` for staff. → Filter explicitly. | `lib/portal.ts:10` |
| A4f | **Fees only half config-driven.** The `fees` table is read for FEE-01 notes, but `$340`/`$88.25` are hardcoded in `enroll/page.tsx:43`, `faq/page.tsx:16`, `pricing/page.tsx:73`, `message-templates.ts`. `fees.retired_leo_application` is added and never read. → Read from the table everywhere. | — |
| A4g | **Real contact details.** `config/brand.ts` still ships `carry.example` and `(212) 555-0142`. You cannot launch with a placeholder phone number. | `config/brand.ts:18-22` |
| A4h | **Confirm the cron cadence.** `booking_2h` can only fire if the reminder cron runs at least every ~2 hours. `vercel.json` currently runs it daily → that rule will never fire. | `vercel.json` |

**GATE A:** The gate cannot be bypassed by drag, by dropdown, or by N/A. A license can be recorded and the lifecycle wakes up. `pnpm test` passes with a real RLS matrix and full CP-5 coverage. Commit.

---

# WORKSTREAM B — VISUAL & NARRATIVE REDESIGN

## B0. The honest diagnosis — read this before touching a pixel

**The design *system* is not the problem.** `config/brand.ts` + `app/globals.css` + `components/ui/*` are genuinely good: obsidian/brass/signal-cyan, Space Grotesk display, JetBrains Mono `.engraved` micro-labels, a tight `0.3rem` radius that separates it from every default-shadcn app, real `.glass-premium` layering, and correct `prefers-reduced-motion` gating. **Keep the tokens. Keep the components.**

**Five things are actually wrong:**

1. **The composition is a stock template.** Hero → logo ticker → three icon cards → scroll-thing → pricing grid → CTA. That is the shape of every dark-mode SaaS landing page since 2021. People read *layout* before they read *color* — the tokens are distinctive, the page shape is not. Nothing has a different scale, nothing is full-bleed, nothing breaks rhythm, nothing makes you stop.

2. **The product is invisible.** There is **not one image of the actual application** anywhere on the marketing site. You are asking for $1,999 and showing nothing. Meanwhile the thing you built — a 13-stage tracked pipeline, a requirements engine that cites 38 RCNY, an auto-assembled NYPD-ordered filing packet, a QA gate that blocks an incomplete filing — is genuinely novel in this market and **completely hidden**. This is the single biggest miss on the site.

3. **The stats brag about plumbing.** "24 Doc types tracked / 13 Stage pipeline / 5 Boroughs served" is what an *engineer* finds interesting. (They're honest, which was the P0 fix, and that's right — don't go back to fake numbers.) But the buyer is asking: *Will I be denied? How long will this take? What do I actually have to do?*

4. **No emotional register.** "Concealed carry, handled with precision." Precision is not what your buyer is afraid of. They're afraid of the sealed arrest from 2009, of being denied and losing $340 and six months, of filling in a form wrong and never knowing why. **The site never once acknowledges the fear it exists to remove.** Cold competence is the *tone of the product*; it is not the *hook of the pitch*.

5. **Dark-only is working against you.** For a $2,000 legal-compliance service sold to nervous first-time applicants — often older, often professionals, often women — a near-black tactical site reads *nightclub / gun guy*, not *my lawyer's office*. It is exactly the wrong signal at the exact moment trust is being decided.

**The strategic reframe:** you have been decorating. Stop. **The most captivating thing you have is the truth of what you built.** Show the machine.

---

## B1. Split the register: light marketing, dark product

Two surfaces, two jobs, one brand.

- **Marketing (`app/(marketing)/*`) → light.** Warm, calm, expensive. The register of a good law firm or a private bank: generous whitespace, confident typography, paper-warm neutrals, brass as the accent. This is where trust is won.
- **Portal + Admin + Instructor → stay dark.** These are work surfaces people live in for six months; the obsidian system is *right* there and shouldn't change. A dark, focused instrument on the other side of a calm, bright front door is a deliberate and legible contrast — it says "the calm part is for you; the machine part is doing the work."

**Implementation:**
- `next-themes` is already installed and **entirely unused**. Use it. Remove the hardcoded `.dark` on `<html>` (`app/layout.tsx`) and set the theme per route group: marketing forces `light`, app surfaces force `dark`.
- Extend `config/brand.ts` with a **light palette** built from the same hues — this is a temperature shift, **not a new brand**:
  - `bg: #FAF9F7` (warm paper white, not clinical `#FFFFFF`)
  - surfaces: `#FFFFFF` → `#F4F2EE` → `#EAE7E1`
  - hairlines: `rgba(20,18,14,0.08)` / `0.14`
  - text: `#14120E` (near-black, warm) / `#57534E` / `#8A8580`
  - **brass stays the primary** — but use `brass-deep` `#8E6F2E` for text and borders on light (the bright `#C9A24B` fails contrast on white), and `#C9A24B` only for fills and accents
  - `ice` and `signal` become *cool* accents on warm paper — keep signal cyan as the focus ring for continuity
  - ok/warn/danger: darken for AA on light
- Everything must pass **WCAG AA** on both themes. Audit `text-mid` and `text-low` in particular.
- Keep Space Grotesk, JetBrains Mono, and the `0.3rem` radius. Keep `.engraved`. **Brand continuity lives in the type, the radius, and the brass — not in the background color.**
- `.glass-premium` needs a light variant: on paper it becomes a soft elevated card with a warm shadow and a hairline, not a blur.
- Update `/style-guide` to show both themes side by side.

## B2. Show the machine — the product IS the hero

**Build real, live-rendered UI showpieces as marketing components** — actual React composed from real component primitives with realistic (fake-named) data. Not screenshot files: those go stale and need recapturing on every UI change. These render live, animate, and stay honest.

Put them in `components/marketing/showcase/`. Reuse the real primitives where possible (`ReticleProgress`, `Badge`, `Card`) so the marketing site *cannot* drift from the product.

Four showpieces, in this order down the page:

**1. `<CaseFileShowcase />` — the hero.**
Replace the current centered-text hero. Left: headline + subhead + CTA. Right (or below, on mobile): a **live-looking case file** — the 13-stage `ReticleProgress` rail mid-journey, a vitals strip (blocking count, days in stage, training expiry), three requirement rows with real citations (`38 RCNY § 5-03(a)(1)`), one showing `Needs a fix` with a consultant's note. **In three seconds a stranger understands: this is a tracked, adult, professional system, and a human is watching it.** Nobody else in this market has anything like this to show.

**2. `<RequirementsWall />` — the emotional centerpiece, full-bleed.**
This is the one image that sells the product. Two states, animated on scroll:
- **State 1 — the mess.** All 24 document types, the affidavits, the certificates of disposition, the notarizations, the DMV abstracts, the cohabitant forms, the training certs — scattered, overlapping, unordered, slightly chaotic, with the statute cites floating among them. *This is what the process feels like right now.* This is the only place on the site where you're allowed to make the user feel the weight.
- **State 2 — the machine.** On scroll, it **snaps into the checklist**: ordered, grouped by stage, each with its authority, each with a status. Chaos → order, in one gesture.
- Respect `prefers-reduced-motion`: render State 2 directly, no animation.

**3. `<PacketShowcase />` — proof of output.**
The assembled NYPD-ordered PDF: cover page, investigator index, tabbed sections. This is a real artifact your packet assembler genuinely produces. **Show the deliverable.** Ideally a few pages fanned, with the index legible.

**4. `<ConsultantShowcase />` — the human.**
It's a *concierge* service; the site never shows the concierge. A calm view of the consultant's case file with a note and a message thread — "someone reads every disclosure before you file." Pair it with the QA gate: *"We are structurally unable to let you file an incomplete application."* That is a true, specific, and genuinely differentiating claim, and it's the best sentence available to you.

## B3. Rewrite the narrative — name the fear, then remove it

The current arc is: *we're precise → three features → stages → pricing.* It never earns attention.

New arc — **anxiety → understanding → machine → proof → human → price**:

1. **Name the fear, plainly.** Not "Concealed carry, handled with precision." Something closer to: *"Most NYC applications aren't denied. They're delayed — for months — over paperwork."* Lead with the true, specific thing your buyer is scared of. Then: *"We make sure yours isn't one of them."* Get the actual copy right, but that's the register.
2. **Tell them the truth about the process.** ~6 months. $340 + $88.25. 18 hours of training that **expires in 6 months**. 4 notarized references. An affidavit from everyone you live with. An interview. *Radical honesty is your differentiator in a category built on hustle.* Nobody else leads with the hard numbers.
3. **Then the machine** (B2, showpieces 1–3).
4. **Then the disclosure section — and be brave here.** The dominant denial ground is not the old arrest; it's *lack of candor* (38 RCNY § 5-10(e), (n)). Say so. *"Sealed and dismissed arrests are still disclosed to the License Division. We will never help you hide one — we'll help you explain it."* This is legally correct, ethically right, commercially strong, and **it is the sentence that separates you from every 'expediter' in this city.** It's also your best defense against the reputational frame this category inherits.
5. **Then the human** (showpiece 4).
6. **Then price** — with the government fees stated openly next to your fee. Nobody does this. Do this.
7. **Then eligibility.** The quiz is a great CTA; it's currently the *only* one and it's asked too early, before you've earned it.

**Kill the `Ticker`.** A scrolling marquee is a trust-signal component with no trust signals in it. Either fill it with something true (DCJS-certified instructors, boroughs, statutes tracked) or delete it. Right now it's decoration pretending to be proof.

**Replace the HudStat trio** with outcome-shaped facts the buyer cares about — still true, still verifiable, but about *them*: e.g. *"~6 months, if nothing bounces"* / *"24 documents, tracked to the citation"* / *"0 applications filed incomplete."* (That last one is only sayable because of the CP-5 gate in A1 — which is exactly why A1 must be real.)

## B4. Composition — break the template

- **Vary scale and rhythm.** Right now it's card grid → card grid → card grid. Alternate: full-bleed → asymmetric two-column → single large statement → tight grid. Give at least one section a *big* typographic moment with nothing else in it.
- **One full-bleed, edge-to-edge section** (`RequirementsWall`). The whole page is currently `max-w-6xl` — nothing ever escapes the container, so nothing ever feels big.
- **Whitespace.** On light, generous space *is* the luxury signal. Push section padding up.
- **Type scale.** The hero is `2.5rem`/`sm:6xl`. On a confident light layout you can go bigger and tighter. Space Grotesk holds up.
- **Tone down `Magnetic`** (`strength = 0.3`, untouched since the initial commit) — magnetic buttons are a portfolio-site tic. Reduce or remove. **`JourneyScroll`** is a good instinct badly placed: fold its content into the honest-process section (B3.2) instead of it being a standalone scroll-jack.
- **Anti-slop rules:** no purple/blue gradient meshes, no floating 3D blobs, no emoji, no stock photos of men in tactical gear, no fake dashboards with invented metrics, no "trusted by" row with no logos in it.

## B5. The portal deserves the same care

The portal is where a paying customer spends six months. It's the best-looking surface you have — keep it dark — but:

- **The blank-stall problem is still unfixed.** `loading.tsx` = 0, `Suspense` = 0, skeletons = 0, and `.shimmer` is *defined in `globals.css` and never used*. Every portal navigation is a dead white-on-black stall. (V3 built these, then removed them over a streaming-reveal defect — the commit is honest about it.) Fix it properly this time: `loading.tsx` per route group, Suspense boundaries around the slow Supabase reads, and a real `<Skeleton />` component using `.shimmer`.
- **One thing at a time.** The portal home shows competing entry points. The user should always see exactly one obvious next action, and everything else should be secondary.
- **Make progress feel like progress.** `ReticleProgress` is great and under-used. Celebrate completed stages. The emotional job of this product is to convert dread into momentum.
- **Intake wizard a11y** — still raw `<input type="checkbox">` and raw `<select>` with bolted-on `aria-label`s, while `components/ui/checkbox.tsx` and `select.tsx` sit unused. Replace with the real controls. (Skip link, `aria-current="step"`, and `role="alert"` all landed — keep them.)
- **Eligibility quiz still loses state on refresh** (pure `useState`). Persist it.

## B6. Trust furniture (cheap, high-leverage)

- The legal disclaimer currently renders as fine print. **Make it a feature, not a liability.** A short, confident "What we are, and what we're not" block — *we're not attorneys; we can't expedite; the NYPD decides; here's exactly what we do* — reads as integrity, not as a warning label. In a category with a bribery-scandal history, **being visibly the honest one is a moat.**
- Add "What happens if you're denied" to the marketing site. Honest, calming, and it sets up the appeal/attorney-referral seam.
- Real contact details (A4g) and a real address. A placeholder phone number is a trust-killer on a legal-services site.
- **Do not add testimonials or logos until you have real ones.** The fabricated stats are gone; don't reintroduce fake proof in a new costume.

**GATE B:** A stranger lands on the site and within ten seconds (a) understands what the process actually involves, (b) has *seen* the product, and (c) believes a competent, honest adult is on the other end. It looks like a law firm crossed with a precision instrument — not a gun forum, and not a Vercel template. AA contrast on both themes. Nothing stalls blank. Commit.

---

# WORKING AGREEMENT

- **A before B.** The gate must be real before you market the gate.
- **One workstream at a time.** Stop at each gate. Show the diff and a summary. Wait for approval.
- **Push back on this spec** if something here is wrong or a trap. Say so before building.
- **When the plan and the code disagree, say so** — don't paper over it. The V3 commit messages overstated three items; the V3 *commit bodies* honestly disclosed two others. Be the second kind.
- No phase is done with a TODO in it. Every phase ends with: migration + regenerated types + zod at the boundary + RLS + tests + working UI.
- **Screenshot your own work.** You have vision — render the redesigned pages, look at them, and judge them against B0 honestly before declaring done.
