-- Production follow-up from the authenticated Regular Carry + Nassau Special
-- Carry walkthrough (2026-10-04).
--
-- Version, rather than overwrite, three registry rules:
--   * RES-01 must describe the applicant's present address, not an NYC address.
--   * OOS-01 belongs only to residents outside NEW YORK STATE under §5-03(b);
--     Nassau Special Carry applicants are outside NYC but still New York residents.
--   * PHO-01's applicant copy must match the upload workflow: PDFs are accepted
--     here and held behind the conversion gate until staff supplies a portal image.

with retired as (
  update public.requirements
     set effective_to = date '2026-10-03'
   where effective_to is null
     and req_code in ('RES-01', 'OOS-01', 'PHO-01')
  returning *
)
insert into public.requirements (
  jurisdiction_id, req_code, title, description, authority, source_url,
  validation_rule, trigger_cond, severity, document_type, effective_from,
  blocking, needs_legal_review, concierge_scope, legal_status,
  legal_status_note, legal_citation, party, applicant_scope, destination
)
select
  jurisdiction_id,
  req_code,
  case req_code
    when 'RES-01' then 'Proof of your current home address'
    when 'OOS-01' then 'Out-of-state resident background form — each jurisdiction of residence (5 years)'
    else title
  end,
  case req_code
    when 'RES-01' then
      'Proof of the applicant''s present home address. Use a current accepted utility bill, real-estate tax bill, co-op/condo ownership document, residential lease, or maintenance bill. Cell-phone bills are not on the NYPD accepted list.'
    when 'OOS-01' then
      'For an applicant who resides outside New York State and is not principally employed in New York City, the NYPD background-investigation form must be completed by local law enforcement in each jurisdiction where the applicant resided during the preceding five years. This does not apply merely because a New York resident lives outside NYC.'
    when 'PHO-01' then
      'A recent color passport-type photograph, front view, taken within the last 30 days — the same requirements as a U.S. Passport Book. No hats, headgear, or glasses (except for religious purposes); head not tilted; well lit; no selfies. The applicant may upload a photo file or PDF here. Supported images are formatted automatically; PDFs are held for staff conversion before the NYPD upload set can be finalized.'
    else description
  end,
  authority,
  source_url,
  validation_rule,
  case when req_code = 'OOS-01' then 'if_out_of_state_resident' else trigger_cond end,
  severity,
  document_type,
  date '2026-10-04',
  blocking,
  needs_legal_review,
  concierge_scope,
  legal_status,
  legal_status_note,
  legal_citation,
  party,
  applicant_scope,
  destination
from retired;

-- Pending/N-A cases can safely move to the new OOS-01 version. Preserve any
-- reviewed historical decision, but remove the false blocker from NY residents.
update public.case_requirements cr
   set requirement_id = current_rule.id,
       status = case
         when upper(replace(trim(coalesce(session.answers ->> 'legalState', 'NY')), '.', ''))
                in ('NY', 'NEW YORK') then 'na'::public.case_req_status
         else 'pending'::public.case_req_status
       end
  from public.requirements retired_rule
  join public.requirements current_rule
    on current_rule.jurisdiction_id = retired_rule.jurisdiction_id
   and current_rule.req_code = retired_rule.req_code
   and current_rule.effective_from = date '2026-10-04'
  join public.cases kase on true
  left join public.intake_sessions session on session.case_id = kase.id
 where cr.requirement_id = retired_rule.id
   and retired_rule.req_code = 'OOS-01'
   and retired_rule.effective_to = date '2026-10-03'
   and kase.id = cr.case_id
   and cr.status in ('pending', 'na');
