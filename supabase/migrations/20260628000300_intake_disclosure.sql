-- ============================================================================
-- CarryPath V2 · Phase 2 — Branching Intake + Disclosure
-- A resumable six-step intake wizard (intake_sessions) and the typed disclosure
-- records (disclosures) that drive conditional requirement generation. Every
-- disclosure carries a required written narrative; submission is gated until
-- each is filled. Disclosures are the most sensitive records in the system —
-- they get client + staff/admin RLS only and NO instructor policy, ever.
-- Ref: CCW_V2_Data_Model.md §3
-- ============================================================================

-- ── intake_sessions (resumable wizard state) ─────────────────────────────────
create table public.intake_sessions (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases(id) on delete cascade unique,
  current_step  integer not null default 1,
  answers       jsonb not null default '{}',
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── disclosures (typed, each with its required narrative) ────────────────────
create table public.disclosures (
  id                uuid primary key default gen_random_uuid(),
  case_id           uuid not null references public.cases(id) on delete cascade,
  type              disclosure_type not null,
  occurred_on       date,
  jurisdiction_text text,
  parties           text,
  disposition       text,
  narrative         text not null default '',
  question_no       integer,
  spawned_req_code  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_disclosures_case on public.disclosures (case_id, type);

-- Wire the deferred FK declared in Phase 1.
alter table public.case_requirements
  add constraint fk_case_req_disclosure
  foreign key (disclosure_id) references public.disclosures(id) on delete set null;

-- ── updated_at triggers ──────────────────────────────────────────────────────
create trigger trg_intake_sessions_updated_at
  before update on public.intake_sessions
  for each row execute function public.set_updated_at();
create trigger trg_disclosures_updated_at
  before update on public.disclosures
  for each row execute function public.set_updated_at();

-- ── Grants ───────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.intake_sessions to authenticated;
grant select, insert, update, delete on public.disclosures      to authenticated;

-- ── RLS — client owns their case's intake/disclosures; staff/admin all ───────
-- (case_visible queries cases/clients — different tables — so SELECT is safe for
--  insert().select(). No instructor policy: instructors must never see these.)
alter table public.intake_sessions enable row level security;
alter table public.disclosures     enable row level security;

create policy intake_sessions_select on public.intake_sessions for select
  using (public.case_visible(case_id));
create policy intake_sessions_write on public.intake_sessions for all
  using (public.case_visible(case_id))
  with check (public.case_visible(case_id));

create policy disclosures_select on public.disclosures for select
  using (public.case_visible(case_id));
create policy disclosures_write on public.disclosures for all
  using (public.case_visible(case_id))
  with check (public.case_visible(case_id));
