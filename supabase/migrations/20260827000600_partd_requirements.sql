-- ============================================================================
-- PART D · applicant requirement rows for the wired official forms
--
--   FAM-01  Affidavit of Familiarity with Rules & Law (38 RCNY 5-33) — NOTARISED.
--           Filled from the official affidavit-familiarity-5-33.pdf.
--   SFG-01  Acknowledgement of Person Agreeing to Safeguard Firearm(s) — WITNESSED.
--           Filled from the official safeguard-acknowledgement.pdf.
--   AFF-02  Affirmation re NYS Penal Law Art. 35/265/400 — official PDF OUTSTANDING;
--           modelled as obtain-and-upload until the template lands. TWO DISTINCT
--           instruments from FAM-01: satisfying one never satisfies the other.
--
-- All three are carry-applicant items (carry_not_renewal → concealed/special/guard,
-- not premises, not renewal). Seeded blocking=FALSE (advisory) until counsel signs
-- off the wording via /admin/legal — flip to blocking with a dated re-version then.
-- needs_legal_review=true; concierge_scope='full' (prepared paperwork, not
-- disclosure material).
-- ============================================================================
insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, source_url,
   validation_rule, trigger_cond, severity, document_type, effective_from,
   blocking, needs_legal_review, concierge_scope)
select
  j.id, v.req_code, v.title, v.description, v.authority, v.source_url,
  v.validation_rule::jsonb, v.trigger_cond, v.severity::requirement_sev,
  v.document_type::public.document_type, date '2026-08-27',
  false, true, 'full'::public.concierge_scope
from (values
  ('FAM-01','Affidavit of familiarity with rules and law',
   'A notarised affidavit (38 RCNY 5-33) that you are responsible for knowing the laws and rules applicable to your licence. We fill the official form; you sign it before a notary.',
   '38 RCNY §5-33','https://licensing.nypdonline.org/',
   '{"kind":"document","document_type":"affidavit_familiarity","notarize":true}','carry_not_renewal','high','affidavit_familiarity'),
  ('SFG-01','Acknowledgement of person agreeing to safeguard firearm(s)',
   'The New York State resident who will safeguard and surrender your firearm(s) if you die or become incapacitated signs this before a witness. We fill the official form from their details.',
   'NYPD License Division required-documents checklist','https://licensing.nypdonline.org/',
   '{"kind":"document","document_type":"safeguard_acknowledgement","witnessed":true}','carry_not_renewal','high','safeguard_acknowledgement'),
  ('AFF-02','Affirmation — Penal Law Art. 35/265/400',
   'A separate notarised affirmation that you have read and understand New York Penal Law Articles 35, 265 and 400. Distinct from the general affirmation of understanding. Your case team provides the official form until it is added to the platform.',
   'NY Penal Law Art. 35; Art. 265; Art. 400','https://licensing.nypdonline.org/',
   '{"kind":"document","document_type":"affirmation_penal_law","notarize":true}','carry_not_renewal','high','affirmation_penal_law')
) as v(req_code, title, description, authority, source_url, validation_rule, trigger_cond, severity, document_type)
cross join (select id from public.jurisdiction_profiles where key in ('nyc','special_carry')) as j;
