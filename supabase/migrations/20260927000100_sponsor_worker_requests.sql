-- ============================================================================
-- Sponsor multi-worker (S1). Two changes:
--
-- 1. sponsor_worker_requests — a rep asks staff to add another worker. The rep
--    NEVER self-provisions (provisioning mints accounts + bindings and the sponsor
--    read layer is deliberately built so a rep can never reach the admin client).
--    So the rep INSERTs a request for their OWN company only, staff approve it, and
--    approval runs addSponsoredWorker with the admin client. RLS: a rep may INSERT
--    a row for their own sponsor_id and SELECT only their own rows — no UPDATE, no
--    DELETE (only staff, via is_staff_or_admin). A rep cannot write `tasks`
--    (staff-only RLS), so an AFTER INSERT trigger (SECURITY DEFINER) raises the
--    staff task. The request carries only rep-typed data and never looks a case up,
--    so a later decline can't leak whether the applicant already had a case.
--
-- 2. sponsor_case_scope gains two columns the employer board needs: the home-county
--    pistol-licence expiry (the single highest-consequence date for a Special Carry
--    Guard worker — the NYC licence voids if it lapses) and the case's last-movement
--    date. Both are low-sensitivity, employer-relevant, and added to the existing
--    security-barrier view (party_scope still governs every requirement/document).
-- ============================================================================

create table if not exists public.sponsor_worker_requests (
  id              uuid primary key default gen_random_uuid(),
  sponsor_id      uuid not null references public.sponsors (id) on delete cascade,
  requested_by    uuid not null references public.profiles (id) on delete cascade,
  applicant_name  text not null,
  applicant_email citext not null,
  assignment_role text,
  requested_scope public.sponsorship_scope not null default 'packet_only',
  status          text not null default 'pending', -- pending | approved | declined
  decline_reason  text,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  resolved_by     uuid references public.profiles (id) on delete set null
);
create index if not exists idx_swr_sponsor on public.sponsor_worker_requests (sponsor_id, status);
create index if not exists idx_swr_requested_by on public.sponsor_worker_requests (requested_by);

alter table public.sponsor_worker_requests enable row level security;
revoke all on public.sponsor_worker_requests from anon;

-- Staff/admin: full access (they resolve requests).
create policy swr_staff_all on public.sponsor_worker_requests
  for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- Rep: may create a request for THEIR OWN company only, as themselves. The check
-- references profiles (another table), never this table — avoiding the
-- self-referential-SELECT-breaks-INSERT pitfall.
create policy swr_rep_insert on public.sponsor_worker_requests
  for insert to authenticated
  with check (
    requested_by = auth.uid()
    and sponsor_id = (select p.sponsor_id from public.profiles p where p.id = auth.uid())
  );

-- Rep: may read ONLY their own requests. No update/delete policy → reps cannot
-- change or remove a request once submitted (only staff can, via swr_staff_all).
create policy swr_rep_select on public.sponsor_worker_requests
  for select to authenticated
  using (requested_by = auth.uid());

-- On insert, raise a staff task so the request lands in the existing queue. Runs as
-- definer because a rep has no write access to `tasks`. case_id is null (no case
-- exists yet) and assignee is null (it sits in the shared queue). No case lookup, so
-- nothing here reveals whether the applicant already has a file.
create or replace function public.sponsor_worker_request_task()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_company text;
begin
  select legal_name into v_company from public.sponsors where id = new.sponsor_id;
  insert into public.tasks (case_id, title, description, assignee, priority)
  values (
    null,
    'Sponsor worker request: ' || new.applicant_name,
    coalesce(v_company, 'A sponsor') || ' requested a new worker — ' || new.applicant_name
      || ' (' || new.applicant_email || '), role: ' || coalesce(nullif(new.assignment_role, ''), '—')
      || ', requested scope: ' || new.requested_scope || '. Review under Admin → Sponsorships.',
    null,
    1
  );
  return new;
end $$;

drop trigger if exists trg_swr_task on public.sponsor_worker_requests;
create trigger trg_swr_task after insert on public.sponsor_worker_requests
  for each row execute function public.sponsor_worker_request_task();

-- ── Employer board columns on the sponsor case view ─────────────────────────
-- create-or-replace can only APPEND columns; the two new ones go last. Same WHERE
-- (active + consented + non-revoked binding for the current rep) — unchanged boundary.
create or replace view public.sponsor_case_scope with (security_barrier = true) as
  select
    c.id                        as case_id,
    s.id                        as sponsorship_id,
    s.sponsor_id,
    s.scope,
    c.stage,
    c.license_track,
    cl.full_name                as applicant_name,
    c.county_license_expires_on as county_license_expires_on,
    c.updated_at                as updated_at
  from public.case_sponsorships s
  join public.profiles p on p.id = auth.uid() and p.sponsor_id = s.sponsor_id
  join public.cases c    on c.id = s.case_id
  join public.clients cl on cl.id = c.client_id
  where s.status = 'active'
    and s.applicant_consented_at is not null
    and s.revoked_at is null;
