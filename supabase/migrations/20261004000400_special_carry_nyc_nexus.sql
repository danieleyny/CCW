-- A Nassau/Suffolk/other NY-county Special Carry applicant necessarily lives
-- outside NYC and relies on an active county carry licence. ELG-02 is the NYC
-- residence/principal-place-of-business control for ordinary NYC applications;
-- it must remain provable in the registry but be N/A on Special Carry cases.

with retired as (
  update public.requirements r
     set effective_to = date '2026-10-03'
   where r.effective_to is null
     and r.req_code = 'ELG-02'
     and r.jurisdiction_id = (
       select id from public.jurisdiction_profiles where key = 'special_carry'
     )
  returning r.*
)
insert into public.requirements (
  jurisdiction_id, req_code, title, description, authority, source_url,
  validation_rule, trigger_cond, severity, document_type, effective_from,
  blocking, needs_legal_review, concierge_scope, legal_status,
  legal_status_note, legal_citation, party, applicant_scope, destination
)
select
  jurisdiction_id, req_code, title, description, authority, source_url,
  validation_rule, 'unless_special_carry', severity, document_type,
  date '2026-10-04', blocking, needs_legal_review, concierge_scope,
  legal_status, legal_status_note, legal_citation, party, applicant_scope,
  destination
from retired;

-- Move only unresolved rows to the new dated rule and mark them N/A. Reviewed
-- historical decisions keep pointing at the version the reviewer saw.
update public.case_requirements cr
   set requirement_id = current_rule.id,
       status = 'na'::public.case_req_status
  from public.requirements retired_rule
  join public.requirements current_rule
    on current_rule.jurisdiction_id = retired_rule.jurisdiction_id
   and current_rule.req_code = retired_rule.req_code
   and current_rule.effective_from = date '2026-10-04'
 where cr.requirement_id = retired_rule.id
   and retired_rule.req_code = 'ELG-02'
   and retired_rule.effective_to = date '2026-10-03'
   and cr.status in ('pending', 'na');
