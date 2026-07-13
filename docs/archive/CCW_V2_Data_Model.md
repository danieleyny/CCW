# CarryPath V2 — Data Model & Schema Spec

*Additive migrations on top of the existing schema (`supabase/migrations/20260608194250_init_schema.sql`). Nothing here drops or renames existing tables. All new tables get RLS. Conventions match the existing repo: `uuid` PKs via `gen_random_uuid()`, `created_at/updated_at timestamptz`, the shared `set_updated_at()` trigger, and `security definer` RLS helpers (`is_admin()`, `is_staff_or_admin()`, `case_visible()`).*

Suggested migration files (in order):

```
20260628_0001_enums_v2.sql
20260628_0002_requirements_engine.sql
20260628_0003_intake_disclosure.sql
20260628_0004_marketplace_instructors.sql
20260628_0005_scheduling_calendar.sql
20260628_0006_notifications_reminders.sql
20260628_0007_reference_outreach.sql
20260628_0008_rls_v2.sql
20260628_0009_seed_requirements.sql   (data)
```

---

## 1. Enum changes

```sql
-- Add the instructor role (extends existing user_role: client|staff|admin)
alter type user_role add value if not exists 'instructor';

-- New enums
create type jurisdiction_key   as enum ('nyc','nassau','suffolk','westchester','special_carry');
create type requirement_sev    as enum ('critical','high','watch','long_lead');
create type case_req_status     as enum ('na','pending','satisfied','rejected');
create type disclosure_type     as enum ('arrest','summons','order_of_protection','domestic_incident','question_yes');
create type offer_type          as enum ('training','full_assist');
create type offer_status        as enum ('open','matched','accepted','expired','cancelled');
create type engagement_status   as enum ('active','completed','cancelled','declined');
create type slot_type           as enum ('classroom_16h','live_fire_2h','combined_18h','consult');
create type booking_status      as enum ('requested','confirmed','cancelled','completed','no_show');
create type notification_kind   as enum ('info','action_required','reminder','offer','booking','payment');
create type calendar_provider   as enum ('google');
create type reference_req_status as enum ('pending','sent','opened','submitted','notarized');
```

> Note: `document_type` enum should gain conditional types used by the registry. Add: `certificate_of_disposition`, `cert_relief_disabilities`, `cert_good_conduct`, `order_of_protection_copy`, `dd214`, `name_change_proof`, `other_license`, `affirmation_understanding`, `safeguard_ack`. Use `alter type document_type add value if not exists '...'` for each.

---

## 2. Requirements Engine

```sql
-- One row per jurisdiction the platform serves.
create table public.jurisdiction_profiles (
  id          uuid primary key default gen_random_uuid(),
  key         jurisdiction_key not null unique,
  label       text not null,
  issuing_authority text,            -- "NYPD License Division", etc.
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Versioned registry. A rule change = a new/edited dated row, never a code change.
create table public.requirements (
  id             uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null references public.jurisdiction_profiles(id) on delete cascade,
  req_code       text not null,                 -- 'ELG-01','TRN-01','REF-01'...
  title          text not null,
  description    text,
  authority      text,                          -- 'P.L. §400.00(19)','38 RCNY'...
  validation_rule jsonb not null default '{}',  -- machine-checkable spec
  trigger_cond   text not null default 'always',-- always|carry_only|if_cohabitants|if_arrest_hx|if_oop_hx|if_lpr_under_7yr|if_veteran|if_name_change|if_dir_hx|if_any_q_yes
  severity       requirement_sev not null default 'high',
  document_type  document_type,                 -- nullable; set when satisfied by an upload
  effective_from date not null default current_date,
  effective_to   date,                          -- null = currently in force
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_requirements_juris on public.requirements (jurisdiction_id);
create index idx_requirements_active on public.requirements (jurisdiction_id, effective_to);
-- A req_code can have many versions; only one active window per jurisdiction.

-- Per-case materialized requirement instances (the provable audit surface).
create table public.case_requirements (
  id             uuid primary key default gen_random_uuid(),
  case_id        uuid not null references public.cases(id) on delete cascade,
  requirement_id uuid not null references public.requirements(id) on delete restrict,
  req_code       text not null,                 -- denormalized for stable display
  status         case_req_status not null default 'pending',
  document_id    uuid references public.documents(id) on delete set null,
  reference_id   uuid references public.character_references(id) on delete set null,
  cohabitant_id  uuid references public.cohabitants(id) on delete set null,
  disclosure_id  uuid,                           -- FK added after disclosures table
  notes          text,
  reviewer       uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (case_id, requirement_id)
);
create index idx_case_req_case on public.case_requirements (case_id, status);
```

`set_updated_at` trigger on all three. `case_requirements` is what the portal checklist and admin QA both read.

---

## 3. Intake & Disclosure

