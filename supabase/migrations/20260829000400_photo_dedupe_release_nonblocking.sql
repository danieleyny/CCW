-- ============================================================================
-- CHECKLIST_UPGRADE · Part A (photo dedupe) + Part F (release non-blocking).
--
-- Part A: IDN-04 and PHO-01 were both "applicant_photo" — two cards for one headshot.
-- PHO-01 (the portal's own wording) is the survivor. Carry any satisfied IDN-04 photo
-- across so nobody re-uploads, repoint the stored document, and retire IDN-04.
--
-- Part F: REL-01 (notarized release) must NOT block filing — the portal only has the
-- applicant AFFIRM at step 16 that they WILL provide it; the document itself is an
-- interview-stage item. Blocking it stalls a case for something NYPD hasn't asked for.
-- ============================================================================

-- Carry a satisfied IDN-04 photo onto PHO-01.
update public.case_requirements pho
   set status = 'satisfied', document_id = idn.document_id
  from public.case_requirements idn
 where idn.case_id = pho.case_id
   and pho.req_code = 'PHO-01'
   and idn.req_code = 'IDN-04'
   and idn.status = 'satisfied'
   and pho.status <> 'satisfied';

-- Repoint the stored photo document from IDN-04 to PHO-01.
update public.documents set req_code = 'PHO-01' where req_code = 'IDN-04';

-- Retire IDN-04 (as of yesterday, inactive today) and drop its per-case rows so the
-- duplicate card stops rendering.
update public.requirements set effective_to = date '2026-08-28' where req_code = 'IDN-04' and effective_to is null;
update public.case_requirements set status = 'na' where req_code = 'IDN-04' and status <> 'satisfied';

-- Part F: the release does not block filing.
update public.requirements set blocking = false where req_code = 'REL-01' and effective_to is null;
