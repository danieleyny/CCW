-- ============================================================================
-- APPLICATION_COMPLETION · Parts 4 & 10 — carry-track requirement rows.
--
--   LON-01  Letter of Necessity — MANDATORY for a carry licence used in connection
--           with a business or profession. "In ALL CASES the form provided must be
--           used." Previously only the sponsor-only SPN-02 ("a letter on company
--           letterhead") existed, so a non-sponsored concealed-carry applicant got
--           no letter of necessity from anywhere. We fill the OFFICIAL form and page
--           4 of the PD 643-041 from the same six statements (LON-01, generate).
--           BLOCKING — a carry filing is incomplete without it.
--   PBR-01  Public-records exemption (PL §400.00(5)(b)) — OPTIONAL. Offered on the
--           carry tracks; hand-filled for v1. Non-blocking.
--
-- Carry tracks only (carry_not_renewal → concealed / special / guard, not premises,
-- not renewal for LON-01; carry_only for the optional PBR-01). needs_legal_review on
-- LON-01 flags the statement wording for counsel via /admin/legal; concierge_scope
-- 'full' (prepared paperwork, not disclosure material).
-- ============================================================================
insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, source_url,
   validation_rule, trigger_cond, severity, document_type, effective_from,
   blocking, needs_legal_review, concierge_scope)
select
  j.id, v.req_code, v.title, v.description, v.authority, v.source_url,
  v.validation_rule::jsonb, v.trigger_cond, v.severity::requirement_sev,
  v.document_type::public.document_type, date '2026-08-28',
  v.blocking, v.needs_legal_review, 'full'::public.concierge_scope
from (values
  ('LON-01','Letter of necessity',
   'A carry licence for business or professional use requires a Letter of Necessity on the NYPD''s own form. You describe your employment and how the handgun is safeguarded; the acknowledgements are pre-filled from the form''s language. It is signed as part of your application.',
   '38 RCNY §5-03; PD 643-041 page 4','https://licensing.nypdonline.org/',
   '{"kind":"document","document_type":"letter_of_necessity"}','carry_not_renewal','high','letter_of_necessity',
   true, true),
  ('PBR-01','Public-records exemption (optional)',
   'By default a handgun licensee''s name and address are a public record (PL §400.00(5)). This optional form asks the License Division to withhold yours. Hand-filled and uploaded.',
   'NY Penal Law §400.00(5)(b)','https://licensing.nypdonline.org/',
   '{"kind":"document","document_type":"public_records_exemption"}','carry_only','watch','public_records_exemption',
   false, false)
) as v(req_code, title, description, authority, source_url, validation_rule, trigger_cond, severity, document_type, blocking, needs_legal_review)
cross join (select id from public.jurisdiction_profiles where key in ('nyc','special_carry')) as j;
