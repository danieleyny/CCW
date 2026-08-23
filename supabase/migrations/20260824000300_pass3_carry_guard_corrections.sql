-- ============================================================================
-- CARRY GUARD — PASS 3 · regulatory corrections (3A) + de-scope (3B)
--
-- Versioned edits only (close the live row's effective_to, insert a new dated
-- version). Nothing is edited in place; every existing non-armed case resolves
-- byte-for-byte the same because the new triggers are strict refinements.
--
--   3B  SAF-01 (safe-storage photographs): trigger `always` → `unless_armed`.
--       38 RCNY §5-05 does not require safe photographs of an armed-guard
--       applicant; they belong to Premises Business. The written safe-storage
--       attestation and the designated-safeguard acknowledgement are SEPARATE
--       generated forms (driven by intake), untouched here — only the photo
--       evidence requirement drops, and only on the armed-guard track. Concealed
--       carry and premises (both !isArmedGuard) still get SAF-01, unchanged.
--
--   3A  Regulatory citations added to the sponsor packet's `authority`:
--         §5-04 (Carry Guard / Gun Custodian licence-type rule — the evidentiary
--               standard) → SPN-02 (letter of necessity), SPN-04 (agency licence),
--               SPN-06 (position confirmation).
--         §5-06 (Gun Custodian / Carry Guard rule — the custodian dependency that
--               gates the case) → SPN-05 (gun custodian record).
--       PLE-01 already carries §5-09; general items already carry §5-05.
--
-- needs_legal_review stays true on every re-versioned row — counsel confirms the
-- Carry Guard set before any client-facing filing use.
-- ============================================================================

-- ── 3B · SAF-01 → unless_armed (drop safe photos on the armed-guard track) ────
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
       r.validation_rule, 'unless_armed', r.severity, r.document_type, date '2026-08-24',
       null, r.blocking, r.needs_legal_review, r.concierge_scope, r.party, r.applicant_scope);
  end loop;

  update public.requirements set effective_to = date '2026-08-23'
   where req_code = 'SAF-01'
     and effective_to is null
     and effective_from < date '2026-08-24';
end $$;

-- ── 3A · Add §5-04 / §5-06 citations to the sponsor packet ────────────────────
-- Copy each live SPN row verbatim, overriding only `authority`, then close the
-- prior version. Preserves jurisdiction, trigger ('sponsor_packet'), scopes, etc.
do $$
declare r record; new_authority text;
begin
  for r in
    select * from public.requirements
     where req_code in ('SPN-02','SPN-04','SPN-05','SPN-06') and effective_to is null
  loop
    new_authority := case r.req_code
      when 'SPN-02' then '38 RCNY §5-04; NYPD Carry Guard procedure'
      when 'SPN-04' then 'NYS GBL Art. 7-A; 38 RCNY §5-04; NYPD Carry Guard procedure'
      when 'SPN-05' then '38 RCNY §5-06; NYPD Carry Guard procedure'
      when 'SPN-06' then '38 RCNY §5-04; NYPD Carry Guard procedure'
    end;
    insert into public.requirements
      (jurisdiction_id, req_code, title, description, authority, source_url,
       validation_rule, trigger_cond, severity, document_type, effective_from,
       effective_to, blocking, needs_legal_review, concierge_scope, party, applicant_scope)
    values
      (r.jurisdiction_id, r.req_code, r.title, r.description, new_authority, r.source_url,
       r.validation_rule, r.trigger_cond, r.severity, r.document_type, date '2026-08-24',
       null, r.blocking, r.needs_legal_review, r.concierge_scope, r.party, r.applicant_scope);
  end loop;

  update public.requirements set effective_to = date '2026-08-23'
   where req_code in ('SPN-02','SPN-04','SPN-05','SPN-06')
     and effective_to is null
     and effective_from < date '2026-08-24';
end $$;