```sql
create table public.intake_sessions (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases(id) on delete cascade unique,
  current_step  integer not null default 1,
  answers       jsonb not null default '{}',   -- resumable wizard state
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.disclosures (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  type          disclosure_type not null,
  occurred_on   date,
  jurisdiction_text text,                       -- court/agency
  parties       text,
  disposition   text,                           -- dismissed/sealed/ACD/convicted...
  narrative     text not null default '',       -- the required written explanation
  question_no   integer,                        -- for q10-28 mirror
  spawned_req_code text,                         -- which requirement this triggers (ARR-01...)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_disclosures_case on public.disclosures (case_id, type);

-- now wire the deferred FK
alter table public.case_requirements
  add constraint fk_case_req_disclosure
  foreign key (disclosure_id) references public.disclosures(id) on delete set null;
```

**Submission guard (app-level, enforced in a server action):** block advancing the case to `application_assembled` while any `disclosures.narrative = ''` or any required `case_requirements.status = 'pending'`.

---

## 4. Marketplace & Instructors

The existing `instructors` table stays; we **enrich** it and bind it to an auth profile.

```sql
alter table public.instructors
  add column if not exists profile_id   uuid references public.profiles(id) on delete set null,
  add column if not exists bio          text,
  add column if not exists dcjs_id      text,                 -- Duly Authorized Instructor credential
  add column if not exists verified     boolean not null default false,
  add column if not exists verified_at  timestamptz,
  add column if not exists service_radius_mi integer not null default 25,
  add column if not exists base_geog    geography(point,4326),-- service-area center (PostGIS)
  add column if not exists price_18h_cents integer,
  add column if not exists rating_avg   numeric(3,2),
  add column if not exists rating_count integer not null default 0,
  add column if not exists jurisdictions jurisdiction_key[] not null default '{nyc}';

create extension if not exists postgis;
create index idx_instructors_geog on public.instructors using gist (base_geog);

-- Physical venues the calendar connects clients to.
create table public.training_locations (
  id            uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  label         text not null,
  address       text,
  geog          geography(point,4326),
  is_range      boolean not null default false,  -- live-fire capable
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_train_loc_instructor on public.training_locations (instructor_id);
create index idx_train_loc_geog on public.training_locations using gist (geog);

-- Broadcast offer: client asks for training or full help; matched to local instructors.
create table public.case_offers (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  type          offer_type not null,
  status        offer_status not null default 'open',
  jurisdiction  jurisdiction_key not null,
  client_geog   geography(point,4326),
  radius_mi     integer not null default 25,
  needs_note    text,
  expires_at    timestamptz,
  accepted_engagement_id uuid,                   -- set on accept
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_offers_status on public.case_offers (status, jurisdiction);

-- Which instructors an offer was shown to (the feed), and their response.
create table public.offer_matches (
  id            uuid primary key default gen_random_uuid(),
  offer_id      uuid not null references public.case_offers(id) on delete cascade,
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  distance_mi   numeric(6,2),
  responded     text,                            -- null | 'accepted' | 'declined'
  responded_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (offer_id, instructor_id)
);
create index idx_offer_matches_instr on public.offer_matches (instructor_id, responded);

-- The binding: instructor ↔ case, with the access scope it grants.
create table public.engagements (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  offer_id      uuid references public.case_offers(id) on delete set null,
  type          offer_type not null,
  status        engagement_status not null default 'active',
  scope_full_assist boolean not null default false, -- gates PII/disclosure access
  client_consented_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (case_id, instructor_id)
);
create index idx_engagements_instr on public.engagements (instructor_id, status);
create index idx_engagements_case on public.engagements (case_id, status);
```

---

## 5. Scheduling & Calendar

```sql
create table public.availability_slots (
  id            uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  location_id   uuid references public.training_locations(id) on delete set null,
  type          slot_type not null,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  capacity      integer not null default 1,
  booked_count  integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_slots_instr_time on public.availability_slots (instructor_id, starts_at);

create table public.bookings (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete cascade,
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete set null,
  slot_id       uuid references public.availability_slots(id) on delete set null,
  location_id   uuid references public.training_locations(id) on delete set null,
  type          slot_type not null,
  status        booking_status not null default 'requested',
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  ics_uid       text,                            -- stable UID for ICS updates
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_bookings_case on public.bookings (case_id);
create index idx_bookings_instr on public.bookings (instructor_id, starts_at);

-- On booking.status = 'completed', create/maintain a training_sessions row
-- (existing table) carrying test_score / passed.

-- Optional free two-way Google sync (feature-flagged).
create table public.calendar_connections (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  provider      calendar_provider not null default 'google',
  access_token  text,            -- store encrypted / in Supabase Vault
  refresh_token text,
  calendar_id   text,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (profile_id, provider)
);
```

**Booking integrity:** a `before insert/update` trigger (or transactional server action) increments `availability_slots.booked_count` and rejects overbooking (`booked_count <= capacity`).

