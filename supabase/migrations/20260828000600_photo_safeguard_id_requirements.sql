-- ============================================================================
-- PORTAL_ALIGNMENT_REBUILD · Part 4a — two NEW portal-upload requirements.
--
--   PHO-01  Recent passport-type photograph — REQUIRED, and we did not collect it.
--           IMAGE FILE ONLY (a PDF is rejected by the portal here).
--   SGI-01  The safeguard person's government-issued photo ID (and, if the applicant
--           holds a firearm licence, its front AND back).
--
-- Both apply to every applicant (trigger 'always'); destination portal_upload.
-- ============================================================================
insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, source_url,
   validation_rule, trigger_cond, severity, document_type, effective_from,
   blocking, needs_legal_review, concierge_scope, destination)
select
  j.id, v.req_code, v.title, v.description, v.authority, v.source_url,
  v.validation_rule::jsonb, v.trigger_cond, v.severity::requirement_sev,
  v.document_type::public.document_type, date '2026-08-28',
  v.blocking, false, 'full'::public.concierge_scope, 'portal_upload'::public.requirement_destination
from (values
  ('PHO-01','Recent photograph',
   'A recent color passport-type photograph, front view, taken within the last 30 days — the same requirements as a U.S. Passport Book. No hats, headgear, or glasses (except for religious purposes); head not tilted; well lit. Absolutely no "selfies". Upload an IMAGE file (jpg, png, etc.) — a PDF is rejected here.',
   'NYPD License Division — online portal upload','https://licensing.nypdonline.org/',
   '{"kind":"document","document_type":"applicant_photo","image_only":true}','always','high','applicant_photo', true),
  ('SGI-01','Safeguard person''s photo ID',
   'A copy of the government-issued photo ID of the person who will safeguard your firearm(s). If you already hold a firearm licence, also upload its front AND back.',
   'NYPD License Division — online portal upload','https://licensing.nypdonline.org/',
   '{"kind":"document","document_type":"safeguard_id"}','always','high','safeguard_id', true)
) as v(req_code, title, description, authority, source_url, validation_rule, trigger_cond, severity, document_type, blocking)
cross join (select id from public.jurisdiction_profiles where key in ('nyc','special_carry')) as j;
