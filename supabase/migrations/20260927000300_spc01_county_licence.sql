-- SPC-01 was modelled as an ADVISORY ("track both expirations") — blocking=false,
-- document_type null. A live walk of a civilian Special Carry application in the NYPD
-- portal (26 Sep 2026) proved that wrong: the home-county carry licence is MANDATORY
-- data (step 5, five required fields) AND a front/back upload (step 15). Left advisory,
-- the readiness/QA gate could report a case ready to file with the document the whole
-- application rests on absent — the same defect class as a portal-starred slot marked
-- optional in code.
--
-- This is a rule CHANGE, so we close the old dated version and insert a new one (never
-- edit a shipped row). The new SPC-01 mirrors SCG-01 (the guard county doc): a blocking
-- `county_pistol_license` document. It is scoped `unless_armed` so it fires ONLY for the
-- civilian Special Carry applicant — a sponsored armed guard in the same `special_carry`
-- jurisdiction already carries SCG-01 and must not double-gate.
--
-- NB the 20260719000100 note that SPC-01 is "advisory BY NATURE, do not sweep it in"
-- described the old row; the portal walk corrected its premise. legal_status stays
-- 'enforced' (a court never stopped it); only its blocking/document nature changes.

-- 1. Close the old advisory version (special_carry jurisdiction, the only place it lives).
update public.requirements
   set effective_to = date '2026-09-26'
 where req_code = 'SPC-01'
   and effective_to is null
   and jurisdiction_id = (select id from public.jurisdiction_profiles where key = 'special_carry');

-- 2. Insert the new blocking document version, dated the day after the close.
insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, source_url,
   validation_rule, trigger_cond, severity, document_type, effective_from,
   blocking, needs_legal_review, concierge_scope, destination)
select
  (select id from public.jurisdiction_profiles where key = 'special_carry'),
  'SPC-01', 'Your home-county carry licence (front and back)',
  'Your active carry/pistol licence from your home county, front and back. A civilian Special Carry licence is built on top of it and is valid only while that county licence remains active — it voids automatically if the county licence is revoked, suspended, cancelled or surrendered (38 RCNY §5-25). You must carry both licences whenever you carry in the city.',
  '38 RCNY §5-25 (validity dependency)', 'https://licensing.nypdonline.org/',
  '{"kind":"document","document_type":"county_pistol_license","must_be_active":true}'::jsonb,
  'unless_armed', 'high'::requirement_sev, 'county_pistol_license'::document_type, date '2026-09-27',
  true, true, 'full'::public.concierge_scope, 'portal_upload'::public.requirement_destination;
