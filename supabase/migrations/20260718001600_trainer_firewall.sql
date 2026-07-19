-- ============================================================================
-- THE TRAINER FIREWALL
--
-- An engaged trainer becomes the applicant's first-line reviewer. To do that
-- they need more than they have today (documents, identity) and LESS than they
-- have today (no disclosure existence, no staff prose).
--
-- WHY VIEWS AND NOT POLICIES: an RLS policy filters ROWS, never COLUMNS, and
-- column-level GRANTs are per-role while client, staff and instructor all share
-- the single `authenticated` role. There is therefore no policy that can say
-- "show a trainer this requirement but not its `notes`". The two broad
-- instructor policies are dropped and every trainer read goes through a curated
-- view instead — the same pattern `instructor_offer_feed` already uses.
--
-- ⚠️ THREE RULES THAT ARE LOAD-BEARING:
--
-- 1. A view runs with its OWNER's privileges and therefore BYPASSES the
--    underlying tables' RLS entirely. Each view's WHERE clause IS the security
--    boundary. A missing `and e.status = 'active'` here is a data breach, not a
--    bug. Read every WHERE below as though it were a policy, because it is one.
--
-- 2. NEVER add `security_invoker = true` to these views. It would make them
--    honour instructor RLS — which after this migration is *nothing* — so they
--    would return zero rows. That looks like a product outage, and the obvious
--    "fix" is to restore the broad policies this migration exists to remove.
--
-- 3. An aggregate over the hidden set is ITSELF a disclosure. "3 items handled
--    by Gun License NYC" tells a trainer the applicant has disclosure material
--    just as surely as the req_code does — 0 vs 3 is the signal. Hidden rows are
--    ABSENT. Progress counts are per-code branches for REF/COH only, never a
--    generic rollup over "everything sensitive".
--
-- THE WRITE RULE, in the form a reviewer can check: NO `UPDATE` GRANT ON ANY
-- CASE TABLE TO INSTRUCTORS, EVER. Trainer writes go through SECURITY DEFINER
-- RPCs (next migration), so there is one place to audit.
-- ============================================================================

-- ── Out with the broad doors ────────────────────────────────────────────────
-- cases_select_instructor exposed every column of the engaged case row,
-- including client_id, qa_signed_off_by and nypd_app_ref.
-- case_requirements_select_instructor exposed `notes` (staff prose, including
-- 'OVERRIDE:' rationale) and disclosure_id, and every req_code — which is how a
-- trainer could learn an arrest history existed.
drop policy if exists cases_select_instructor on public.cases;
drop policy if exists case_requirements_select_instructor on public.case_requirements;

-- ── The case, plus the identity needed to concierge it ──────────────────────
-- NOTE: this deliberately REVERSES the earlier "instructors never learn who the
-- applicant is" rule, but only for an ACTIVE engagement the trainer already
-- accepted. You cannot chase a missing document from someone you can't name.
-- The pre-accept offer feed stays redacted (instructor_offer_feed).
create or replace view public.trainer_case_scope with (security_barrier = true) as
  select
    c.id                    as case_id,
    e.id                    as engagement_id,
    i.id                    as instructor_id,
    i.trust_tier,
    c.stage,
    c.is_renewal,
    c.training_expires_on,
    cl.full_name            as applicant_name,
    cl.email                as applicant_email,
    cl.phone                as applicant_phone
  from public.engagements e
  join public.instructors i on i.id = e.instructor_id
  join public.cases c       on c.id = e.case_id
  join public.clients cl    on cl.id = c.client_id
  where i.profile_id = auth.uid()
    and e.status = 'active';

-- ── Requirements the trainer may work on ────────────────────────────────────
-- Hidden rows never appear. `notes`, `disclosure_id`, `reference_id` and
-- `cohabitant_id` are absent from the column list — that absence is the whole
-- point of using a view, so do not add them back "for convenience".
create or replace view public.trainer_requirement_feed with (security_barrier = true) as
  select
    cr.id           as case_requirement_id,
    cr.case_id,
    e.id            as engagement_id,
    cr.req_code,
    cr.status,
    cr.document_id,
    r.title,
    r.description,
    r.authority,
    r.severity,
    r.blocking,
    r.document_type,
    public.trainer_scope(cr.requirement_id, i.trust_tier) as scope
  from public.case_requirements cr
  join public.requirements r on r.id = cr.requirement_id
  join public.engagements e  on e.case_id = cr.case_id
  join public.instructors i  on i.id = e.instructor_id
  where i.profile_id = auth.uid()
    and e.status = 'active'
    and public.trainer_scope(cr.requirement_id, i.trust_tier) <> 'hidden';

