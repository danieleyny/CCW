-- ============================================================================
-- Sponsor rejection visibility: expose the review note on the sponsor document
-- feed. A send-back is recorded on the DOCUMENT (documents.status='rejected' +
-- review_notes), not on case_requirements.status — so the sponsor's "Received —
-- under review" never flipped. Surfacing the doc status + note lets the rep see
-- the rejection and what to fix. The note is about the company's own packet doc
-- (or a full-scope applicant doc the rep already sees) — no new disclosure.
-- ============================================================================
create or replace view public.sponsor_document_feed with (security_barrier = true) as
  select
    d.id           as document_id,
    d.case_id,
    s.id           as sponsorship_id,
    cr.id          as case_requirement_id,
    cr.req_code,
    r.party,
    d.type,
    d.file_name,
    d.status,
    d.generated,
    d.signed_at,
    d.notarized,
    d.version,
    d.created_at,
    -- Appended LAST: create-or-replace view only allows adding columns at the end.
    d.review_notes
  from public.documents d
  join public.case_requirements cr on cr.case_id = d.case_id and cr.document_id = d.id
  join public.requirements r       on r.id = cr.requirement_id
  join public.case_sponsorships s  on s.case_id = d.case_id
  join public.profiles p           on p.id = auth.uid() and p.sponsor_id = s.sponsor_id
  where s.status = 'active' and s.applicant_consented_at is not null and s.revoked_at is null
    and public.party_scope(cr.requirement_id, 'sponsor', s.scope) = 'full';
