-- ============================================================================
-- PORTAL_ALIGNMENT_REBUILD (authoritative) · Part 4 — confidentiality is INLINE.
--
-- The live portal fills the Public Records Exemption on its own page (step 11), as
-- data — it is NOT an upload. So the uploaded PBR-01 is retired and replaced by
-- CON-01, which collects the grounds + election as data (destination 'internal') for
-- the signed record and the staff worksheet. Optional (non-blocking), asked of all.
-- ============================================================================

-- Retire the uploaded Public Records Exemption (effective yesterday, so it's inactive
-- today: materialize selects effective_to IS NULL OR effective_to >= today).
update public.requirements
   set effective_to = date '2026-08-28'
 where req_code = 'PBR-01'
   and effective_to is null;

insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, source_url,
   validation_rule, trigger_cond, severity, document_type, effective_from,
   blocking, needs_legal_review, concierge_scope, destination)
select
  j.id, 'CON-01', 'Confidentiality request (optional)',
  'By default a handgun licensee''s name, ZIP and licence type are a public record. You may ask the License Division to keep them confidential — the portal collects this on its own page, so we record your election and enter it for you.',
  'NY Penal Law § 400.00(5)(b)','https://licensing.nypdonline.org/',
  '{"kind":"document","document_type":"public_records_exemption"}'::jsonb,'always','watch'::requirement_sev,
  'public_records_exemption'::public.document_type, date '2026-08-29',
  false, false, 'full'::public.concierge_scope, 'internal'::public.requirement_destination
from (select id from public.jurisdiction_profiles where key in ('nyc','special_carry')) as j;
