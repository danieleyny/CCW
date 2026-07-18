-- ============================================================================
-- In-app chat between an applicant and their chosen instructor.
--
-- The case `messages` thread is client↔staff. The instructor must NOT see it
-- (staff notes / PII discussion), so an instructor↔applicant thread is a
-- SEPARATE lane keyed by engagement_id:
--   engagement_id IS NULL  → the existing client↔staff thread
--   engagement_id = <eng>  → the applicant↔instructor thread for that engagement
-- The client sees both (their case); the instructor sees ONLY their engagement's
-- messages — never the staff thread or any disclosure.
-- ============================================================================

alter table public.messages
  add column if not exists engagement_id uuid references public.engagements(id) on delete cascade;
create index if not exists idx_messages_engagement on public.messages (engagement_id);

-- Does the calling instructor own this engagement? (security definer — reads
-- engagements/instructors regardless of the caller's own RLS.)
create or replace function public.instructor_owns_engagement(p_engagement_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.engagements e
    join public.instructors i on i.id = e.instructor_id
    where e.id = p_engagement_id and i.profile_id = auth.uid()
  )
$$;

-- Rebuild the messages read/write policies to add the instructor branch. The
-- staff thread (engagement_id IS NULL) is unreachable by the instructor branch,
-- so instructors stay walled off from it.
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select
  using (
    public.case_visible(case_id)
    or (engagement_id is not null and public.instructor_owns_engagement(engagement_id))
  );

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert
  with check (
    public.case_visible(case_id)
    or (engagement_id is not null and public.instructor_owns_engagement(engagement_id))
  );

-- messages_update (mark-read) stays client/staff-only — instructors don't need it.
