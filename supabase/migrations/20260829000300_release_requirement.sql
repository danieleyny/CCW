-- PORTAL_ALIGNMENT_REBUILD (authoritative) · Part 8 — REL-01 notarized Release.
-- A notarised release authorizing the License Division to obtain any and all relevant
-- information. Held for the interview / our file (destination 'interview'), NOT a
-- portal upload. Blocking — the applicant affirmed they would provide it.
insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, source_url,
   validation_rule, trigger_cond, severity, document_type, effective_from,
   blocking, needs_legal_review, concierge_scope, destination)
select
  j.id, 'REL-01', 'Notarized release authorization',
  'A signed and notarized Release authorizing the NYPD License Division to obtain any and all information it deems relevant to its review of your application. You affirm you will provide this; sign and notarize the release (sample in the portal''s Forms section) and bring the original to your interview.',
  'NYPD License Division — application affirmations','https://licensing.nypdonline.org/',
  '{"kind":"document","document_type":"notarized_release","notarize":true}'::jsonb,'always','high'::requirement_sev,
  'notarized_release'::public.document_type, date '2026-08-29',
  true, false, 'full'::public.concierge_scope, 'interview'::public.requirement_destination
from (select id from public.jurisdiction_profiles where key in ('nyc','special_carry')) as j;
