-- ============================================================================
-- Reconcile requirement ↔ document status desyncs already in the data.
--
-- (1) FORWARD: an APPROVED document exists for a requirement (matched by
--     req_code) but the requirement was left unsatisfied/unbound. This is the
--     IDN-03 class of bug — the staff-approval cascade matched requirements by
--     the registry document_type, which is NULL for some reqs, so those
--     approvals never satisfied the requirement even though the document was
--     approved. Satisfy + bind them.
--
-- (2) REVERSE: the B1A backfill — a requirement a trainer satisfied BEFORE the
--     doc-sync fix (20260731000100), whose bound document is still 'pending'.
--     Move the document to 'approved' so admin's doc queue matches reality.
--
-- Both are idempotent and only touch rows that are genuinely out of sync.
-- (Docs uploaded without a req_code are handled going forward by the corrected
-- reviewDocument cascade; the applicant's checklist already reads the document
-- status directly, so the card and the upload widget agree regardless.)
-- ============================================================================

update public.case_requirements cr
set status = 'satisfied', document_id = d.id
from public.documents d
where d.case_id = cr.case_id
  and d.req_code = cr.req_code
  and d.status = 'approved'
  and cr.status not in ('satisfied', 'na');

update public.documents d
set status = 'approved'
from public.case_requirements cr
where cr.document_id = d.id
  and cr.status = 'satisfied'
  and d.status = 'pending';
