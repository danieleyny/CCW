-- ============================================================================
-- PORTAL_ALIGNMENT_REBUILD · Part 2 requirement wiring.
--
-- The NYPD online portal captures disclosure explanations inline (no separate
-- PD 643-041A addendum), and two disclosure answers now spawn documents:
--   · portal Q7 felony/serious-offense CONVICTION → Certificate of Relief (COR-01)
--   · portal Q17 confidentiality REQUEST          → Public Records Exemption (PBR-01)
--
--   QUE-01  the on-platform PD 643-041A addendum — RETIRED (the portal has no addendum).
--           Retired as of 2026-08-27 so it drops out of the current set immediately
--           (materialize selects effective_to IS NULL OR effective_to >= today).
--   PBR-01  re-triggered from 'carry_only' to 'if_confidentiality_request'. PBR-01 was
--           added earlier THIS SAME DAY (20260828000200); a same-day correction of a
--           just-added row is an in-place UPDATE, not a new dated version (the
--           (jurisdiction, req_code, effective_from) key forbids a duplicate date, and
--           effective_from must be <= today to be selected).
--   COR-01  NEW — the outstanding round-3 gap, now confirmed by the portal's own Q7 note.
-- ============================================================================

-- Retire the addendum requirement (as of yesterday, so it's inactive today).
update public.requirements
   set effective_to = date '2026-08-27'
 where req_code = 'QUE-01'
   and effective_to is null;

-- Re-trigger the public-records requirement onto the confidentiality opt-in.
update public.requirements
   set trigger_cond = 'if_confidentiality_request',
       severity     = 'watch'::requirement_sev,
       title        = 'Public Records Exemption (confidentiality request)',
       description  = 'You requested that your name and address be kept confidential (portal Q17). New York State requires the "Request for Public Records Exemption" form, stating your reason. We prepare it; you complete the reason and upload it under Additional Documents.'
 where req_code = 'PBR-01'
   and effective_to is null;

-- New: Certificate of Relief from Disabilities (portal Q7 felony/serious-offense conviction).
insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, source_url,
   validation_rule, trigger_cond, severity, document_type, effective_from,
   blocking, needs_legal_review, concierge_scope)
select
  j.id, 'COR-01', 'Certificate of Relief from Disabilities',
  'Because you disclosed a felony or serious-offense conviction (Penal Law § 265.00(17)), an ORIGINAL, signed Certificate of Relief from Disabilities must be submitted. Obtain it from the court of conviction and upload the original.',
  'NY Penal Law § 265.00(17); NYPD License Division','https://licensing.nypdonline.org/',
  '{"kind":"document","document_type":"cert_relief_disabilities"}'::jsonb,'if_felony_conviction','critical'::requirement_sev,
  'cert_relief_disabilities'::public.document_type, date '2026-08-28',
  true, true, 'full'::public.concierge_scope
from (select id from public.jurisdiction_profiles where key in ('nyc','special_carry')) as j;
