-- Staff-only progress tracking for transcribing an application into the NYPD online
-- portal. One row per (case, portal step) the staffer has marked as entered, so a
-- half-finished transcription survives a reload and a hand-off between staff. This is
-- pure internal bookkeeping — it never gates anything and is never visible to an
-- applicant, a sponsor, or an instructor.

create table if not exists public.portal_entry_progress (
  case_id uuid not null references public.cases(id) on delete cascade,
  step_no int not null,
  entered_at timestamptz not null default now(),
  entered_by uuid references public.profiles(id),
  primary key (case_id, step_no)
);

alter table public.portal_entry_progress enable row level security;

-- Staff/admin only, both directions. The service-role client (server actions) bypasses
-- RLS to write rows with a server-derived entered_by.
create policy portal_entry_progress_select on public.portal_entry_progress
  for select using (public.is_staff_or_admin());
create policy portal_entry_progress_write on public.portal_entry_progress
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