-- ── Progress on third-party documents: counts, never contents ───────────────
-- Two explicit branches. A UNION over "every progress-scoped code" would be a
-- rollup, and a rollup is how the hidden set leaks back in.
create or replace view public.trainer_roster_progress with (security_barrier = true) as
  select
    cr.case_id,
    e.id as engagement_id,
    cr.req_code,
    case cr.req_code when 'REF-01' then 4 when 'REF-02' then 2 else null end as required_count,
    (select count(*) from public.character_references x
      where x.case_id = cr.case_id and x.notarized) as done_count,
    (select count(*) from public.character_references x
      where x.case_id = cr.case_id) as invited_count
  from public.case_requirements cr
  join public.engagements e on e.case_id = cr.case_id
  join public.instructors i on i.id = e.instructor_id
  where i.profile_id = auth.uid()
    and e.status = 'active'
    and cr.req_code in ('REF-01', 'REF-02')
  union all
  select
    cr.case_id,
    e.id,
    cr.req_code,
    (select count(*) from public.cohabitants x where x.case_id = cr.case_id)::int,
    (select count(*) from public.cohabitants x
      where x.case_id = cr.case_id and x.affidavit_status = 'notarized'),
    (select count(*) from public.cohabitants x
      where x.case_id = cr.case_id and x.token is not null)
  from public.case_requirements cr
  join public.engagements e on e.case_id = cr.case_id
  join public.instructors i on i.id = e.instructor_id
  where i.profile_id = auth.uid()
    and e.status = 'active'
    and cr.req_code = 'COH-01';

-- ── Documents the trainer may review ────────────────────────────────────────
-- Joined THROUGH case_requirements.document_id, so a document is visible only
-- once it is BOUND as evidence to a full-scope requirement. A stray upload that
-- nothing points at stays invisible — the fail-safe direction.
-- No file_path (bytes come from the mediated action) and no review_notes (staff
-- prose, which can quote disclosure content).
create or replace view public.trainer_document_feed with (security_barrier = true) as
  select
    d.id            as document_id,
    d.case_id,
    e.id            as engagement_id,
    cr.id           as case_requirement_id,
    cr.req_code,
    d.type,
    d.file_name,
    d.status,
    d.generated,
    d.signed_at,
    d.notarized,
    d.version,
    d.created_at
  from public.documents d
  join public.case_requirements cr on cr.case_id = d.case_id and cr.document_id = d.id
  join public.engagements e        on e.case_id = d.case_id
  join public.instructors i        on i.id = e.instructor_id
  where i.profile_id = auth.uid()
    and e.status = 'active'
    and public.trainer_scope(cr.requirement_id, i.trust_tier) = 'full';

-- ── The file-access predicate ───────────────────────────────────────────────
-- The authorization decision lives in SQL, not TypeScript: the server action
-- that mints a signed URL calls this first, and the negative tests can hit it
-- directly. One implementation, one place to audit.
create or replace function public.trainer_may_read_document(p_document_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.trainer_document_feed f where f.document_id = p_document_id
  )
$$;

-- SECURITY DEFINER functions default to EXECUTE for PUBLIC, which includes anon.
revoke all on function public.trainer_may_read_document(uuid) from public, anon;
grant execute on function public.trainer_may_read_document(uuid) to authenticated;

revoke all on public.trainer_case_scope        from anon;
revoke all on public.trainer_requirement_feed  from anon;
revoke all on public.trainer_roster_progress   from anon;
revoke all on public.trainer_document_feed     from anon;
grant select on public.trainer_case_scope       to authenticated;
grant select on public.trainer_requirement_feed to authenticated;
grant select on public.trainer_roster_progress  to authenticated;
grant select on public.trainer_document_feed    to authenticated;
