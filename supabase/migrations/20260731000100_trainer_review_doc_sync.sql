-- ============================================================================
-- B1A — trainer approval must also move the linked DOCUMENT, not just the
-- requirement.
--
-- Before: trainer_review_requirement set case_requirements.status='satisfied'
-- but never touched the bound documents row. So a document a trainer had
-- already cleared still read status='pending' — inflating admin's "Docs to
-- review" count (app/admin/page.tsx) and showing unreviewed in the Documents
-- tab even though the checklist item was green. Staff's reviewDocument
-- (app/admin/actions.ts) always did BOTH halves; the trainer path did one.
--
-- This create-or-replace adds the second half, mirroring the staff behaviour:
--   • approved          → the bound document goes to 'approved' (+ reviewer +
--                         an instructor-attributed review note).
--   • changes_requested → a previously trainer-approved document is reverted to
--                         'pending' so it re-enters the review queue.
-- Everything else (the scope guard, the requirement_reviews audit row, the
-- applicant notification, the privacy rule that prose lives only in
-- requirement_reviews.note) is unchanged.
--
-- documents.review_notes is staff/instructor-scoped work product, NOT the field
-- an engaged instructor reads on case_requirements.notes — so an attribution
-- string here does not widen the firewall.
-- ============================================================================

create or replace function public.trainer_review_requirement(
  p_case_requirement_id uuid,
  p_decision public.review_decision,
  p_note text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_item          record;
  v_uid           uuid := auth.uid();
  v_review        uuid;
  v_client        record;
  v_reviewer_name text;
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

  select full_name into v_reviewer_name from public.profiles where id = v_uid;

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

    -- B1A: clear the bound document too, so admin's doc queue reflects reality.
    if v_item.document_id is not null then
      update public.documents
         set status = 'approved',
             reviewer = v_uid,
             review_notes = format('Approved via trainer review by %s', coalesce(v_reviewer_name, 'instructor'))
       where id = v_item.document_id
         and status <> 'approved';
    end if;
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

    -- B1A: reverse a prior trainer approval on the bound document so it returns
    -- to the review queue. Documents that were never approved stay as they are.
    if v_item.document_id is not null then
      update public.documents
         set status = 'pending'
       where id = v_item.document_id
         and status = 'approved';
    end if;
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
