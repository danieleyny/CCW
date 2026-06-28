# CarryPath V2 — Architecture & Build Plan

*Extends the existing CarryPath app (Next.js 16 · Supabase · Stripe · Resend). This plan adds the four things the current build is missing: a **versioned requirements engine**, a **branching intake + disclosure interview**, a **two-sided trainer marketplace**, and **real calendar/booking + reference outreach + reminder automation** — all cost-controlled.*

---

## 0. Where we are vs. where we're going

The repo already has a strong foundation, so V2 is **additive, not a rewrite**:

**Already built (keep, extend):**

- Next.js 16 App Router; three surfaces — marketing (`app/(marketing)`), client portal (`app/portal`), admin (`app/admin`).
- Supabase Postgres + Auth + Storage + RLS. Roles: `client | staff | admin`.
- 16 tables incl. `clients`, `cases`, `checklist_items`, `documents`, `character_references`, `cohabitants`, `instructors`, `training_sessions`, `appointments`, `payments`, `messages`, `tasks`, `activity_log`.
- 13-stage linear pipeline (`config/stages.ts` ↔ `case_stage` enum).
- Stripe scaffolded behind a flag; Resend email scaffolded (no-ops without key); Twilio SMS scaffolded; Vercel daily cron at `/api/cron/reminders` running `runReminders()` + `runRenewals()`.

**Missing (this plan delivers):**

| Gap | What the operational map demands | V2 module |
|---|---|---|
| Requirements are static TS config | Versioned, traceable registry with authority citations + jurisdiction profiles | **§2 Requirements Engine** |
| No guided intake | Branching interview that deterministically generates the document set + disclosure sub-forms | **§3 Intake & Disclosure** |
| `instructors` is a bare table, not users | Trainers as accounts who see local cases and **accept** them | **§4 Trainer Marketplace** |
| Calendar is a read-only agenda | Availability, booking, ICS, instructor↔client calendar link | **§5 Scheduling & Calendar** |
| Reminders = rejected docs only | Stage/appointment/reference/renewal reminders, idempotent | **§6 Notifications & Reminders** |
| References entered manually | Email each reference a tokenized self-serve link | **§7 Reference Outreach** |

---

## 1. The process model we are encoding

