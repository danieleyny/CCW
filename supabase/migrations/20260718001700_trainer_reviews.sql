-- ============================================================================
-- TRAINER REVIEW — the write path
--
-- THE RULE, in the form a reviewer can check: NO `UPDATE` GRANT ON ANY CASE
-- TABLE TO INSTRUCTORS, EVER. Every trainer write goes through the SECURITY
-- DEFINER function below, so there is exactly one place to audit and one place
-- where the scope check can be forgotten.
--
-- WHERE THE PROSE LIVES: `requirement_reviews.note`, never
-- `case_requirements.notes`. That column is staff work product — it carries
-- 'OVERRIDE:' rationale and can quote disclosure content — and it is now
-- structurally unreachable by a trainer because the trainer views omit it.
--
-- WHY A SEPARATE TABLE and not columns on case_requirements: an append-only log
-- (the `signature_events` pattern) keeps the history of "you asked for a fix,
-- they resubmitted, you approved" rather than overwriting it. The applicant's
-- status ladder is DERIVED from the latest row, so it can never desynchronize
-- from the enums the way a stored duplicate would.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'review_decision') then
    create type public.review_decision as enum ('approved', 'changes_requested');
  end if;
end $$;

create table if not exists public.requirement_reviews (
  id                  uuid primary key default gen_random_uuid(),
  case_requirement_id uuid not null references public.case_requirements(id) on delete cascade,
  case_id             uuid not null references public.cases(id) on delete cascade,
  engagement_id       uuid references public.engagements(id) on delete set null,
  reviewer            uuid references public.profiles(id) on delete set null,
  reviewer_kind       text not null check (reviewer_kind in ('trainer', 'staff')),
  decision            public.review_decision not null,
  note                text,
  document_id         uuid references public.documents(id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_requirement_reviews_cr
  on public.requirement_reviews (case_requirement_id, created_at desc);
create index if not exists idx_requirement_reviews_case
  on public.requirement_reviews (case_id, created_at desc);

alter table public.requirement_reviews enable row level security;

-- Read: the applicant and staff see everything on their case. A trainer sees
-- only TRAINER rows, and only on an engagement of theirs.
--
-- The `reviewer_kind = 'trainer'` clause is load-bearing and easy to leave out:
-- a STAFF review note can quote disclosure content, so a trainer must not read
-- staff rows even on a case they're legitimately working.
create policy requirement_reviews_select on public.requirement_reviews for select
  using (
    public.case_visible(case_id)
    or (
      engagement_id is not null
      and reviewer_kind = 'trainer'
      and public.instructor_owns_engagement(engagement_id)
    )
  );

-- No insert/update/delete for anybody: the RPC below is the sole writer, and
-- staff writes go through the service role.
revoke insert, update, delete on public.requirement_reviews from authenticated;
grant select on public.requirement_reviews to authenticated;

-- ── The one write a trainer can make ────────────────────────────────────────
create or replace function public.trainer_review_requirement(
  p_case_requirement_id uuid,
  p_decision public.review_decision,
  p_note text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_item     record;
  v_uid      uuid := auth.uid();
  v_review   uuid;
  v_client   record;
begin
  -- Re-derive everything from the VIEW, so the view's WHERE clause — which is
  -- the security boundary — is also the guard here. Nothing is trusted from the
  -- caller except the id.
  select f.* into v_item
  from public.trainer_requirement_feed f
  where f.case_requirement_id = p_case_requirement_id;

  if not found then
    raise exception 'That item is not yours to review.';
  end if;

  -- Progress-only items (cohabitant affidavits, reference letters) are written
  -- and notarized by third parties. A trainer chases them; they do not approve
  -- them, and they never see them.
  if v_item.scope <> 'full' then
    raise exception 'Requirement % is not reviewable by a trainer.', v_item.req_code;
  end if;

  if p_decision = 'approved' then
    -- Approval binds real evidence. The 'OVERRIDE:' escape hatch in
    -- forbid_satisfied_without_evidence() stays staff-only precisely because
    -- this function never writes case_requirements.notes.
    if v_item.document_type is not null and v_item.document_id is null then
      raise exception 'Nothing is attached to % yet.', v_item.req_code;
    end if;

    update public.case_requirements
       set status = 'satisfied', reviewer = v_uid
     where id = p_case_requirement_id;
  else
    if coalesce(btrim(p_note), '') = '' then
      raise exception 'Say what needs fixing — a change request without a reason is not actionable.';
    end if;
    -- Back to pending so the applicant can resubmit. `na` is left alone: only
    -- staff decide a requirement doesn't apply.
    update public.case_requirements
       set status = 'pending'
     where id = p_case_requirement_id
       and status <> 'na';
  end if;

  insert into public.requirement_reviews
    (case_requirement_id, case_id, engagement_id, reviewer, reviewer_kind, decision, note, document_id)
  values
    (p_case_requirement_id, v_item.case_id, v_item.engagement_id, v_uid, 'trainer',
     p_decision, nullif(btrim(coalesce(p_note, '')), ''), v_item.document_id)
  returning id into v_review;

  -- Tell the applicant, on the exact item. A change request that nobody sees is
  -- just a case sitting still.
  if p_decision = 'changes_requested' then
    select cl.profile_id, cl.id into v_client
    from public.cases c join public.clients cl on cl.id = c.client_id
    where c.id = v_item.case_id;

    if v_client.profile_id is not null then
      insert into public.notifications (recipient, case_id, kind, title, body, link)
      values (
        v_client.profile_id,
        v_item.case_id,
        'action_required',
        'Your instructor asked for a small fix',
        format('%s — %s', v_item.title, btrim(p_note)),
        '/portal/checklist'
      );
    end if;
  end if;

  return v_review;
end $$;

revoke all on function public.trainer_review_requirement(uuid, public.review_decision, text) from public, anon;
grant execute on function public.trainer_review_requirement(uuid, public.review_decision, text) to authenticated;

-- ── The applicant's view of who reviewed what ───────────────────────────────
-- Used to render "your instructor reviewed this" without exposing staff rows.
create or replace view public.requirement_review_latest with (security_barrier = true) as
  select distinct on (r.case_requirement_id)
    r.case_requirement_id,
    r.case_id,
    r.decision,
    r.note,
    r.reviewer_kind,
    r.created_at
  from public.requirement_reviews r
  where public.case_visible(r.case_id)
  order by r.case_requirement_id, r.created_at desc;

revoke all on public.requirement_review_latest from anon;
grant select on public.requirement_review_latest to authenticated;
