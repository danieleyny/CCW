-- Intended use in NYC decides the licence CATEGORY (personal Special Carry vs Special
-- Carry Guard), and a switch between them changes the legal category of the application.
-- So the answer is recorded with a timestamp and, crucially, APPEND-ONLY: a change keeps
-- BOTH values (the history is the audit) and a staff task is raised — it must never happen
-- silently. The current intent is the latest row for a case.
create table if not exists public.case_intent_log (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.cases (id) on delete cascade,
  intent       text not null check (intent in ('personal', 'armed_assignment')),
  recorded_at  timestamptz not null default now(),
  recorded_by  uuid references public.profiles (id) on delete set null,
  note         text
);
create index if not exists idx_case_intent_log_case on public.case_intent_log (case_id, recorded_at desc);

alter table public.case_intent_log enable row level security;

-- Readable by staff/admin and by the applicant who owns the case; never written directly
-- by a client (intake records it server-side with the service role, which bypasses RLS).
-- No insert/update/delete policy = no non-service writer, and the history is immutable.
drop policy if exists case_intent_log_select on public.case_intent_log;
create policy case_intent_log_select on public.case_intent_log
  for select using (public.is_staff_or_admin() or public.case_visible(case_id));