We **keep the existing 13 stages** (they map cleanly onto the operational map's 8 phases) and layer the requirements engine on top. Mapping for reference:

| Op-map phase | CarryPath stage(s) |
|---|---|
| 0 Eligibility & authority | `lead`, `eligibility_screened` |
| 1 18-hr training (long-lead) | `training_scheduled`, `training_complete` |
| 2 Document assembly & notarization | `document_collection`, `notarization` |
| 3 Online application + finalize | `application_assembled`, `filed` |
| 4 Fees | (payment events, any stage) |
| 5 Intake + fingerprinting | `fingerprinting_booked` |
| 6 Background investigation + interview | `under_investigation` |
| 7 Determination → purchase & registration | `decision`, `licensed` |

**The core reframe to engineer toward** (straight from the map): *NYC carry is not a form you submit — it is an investigation you assemble evidence for.* Every feature is judged by one test: does it make the file cleaner, more complete, and more consistent, and does it remove a reason for the investigator to pause?

The two controllable levers we instrument:

1. **Long-lead parallelism** — training scheduling and fingerprinting are the two slow clocks; both must be startable on day one. The marketplace (training) and the Rifle/Shotgun-first option (prints) directly attack these.
2. **Disclosure discipline** — a non-disclosed sealed/dismissed arrest discovered in the background check is more damaging than the underlying event. The intake's job is to make non-disclosure structurally hard.

---

## 2. Requirements Engine (the compliance backbone)

Replaces the static `config/checklist-templates.ts` with a **versioned, DB-backed registry** so that a litigation- or Council-driven change (e.g., the contested 4-reference count, social-media list, or the $340 fee) is a **dated data edit, not a code change**.

**Three layers:**

1. **`jurisdiction_profiles`** — `nyc`, `nassau`, `suffolk`, `westchester`, `special_carry`. One profile is selected per case from the intake's residence answer. Profiles re-use the same registry schema with different rows.
2. **`requirements`** — every rule as a versioned row: stable `req_code` (e.g. `ELG-01`, `TRN-01`, `REF-01`), human text, **authority citation** (P.L. §400.00(19), 38 RCNY, DCJS std…), a **machine-checkable validation rule** (jsonb), a **trigger condition** (`always | carry_only | if_cohabitants | if_arrest_hx | if_oop_hx | if_lpr_under_7yr | …`), a **severity** (`critical | high | watch | long_lead`), and `effective_from` / `effective_to`.
3. **`case_requirements`** — per-case materialized instance of each applicable requirement: `status` (`na | pending | satisfied | rejected`), bound `document_id` / `reference_id` / `cohabitant_id`, reviewer notes. **Every applicant document is bound to its `req_code`, so "exactly what is satisfied / pending / N/A" is provable and auditable** — this is the client's progress view and the admin's QA view from one source of truth.

**Generation:** when intake completes (or answers change), a pure function `generateCaseRequirements(profile, answers)` selects the active registry rows whose trigger matches the answers and upserts `case_requirements`. Conditional answers spawn the matching Group-C requirement automatically (e.g., any disclosed arrest → spawns `ARR-01` Certificate of Disposition + narrative).

**Seed:** ship the registry from the operational map's Section 03 table (ELG-01…FMT-01, REF-01, SOC-01, DSC-01, ARR-01, OOP-01, DIR-01, MIL-01) as the first dated version (`effective_from = launch date`).

---

## 3. Intake & Disclosure Interview (the data model for "assemble the evidence")

A **branching wizard** in the portal that collects the minimum truthful answer set, then deterministically renders the personalized checklist. Six steps, mirroring the map's Section 04:

1. **Eligibility pre-screen (hard gate)** — DOB (<21 → stop), residence (routes to jurisdiction profile), prohibitor flags (felony/serious conviction, disqualifying mental-health adjudication, active OOP, unlawful drug use). Any prohibitor → route to **attorney-review track before any spend**.
2. **Identity & residence** — photo ID type, DOB-proof type, citizenship status (LPR + <7 yrs residency → spawn Certificate of Good Conduct), residence proof method (validate address parity).
3. **Household & safeguard** — enumerate every adult 18+ → one notarized cohabitant affidavit each (empty → auto-generate "I live alone" statement); designated safeguard person + ID.
4. **Disclosure interview ("the real exam")** — arrays of arrests/summonses (even dismissed/sealed), orders of protection, domestic incidents, and the Q10–28 mirror. **Every "yes" binds a required written-explanation field; submission is blocked until each is filled.** This is the system's enforcement of disclosure discipline.
5. **Carry-specific & history** — training cert + instructor (DAI) + dates; four references; social-media handles (3 yrs); military / name-change / existing-license conditionals.
6. **Generation & validation gate** — render the checklist (satisfied/pending/N/A per `req_code`); run the file validator; assemble a per-step PDF packet with an investigator-friendly index mirroring upload order.

**Two guardrails baked in (defending choke points CP-5 & CP-6):**

- **`file_validator`** — on every upload: enforce `<5MB`, allowed extension (PDF/JPG/JPEG/PNG/BMP/TIF), and **auto-sanitize the filename** (strip accents/`&`/`#`/`*`/spaces) before storage, because the NYPD portal silently rejects bad names.
- **Pre-submission human checkpoint** — treat "Finalize & Submit" as a signed artifact, not a draft save. A staff QA review + an explicit applicant confirmation gate stand before the case can move to `filed`.

**Persistence:** `intake_sessions` (resumable answers jsonb + current step) and `disclosures` (typed rows with narrative + linkage to spawned requirement).

---

## 4. Trainer Marketplace (two-sided — the headline V2 feature)

Turns the bare `instructors` table into a real two-sided marketplace. Trainers become **accounts** who can see local client cases and **accept** them.

### 4.1 Roles & access

- Add `'instructor'` to the `user_role` enum (alongside `client | staff | admin`).
- New surface `app/instructor/*` (its own layout/dashboard), gated to the instructor role — mirrors the existing `app/portal` and `app/admin` patterns.
- Instructors complete an **onboarding/verification** flow: DCJS Duly-Authorized-Instructor credential, service area, training locations, pricing, bio, live-fire range affiliation. Admin verifies (`verified` flag) before they appear to clients — protects the brand and the "good moral character" positioning.

### 4.2 The two-sided flow

```
CLIENT SIDE                              INSTRUCTOR SIDE
───────────                              ───────────────
Portal: "Schedule training" or                  Instructor dashboard
"Hire help with my application"                  ┌─────────────────────┐
        │                                        │   CASE FEED         │
        ▼                                        │  (local, matching,  │
  create case_offer ───── geo + jurisdiction ───▶│   privacy-scoped)   │
  (type: training | full_assist)          match  │                     │
        │                                        │  [Accept] [Decline] │
        │                                        └──────────┬──────────┘
        ▼                                                   │ accept
  Sees matching local instructors                           ▼
  with profiles + availability ◀──────────────────  engagement created
        │                                          (binds instructor↔case,
        ▼                                           grants scoped case access,
  Book a slot / confirm hire                        notifies client)
        │                                                   │
        └──────────────► booking + calendar invite ◀────────┘
```

Two entry modes, both supported:

- **Client-initiated browse-and-book** — client sees matched local instructors, opens a profile, picks an availability slot → creates a `booking` request → instructor confirms.
- **Broadcast offer / case claim** — client clicks "Hire an instructor to help me" → a `case_offer` is broadcast to all matching local verified instructors, who see a **privacy-scoped case card** in their feed and can **Accept**. First accept (or client-selected accept, configurable) creates the `engagement`.

### 4.3 Privacy scoping (critical)

Before acceptance, an instructor sees only a **redacted case summary**: borough/ZIP-area, jurisdiction, stage, what's needed (training only vs. full assist), timeline. **No name, no PII.** On `engagement` accept, RLS grants that instructor scoped access to the case (training-relevant fields and the documents the client shares with their trainer — *not* the full disclosure record unless the engagement type is `full_assist` and the client consents). All access is written to `activity_log`.

### 4.4 Geo-matching

- Geocode client (from ZIP/address at intake) and instructor service areas to lat/lng. Enable Supabase's **PostGIS** extension (free) and match with `ST_DWithin(client_geo, instructor_service_area, radius)`.
- Rank matches by: distance → next available slot → rating → price. Filter by jurisdiction the instructor is certified/willing to serve.
- Cost-free geocoding: cache a one-time lookup (ZIP-centroid seed table, or Nominatim free tier) at signup; never geocode on every search.

### 4.5 Payments (marketplace)

- Stripe is already integrated. For instructor payouts use **Stripe Connect (Express)** — the platform takes an optional application fee; instructors onboard their own payout account. Gate behind the existing Stripe flag so it can ship dark.
- Booking deposit on confirm, balance on completion (configurable), mirroring the existing deposit/balance pattern in `payments`.

---

## 5. Scheduling & Calendar (the client ↔ training-location link)

### 5.1 Data

- **`training_locations`** — instructor's classroom/range venues with address + lat/lng (the physical endpoints the calendar connects the client to).
- **`availability_slots`** — instructor-published openings: location, start/end, `type` (`classroom_16h | live_fire_2h | combined_18h | consult`), capacity, booked count.
- **`bookings`** — client books a slot: status `requested | confirmed | cancelled | completed | no_show`, linked to case + engagement + (on completion) a `training_sessions` row carrying test score / pass.

### 5.2 Calendar mechanics (cost-free first)

- **ICS generation** (zero cost, universal): on `confirmed`, email both client and instructor a calendar invite (`.ics` attachment) with the training-location address, map link, and what to bring. This satisfies "calendar connection between user and training locations" without any paid calendar product.
- **Optional two-way Google Calendar sync** for instructors (free Google Calendar API + OAuth): `calendar_connections` stores tokens; we (a) pull the instructor's busy times to auto-block overlapping slots and (b) push confirmed bookings as events. Feature-flagged and optional so the system works fully without it.
- **Reminders** — 24h and ~2h before any booking/appointment (see §6).

### 5.3 Why not Calendly/Cal.com

Building native availability + ICS keeps recurring cost at **$0** and keeps the booking data inside our DB (needed for the case timeline and reminders). A third-party booking widget would add per-seat cost and split the data. Native is the right call here.

---

## 6. Notifications & Reminders (expand the cron)

Expand `lib/reminders.ts` from "rejected docs only" into a small **rule-driven engine**, plus an **idempotency log** so nothing double-sends.

**Channels, cheapest-first:**

- **Email (Resend)** — primary. Free tier covers 3,000/mo · 100/day — ample at launch.
- **In-app notifications** (`notifications` table + a bell in each surface) — free, and the durable record.
- **Web Push** (free, browser-native) — optional nudge channel, no per-message cost.
- **SMS (Twilio)** — kept **off by default** because it costs per message. Leave the existing scaffold; enable later only for high-value nudges (appointment day-of).

**Reminder rules (run daily via existing Vercel cron; idempotent via `reminder_log`):**

| Trigger | Timing | To |
|---|---|---|
| Document rejected | immediate + 48h if still rejected | client |
| Reference request unsent / unfilled | 3 days, 7 days | client (and reference) |
| Booking confirmed | immediate (ICS) | client + instructor |
| Booking upcoming | 24h, 2h | client + instructor |
| Stage stalled (no progress N days) | per-stage threshold | client + assigned staff |
| Long-lead nudge (training/prints not started by day 3) | day 3, day 7 | client |
| Pre-filing QA ready | on assembly complete | staff |
| Renewal due | 90/60/30 days before 3-yr expiry | client (already in `runRenewals`) |
| New case offer in feed | immediate | matching instructors |

**Idempotency:** `reminder_log(case_id, rule_key, target, sent_at)` with a unique constraint on `(case_id, rule_key, window)` so a daily cron re-run never re-sends the same nudge.

**Cron cost note:** Vercel Hobby allows daily cron; if sub-daily reminders (e.g., 2h-before) are wanted, run them via **Supabase `pg_cron`/Edge Functions (free)** rather than upgrading Vercel — called out in the roadmap.

---

## 7. Reference Outreach (tokenized self-serve)

Implements "add people's info and reach out to the link in the references section."

- **`reference_requests`** — one per character reference: opaque `token`, `status` (`pending | sent | opened | submitted | notarized`), timestamps.
- Client (or staff) enters reference name + email → system emails a **tokenized link** to a **public page** `app/r/[token]` (no login) where the reference confirms their details, attests, and (optionally) uploads or e-signs their letter. Submission writes back to `character_references` and flips the bound `case_requirement` toward satisfied.
- Reminders at 3 and 7 days if not submitted (§6). Notarization status tracked separately (the letters still require a notary; the system batches all four references + cohabitant affidavits into **one notary session** per the map's "batch the notary last" tactic).

---

## 8. Cost posture (explicit — "don't add cost to us")

| Concern | Choice | Recurring cost |
|---|---|---|
| Hosting | Vercel (existing) | Hobby free / Pro only if needed |
| DB/Auth/Storage | Supabase (existing) | Free tier at launch |
| Geo matching | PostGIS extension + cached geocode | $0 |
| Email | Resend (existing) | Free 3k/mo |
| Calendar | Native ICS + optional free Google API | $0 |
| Booking | Native (no Calendly/Cal.com) | $0 |
| SMS | Twilio off by default | $0 until enabled |
| Reminders | Vercel daily cron + optional free pg_cron | $0 |
| Payments | Stripe / Connect | per-transaction only (passes to flow) |

The only money that moves is Stripe's per-transaction fee, which rides on actual revenue. Everything operational stays on free tiers until volume forces an upgrade.

---

## 9. Defending the 7 choke points (traceability)

Every CP from the operational map maps to a concrete V2 mechanism:

- **CP-1 "good moral character" wall** → coherent file (requirements engine), **pre-interview brief** generated for the client, reachable & briefed references (outreach module), social-media consistency surfacer.
- **CP-2 non-disclosure surfaces later** → disclosure-maximalist intake (§3 step 4); a "yes" the record can contradict is structurally prevented.
- **CP-3 fingerprint/intake queue** → surface the **Rifle/Shotgun-first** option in intake as a structured print-accelerator; file in parallel day one.
- **CP-4 notarization/affidavit gaps** → enumerate household adults → auto-generate exact affidavit count → batch-notary scheduler.
- **CP-5 irreversible Finalize & Submit** → pre-submission validation gate + human QA checkpoint.
- **CP-6 upload format/filename rejection** → `file_validator` compress + sanitize (`FMT-01`).
- **CP-7 contested-provision drift** → versioned `requirements` rows + a standing "verify-live" admin check before each filing.

---

## 10. What ships — deliverables in this package

1. **`CCW_V2_Architecture_Plan.md`** — this document.
2. **`CCW_V2_Data_Model.md`** — exact new tables, enums, columns, RLS, migrations.
3. **`CCW_V2_Roadmap.md`** — phased build order for Claude Code.
4. **`CCW_V2_ClaudeCode_Prompt.md`** — the copy-paste prompt to run in Claude Code against this repo.

> **Standing disclaimer.** Operational/product guidance, not legal advice. NYC is a discretionary jurisdiction; fees, reference counts, and social-media requirements shift with litigation (Antonyuk) and Council action (Int. 0372-2026). The versioned registry is the mechanism to keep the product correct; verify every requirement against the live NYPD portal and a NY firearms attorney before client-facing use.
