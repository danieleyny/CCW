-- ============================================================================
-- B3B — a private STAFF↔INSTRUCTOR message lane.
--
-- Today `messages` has two lanes keyed by engagement_id:
--   engagement_id IS NULL  → staff↔client
--   engagement_id = <eng>  → client↔instructor
-- Both always include the CLIENT as a reader (via case_visible / the case's
-- client). There is no lane where staff and the instructor can talk WITHOUT the
-- client seeing it — and engagement_id alone can't create one, because any
-- non-null-engagement row is already client-readable.
--
-- So we add a discriminator column `staff_only`. The three lanes become:
--   staff_only=false, engagement_id IS NULL  → staff↔client   (unchanged)
--   staff_only=false, engagement_id = <eng>  → client↔instructor (unchanged)
--   staff_only=true,  engagement_id = <eng>  → STAFF↔INSTRUCTOR (new, client-hidden)
--
-- The RLS is rewritten so the CLIENT can only see staff_only=false rows on their
-- own case; the instructor sees their engagement's rows (both values); staff see
-- everything. This lane carries NO applicant disclosures/PII — it's a staff↔
-- instructor coordination channel, and the firewall (curated trainer_* views)
-- is untouched.
-- ============================================================================

alter table public.messages
  add column if not exists staff_only boolean not null default false;

-- A CLIENT-ONLY visibility predicate (case_visible also grants staff, which we
-- must NOT do for the client branch — else staff_only rows would be hidden from
-- staff too). True only when the caller is the case's own client.
create or replace function public.case_client_is_me(p_case_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.cases ca
    join public.clients cl on cl.id = ca.client_id
    where ca.id = p_case_id and cl.profile_id = auth.uid()
  )
$$;

-- ── Rebuild the three message policies with the staff_only discriminator ─────
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select
  using (
    public.is_staff_or_admin()
    or (public.case_client_is_me(case_id) and staff_only = false)
    or (engagement_id is not null and public.instructor_owns_engagement(engagement_id))
  );

-- Preserve the escalation-guard strictness (20260718001400): the sender is
-- bound to the session AND, for the instructor branch, the message must land on
-- the engagement's OWN case with an ACTIVE engagement — one valid engagement is
-- not a key to every case. We only add the staff_only discriminator on top.
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert
  with check (
    sender_id = auth.uid()
    and (
      public.is_staff_or_admin()
      or (public.case_client_is_me(case_id) and staff_only = false)
      or (
        engagement_id is not null
        and public.instructor_engagement_writable(engagement_id)
        and case_id = (select e.case_id from public.engagements e where e.id = engagement_id)
      )
    )
  );

-- Mark-read: same reach as select, so an instructor can clear their staff lane
-- and a client can clear theirs. The client still can't touch staff_only rows.
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update
  using (
    public.is_staff_or_admin()
    or (public.case_client_is_me(case_id) and staff_only = false)
    or (engagement_id is not null and public.instructor_owns_engagement(engagement_id))
  )
  with check (
    public.is_staff_or_admin()
    or (public.case_client_is_me(case_id) and staff_only = false)
    or (engagement_id is not null and public.instructor_owns_engagement(engagement_id))
  );
