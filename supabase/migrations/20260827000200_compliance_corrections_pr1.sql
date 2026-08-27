-- ============================================================================
-- COMPLIANCE PR1 · registry corrections (versioned; nothing edited in place)
--
--   Correction 1 (E4)  SSN-01 — the Social Security CARD is a required upload for
--                       ALL licence types. Sensitive: no concierge_scope set →
--                       defaults `hidden` (a trainer never learns it exists), the
--                       same firewall the disclosure documents use. The SSN NUMBER
--                       is untouched (still at_filing, never sponsor-resolved).
--
--   Correction 2       SAF-01 (safe-storage photographs): trigger `unless_armed`
--                       → `premises_only`. Safe photos belong to Premise Business
--                       ONLY (they were still firing on concealed carry). Every
--                       premises case is premises_business in this system, so
--                       `premises_only` == premise-business only. The Q30 safeguard
--                       narrative and the safeguard acknowledgement form are
--                       separate, intake-driven, and untouched here.
--
-- needs_legal_review is left as-is on re-versioned rows.
-- ============================================================================

-- ── Correction 1 · SSN-01 (nyc + special_carry), sensitive/hidden ─────────────
insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority,
   validation_rule, trigger_cond, severity, document_type, effective_from)
select
  j.id,
  'SSN-01',
  'Social Security card',
  'A clear photo or scan of your Social Security card. Required for every NYPD handgun-licence type. We store the card image securely; we never store or ask for the number itself here.',
  'NYPD License Division required-documents checklist; 38 RCNY §5-03',
  '{"kind":"document","document_type":"social_security_card"}'::jsonb,
  'always',
  'high'::requirement_sev,
  'social_security_card'::public.document_type,
  date '2026-08-27'
from (select id from public.jurisdiction_profiles where key in ('nyc','special_carry')) as j;

-- ── Correction 2 · SAF-01 unless_armed → premises_only ───────────────────────
do $$
declare r record;
begin
  for r in
    select * from public.requirements
     where req_code = 'SAF-01' and effective_to is null
  loop
    insert into public.requirements
      (jurisdiction_id, req_code, title, description, authority, source_url,
       validation_rule, trigger_cond, severity, document_type, effective_from,
       effective_to, blocking, needs_legal_review, concierge_scope, party, applicant_scope)
    values
      (r.jurisdiction_id, r.req_code, r.title, r.description, r.authority, r.source_url,
       r.validation_rule, 'premises_only', r.severity, r.document_type, date '2026-08-27',
       null, r.blocking, r.needs_legal_review, r.concierge_scope, r.party, r.applicant_scope);
  end loop;

  update public.requirements set effective_to = date '2026-08-26'
   where req_code = 'SAF-01'
     and effective_to is null
     and effective_from < date '2026-08-27';
end $$;
