-- A 2-hour live-fire renewal certificate is a carry-renewal requirement, not a
-- Premise Residence requirement. Version the registry row (never edit history)
-- so Premise Residence renewals do not inherit carry training.
--
-- Provenance and needs_legal_review are copied from the prior active row. The
-- legal-review queue remains the publication gate for reliance at filing.

do $$
declare r record;
begin
  for r in
    select *
      from public.requirements
     where req_code = 'RNW-01'
       and effective_to is null
  loop
    insert into public.requirements
      (jurisdiction_id, req_code, title, description, authority, source_url,
       validation_rule, trigger_cond, severity, document_type, effective_from,
       effective_to, blocking, needs_legal_review, concierge_scope, party,
       applicant_scope, legal_status, legal_status_note, legal_citation, destination)
    values
      (r.jurisdiction_id, r.req_code, r.title, r.description, r.authority, r.source_url,
       r.validation_rule, 'carry_renewal_only', r.severity, r.document_type, date '2026-11-09',
       null, r.blocking, true, r.concierge_scope, r.party,
       r.applicant_scope, r.legal_status, r.legal_status_note, r.legal_citation, r.destination);
  end loop;

  update public.requirements
     set effective_to = date '2026-11-08'
   where req_code = 'RNW-01'
     and effective_to is null
     and effective_from < date '2026-11-09';
end $$;

-- Mutable historical instances may safely point at the new version. Preserve
-- satisfied/rejected rows and their evidence exactly as recorded.
update public.case_requirements cr
   set requirement_id = newer.id,
       status = case
         when c.application_type in (
           'premise_residence'::public.application_type,
           'premise_business'::public.application_type
         ) then 'na'::public.case_req_status
         else cr.status
       end
  from public.requirements older,
       public.requirements newer,
       public.cases c
 where cr.requirement_id = older.id
   and cr.case_id = c.id
   and older.req_code = 'RNW-01'
   and newer.req_code = 'RNW-01'
   and newer.jurisdiction_id = older.jurisdiction_id
   and newer.effective_from = date '2026-11-09'
   and newer.effective_to is null
   and cr.status in ('pending'::public.case_req_status, 'na'::public.case_req_status);
