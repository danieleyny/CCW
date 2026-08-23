-- ============================================================================
-- CANONICAL FACT LAYER (CASE_FACTS_AND_COMPLETENESS_PROMPT)
--
-- A fact is entered once and reused everywhere. case_facts is the single home for
-- every reusable person/employer/sponsor fact on a case; the fill engine and every
-- questionnaire read it through one resolver (lib/facts). Intake stays the
-- interview record; case_facts is the working truth (where they differ, facts win).
--
-- The SSN is the exception: NEVER stored in case_facts. It lives encrypted in
-- case_ssn, is excluded from every view/export, is unreadable by a sponsor at ANY
-- scope, and every decryption is logged. (Owner chose stored-encrypted.)
-- ============================================================================

create table if not exists public.case_facts (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases (id) on delete cascade,
  key         text not null,                 -- a FACT_KEYS entry (lib/facts/registry)
  value       text,
  sensitive   boolean not null default false,
  source      text not null default 'applicant', -- intake | applicant | sponsor | staff
  /** '' = the shared fact; a req_code = a form-local override for that form only. */
  override_req_code text not null default '',
  updated_by  uuid references public.profiles (id),
  updated_at  timestamptz not null default now(),
  -- One shared value per (case, key); form-local overrides key additionally by req.
  -- override_req_code is NOT NULL (default '') so the unique + upsert dedups reliably.
  unique (case_id, key, override_req_code)
);
create index if not exists idx_case_facts_case on public.case_facts (case_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- The applicant + staff see/edit their case's facts (case_visible); a full-scope
-- sponsor may read them (parity). Sponsor writes go through the setCaseFact server
-- action (admin, authorised by authorizeCaseActor) so they carry attribution. The
-- SSN is never here, so a sponsor reading facts never reaches it.
grant select, insert, update, delete on public.case_facts to authenticated;
alter table public.case_facts enable row level security;

create policy case_facts_select on public.case_facts for select
  using (public.case_visible(case_id) or public.sponsor_active_scope(case_id) = 'full');
create policy case_facts_write on public.case_facts for all
  using (public.case_visible(case_id))
  with check (public.case_visible(case_id));

-- ── The encrypted SSN store — no direct access, service-role only ────────────
create table if not exists public.case_ssn (
  case_id     uuid primary key references public.cases (id) on delete cascade,
  ciphertext  text not null,
  iv          text not null,
  auth_tag    text not null,
  updated_by  uuid references public.profiles (id),
  updated_at  timestamptz not null default now()
);
-- RLS enabled with NO policies ⇒ no authenticated role can read or write it. Only
-- the service-role (server actions) touches it, and only to encrypt on save /
-- decrypt for an applicant-triggered form fill. The sponsor's client never can.
alter table public.case_ssn enable row level security;
revoke all on public.case_ssn from authenticated, anon;
