-- ============================================================================
-- CarryPath V2 · Phase 1 — Requirements Engine
-- Versioned, DB-backed compliance registry that replaces the static
-- config/checklist-templates.ts. A rule change becomes a dated data edit, not a
-- code change. Three layers: jurisdiction_profiles -> requirements (versioned)
-- -> case_requirements (per-case materialized instances, the audit surface).
-- Additive: existing checklist_items keeps working; case_requirements drives
-- the new checklist UI alongside it.
-- Ref: CCW_V2_Data_Model.md §2
-- ============================================================================

-- ── jurisdiction_profiles ────────────────────────────────────────────────────
-- One row per jurisdiction the platform serves; selected per case from intake.
create table public.jurisdiction_profiles (
  id                uuid primary key default gen_random_uuid(),
  key               jurisdiction_key not null unique,
  label             text not null,
  issuing_authority text,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── requirements (versioned registry) ────────────────────────────────────────
-- Every rule as a dated row. A new/edited dated row = a version change.
create table public.requirements (
  id              uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null references public.jurisdiction_profiles(id) on delete cascade,
  req_code        text not null,                  -- 'ELG-01','TRN-01','REF-01'...
  title           text not null,
  description     text,
  authority       text,                           -- 'P.L. §400.00(19)','38 RCNY'...
  validation_rule jsonb not null default '{}',    -- machine-checkable spec
  trigger_cond    text not null default 'always', -- always|carry_only|if_cohabitants|if_arrest_hx|...
  severity        requirement_sev not null default 'high',
  document_type   document_type,                  -- nullable; set when satisfied by an upload
  effective_from  date not null default current_date,
  effective_to    date,                           -- null = currently in force
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- A req_code can have many dated versions; a version is unique by start date.
  unique (jurisdiction_id, req_code, effective_from)
);
create index idx_requirements_juris on public.requirements (jurisdiction_id);
create index idx_requirements_active on public.requirements (jurisdiction_id, effective_to);

-- ── case_requirements (per-case materialized instances) ──────────────────────
-- The provable audit surface: exactly what is satisfied / pending / N/A, bound
-- to the document/reference/cohabitant/disclosure that satisfies it.
create table public.case_requirements (
  id             uuid primary key default gen_random_uuid(),
  case_id        uuid not null references public.cases(id) on delete cascade,
  requirement_id uuid not null references public.requirements(id) on delete restrict,
  req_code       text not null,                   -- denormalized for stable display
  status         case_req_status not null default 'pending',
  document_id    uuid references public.documents(id) on delete set null,
  reference_id   uuid references public.character_references(id) on delete set null,
  cohabitant_id  uuid references public.cohabitants(id) on delete set null,
  disclosure_id  uuid,                            -- FK wired in Phase 2 (disclosures table)
  notes          text,
  reviewer       uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (case_id, requirement_id)
);
create index idx_case_req_case on public.case_requirements (case_id, status);
create index idx_case_req_document on public.case_requirements (document_id);

-- ── updated_at triggers (match existing trg_<t>_updated_at convention) ───────
create trigger trg_jurisdiction_profiles_updated_at
  before update on public.jurisdiction_profiles
  for each row execute function public.set_updated_at();
create trigger trg_requirements_updated_at
  before update on public.requirements
  for each row execute function public.set_updated_at();
create trigger trg_case_requirements_updated_at
  before update on public.case_requirements
  for each row execute function public.set_updated_at();

-- ── Grants (init migration's grant only covered tables existing then) ────────
grant select, insert, update, delete on public.jurisdiction_profiles to authenticated;
grant select, insert, update, delete on public.requirements          to authenticated;
grant select, insert, update, delete on public.case_requirements     to authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.jurisdiction_profiles enable row level security;
alter table public.requirements          enable row level security;
alter table public.case_requirements     enable row level security;

-- jurisdiction_profiles: anyone signed in reads active ones; staff/admin manage all.
create policy jurisdiction_profiles_select on public.jurisdiction_profiles for select
  using (active or public.is_staff_or_admin());
create policy jurisdiction_profiles_write on public.jurisdiction_profiles for all
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

-- requirements: readable to any signed-in user (non-sensitive legal reference data;
-- read-all rather than active-only so historical case_requirement joins resolve).
-- Staff/admin manage the dated registry.
create policy requirements_select on public.requirements for select
  using (true);
create policy requirements_write on public.requirements for all
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

-- case_requirements: client reads own case, staff/admin all (case_visible covers
-- both and queries cases/clients — a different table, so no self-ref RLS pitfall).
-- Instructor "engaged case" read is added in Phase 4 once engagements exists.
-- Writes are staff/admin only; system generation runs via the service-role client.
create policy case_requirements_select on public.case_requirements for select
  using (public.case_visible(case_id));
create policy case_requirements_write on public.case_requirements for all
  using (public.is_staff_or_admin() and public.case_visible(case_id))
  with check (public.is_staff_or_admin() and public.case_visible(case_id));
