-- ─────────────────────────────────────────────────────────────────────────────
-- CONCIERGE PIVOT · Phase 0 — service mode, engagement agreements, intro calls
--
-- The two paths (Self-Guided vs Full Concierge) stop being the same portal at two
-- prices. `cases.service_mode` is the EXPERIENCE switch (nullable until the
-- applicant picks at the post-intake fork); billing still keys off
-- payments.package_key. Two new tables back the concierge onboarding:
--   • case_agreements — the limited-scope engagement set the applicant e-signs
--     (versioned in config/agreements.ts; a version bump appends a new row so the
--     history is an audit trail, never overwritten).
--   • intro_calls — a booked concierge intro call, recorded regardless of provider
--     (Calendly for v1, native later).
--
-- The applicant's reusable adopted signature already lives in `signatures`
-- (signer_key='applicant', with ip/user_agent/consent_text) — we DON'T add a new
-- signature table; concierge onboarding writes there.
--
-- RLS mirrors the house pattern (see 20260628000200_requirements_engine.sql):
-- SELECT gated by case_visible() (the owning client + all staff/admin), writes
-- via the same predicate — a client signs their OWN agreements; staff/admin can
-- act on their cases. Cross-actor server work runs under the service-role client.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. service_mode — the experience switch, nullable until chosen at the fork.
create type public.service_mode as enum ('self_guided', 'concierge');
alter table public.cases add column if not exists service_mode public.service_mode;

-- 2. case_agreements — the e-signed engagement set.
create table if not exists public.case_agreements (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases (id) on delete cascade,
  kind        text not null,     -- engagement_limited_scope | privacy_authorization
                                 -- | esign_consent | applicant_files_ack | no_guarantee_ack
  version     integer not null,  -- from config/agreements.ts; a bump appends a row
  signed_at   timestamptz not null default now(),
  signer_name text not null,
  signed_ip   text,
  document_id uuid references public.documents (id) on delete set null, -- stamped PDF copy, optional
  created_at  timestamptz not null default now(),
  -- One row per (case, kind, version): re-signing a bumped version appends,
  -- preserving the full signed history for the audit trail.
  unique (case_id, kind, version)
);
create index if not exists idx_case_agreements_case on public.case_agreements (case_id);

-- 3. intro_calls — a booked concierge intro call, provider-agnostic.
create table if not exists public.intro_calls (
  id                uuid primary key default gen_random_uuid(),
  case_id           uuid not null references public.cases (id) on delete cascade,
  provider          text not null default 'calendly',
  external_event_id text,
  scheduled_at      timestamptz,
  status            text not null default 'requested', -- requested | booked | canceled | completed
  join_url          text,
  rep_id            uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- One live intro call per case; a rebook upserts the same row.
  unique (case_id)
);
create index if not exists idx_intro_calls_case on public.intro_calls (case_id);

create trigger trg_intro_calls_updated_at
  before update on public.intro_calls
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.case_agreements to authenticated;
grant select, insert, update, delete on public.intro_calls     to authenticated;

alter table public.case_agreements enable row level security;
alter table public.intro_calls     enable row level security;

-- Agreements: the owning client sees + signs their own; staff/admin see + act on
-- their cases (case_visible() = is_staff_or_admin() OR own).
create policy case_agreements_select on public.case_agreements for select
  using (public.case_visible(case_id));
create policy case_agreements_write on public.case_agreements for all
  using (public.case_visible(case_id))
  with check (public.case_visible(case_id));

-- Intro calls: same visibility. The Calendly webhook writes via the service-role
-- client (bypasses RLS); the client can read + request from the portal.
create policy intro_calls_select on public.intro_calls for select
  using (public.case_visible(case_id));
create policy intro_calls_write on public.intro_calls for all
  using (public.case_visible(case_id))
  with check (public.case_visible(case_id));
