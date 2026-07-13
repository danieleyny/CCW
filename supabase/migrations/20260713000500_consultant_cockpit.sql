-- ============================================================================
-- V3 Phase 2 — the consultant cockpit: case notes, stage aging, and the
-- persistent CP-5 pre-filing sign-off.
--
--  · case_notes — the single highest-leverage missing feature: a consultant on
--    40 cases cannot remember 40 conversations. INTERNAL ONLY (staff/admin RLS;
--    clients and instructors can never read notes about themselves).
--  · cases.stage_entered_at — powers "days in stage" and stall detection;
--    set by setCaseStage on every transition. Backfilled from updated_at.
--  · cases.qa_signed_off_by/at — the named-human sign-off the CP-5 gate
--    requires before a case may enter application_assembled/filed.
-- ============================================================================

-- ── case_notes ───────────────────────────────────────────────────────────────
create table public.case_notes (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.cases(id) on delete cascade,
  author     uuid references public.profiles(id) on delete set null,
  body       text not null,
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_case_notes_case on public.case_notes (case_id, pinned desc, created_at desc);

create trigger trg_case_notes_updated_at
  before update on public.case_notes
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.case_notes to authenticated;

alter table public.case_notes enable row level security;
-- Internal work product: staff/admin only. No client policy, no instructor
-- policy — a subject must never read the consultant's notes about them.
create policy case_notes_select on public.case_notes for select
  using (public.is_staff_or_admin());
create policy case_notes_write on public.case_notes for all
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

-- ── stage aging + QA sign-off ────────────────────────────────────────────────
alter table public.cases
  add column if not exists stage_entered_at timestamptz not null default now(),
  add column if not exists qa_signed_off_by uuid references public.profiles(id) on delete set null,
  add column if not exists qa_signed_off_at timestamptz;

-- Best-available backfill: the case last changed when it was last touched.
update public.cases set stage_entered_at = updated_at;

-- ── unread-message lookups (unified inbox) ───────────────────────────────────
create index if not exists idx_messages_unread on public.messages (case_id) where not read;