---

## 6. Notifications & Reminders

```sql
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  recipient   uuid not null references public.profiles(id) on delete cascade,
  case_id     uuid references public.cases(id) on delete cascade,
  kind        notification_kind not null default 'info',
  title       text not null,
  body        text,
  link        text,             -- deep link into the right surface
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index idx_notifications_recipient on public.notifications (recipient, read, created_at desc);

-- Idempotency for the cron so a daily re-run never double-sends.
create table public.reminder_log (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid references public.cases(id) on delete cascade,
  rule_key    text not null,    -- 'doc_rejected','booking_24h','renewal_60d'...
  target      text not null,    -- email/profile id
  window_key  text not null,    -- e.g. booking_id or date bucket
  sent_at     timestamptz not null default now(),
  unique (rule_key, target, window_key)
);
```

---

## 7. Reference Outreach

```sql
create table public.reference_requests (
  id            uuid primary key default gen_random_uuid(),
  reference_id  uuid not null references public.character_references(id) on delete cascade,
  case_id       uuid not null references public.cases(id) on delete cascade,
  token         text not null unique,            -- opaque, urlsafe
  status        reference_req_status not null default 'pending',
  sent_at       timestamptz,
  opened_at     timestamptz,
  submitted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_ref_requests_token on public.reference_requests (token);
```

Public submission route `app/r/[token]` validates the token via a **service-role** server action (bypasses RLS for this one scoped write) and updates `character_references` + the bound `case_requirements`.

---

## 8. RLS additions (the security-critical part)

New helpers + policies, in the style of the existing `case_visible()`:

```sql
-- Is the current user an instructor engaged on this case?
create or replace function public.instructor_engaged(p_case_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.engagements e
    join public.instructors i on i.id = e.instructor_id
    where e.case_id = p_case_id and e.status = 'active' and i.profile_id = auth.uid()
  )
$$;

create or replace function public.is_instructor()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() = 'instructor'
$$;
```

Policy summary per table:

| Table | client | instructor | staff/admin |
|---|---|---|---|
| `jurisdiction_profiles`, `requirements` | read (active only) | read | all |
| `case_requirements` | own case (read) | engaged case (read) | all |
| `intake_sessions`, `disclosures` | own case (rw) | **no access** (disclosures never exposed) | all |
| `instructors`, `training_locations`, `availability_slots` | read (verified only) | own rows (rw) | all |
| `case_offers` | own case (rw) | **redacted view only** until accepted | all |
| `offer_matches` | — | own matches (rw response) | all |
| `engagements` | own case (read) | own engagements (rw) | all |
| `bookings` | own case (rw) | own bookings (rw) | all |
| `calendar_connections` | own (rw) | own (rw) | own |
| `notifications` | own (rw read flag) | own | own + admin all |
| `reference_requests` | own case (read) | — | all |

**Redacted offer feed:** instructors never select `case_offers` directly. Expose a security-barrier **view** `instructor_offer_feed` that joins `offer_matches → case_offers` and returns only `{ offer_id, type, jurisdiction, borough_or_area, distance_mi, stage, needs_note, expires_at }` — no client identity. Acceptance happens through a `security definer` RPC `accept_offer(offer_id)` that creates the `engagement`, sets the match response, and grants access — all server-side.

---

## 9. Touchpoints with existing tables (no breakage)

- `documents` — new conditional `document_type` values; each upload binds to a `case_requirements` row via `document_id`. Keep the existing `checklist_item_id` link for backward compat during migration.
- `training_sessions` — now created/updated from a completed `booking` (was manual).
- `appointments` — keep for NYPD interview / fingerprinting (NYPD-controlled events); `bookings` is for instructor sessions. Both feed the calendar view.
- `payments` — add nullable `engagement_id`, `booking_id`, and `stripe_connect_account` for marketplace payouts.
- `character_references` — gains a 1:1 `reference_requests` row for outreach.
- `config/checklist-templates.ts` — superseded by the `requirements` seed; keep temporarily, then deprecate once `case_requirements` drives the UI.

---

## 10. Seed (`20260628_0009_seed_requirements.sql`)

Insert the NYC jurisdiction profile + the operational map's Section 03 registry as version 1 (`effective_from = launch`). Minimum set: `ELG-01..03`, `TRN-01`, `IDN-01..04`, `RES-01`, `DMV-01`, `COH-01`, `SAF-01`, `AFF-01`, `REF-01`, `SOC-01`, `DSC-01`, `ARR-01`, `OOP-01`, `DIR-01`, `MIL-01`, `FEE-01`, `FMT-01` — each with its authority citation, `validation_rule`, `trigger_cond`, and `severity` copied from the map. Clone the same set (adjusting authority/rows) for `special_carry`; stub `nassau/suffolk/westchester` as future profiles.
