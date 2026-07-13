-- V4-A4b — idempotent requirements backfill, promoted from a manual script
-- (scripts/backfill-requirements.ts) to a guaranteed migration so legacy cases
-- never render an empty checklist on either surface.
--
-- Any case with ZERO case_requirements gets the baseline set materialized from
-- the active registry — the exact {isCarry:true} baseline the app applies at
-- case creation (always + carry rows pending, everything conditional N/A).
-- Cases re-materialize with real answers after intake. No-op on a fresh reset
-- (migrations run before seed, so no cases exist yet); backfills prod only.
insert into public.case_requirements (case_id, requirement_id, req_code, status)
select
  c.id,
  r.id,
  r.req_code,
  case
    when r.trigger_cond in ('always', 'carry_only', 'carry_not_renewal')
      then 'pending'::case_req_status
    else 'na'::case_req_status
  end
from public.cases c
join public.clients cl on cl.id = c.client_id
join public.jurisdiction_profiles jp
  on jp.key = (case when cl.track = 'non_resident' then 'special_carry' else 'nyc' end)::jurisdiction_key
join public.requirements r
  on r.jurisdiction_id = jp.id
  and r.effective_from <= current_date
  and (r.effective_to is null or r.effective_to >= current_date)
where not exists (
  select 1 from public.case_requirements xr where xr.case_id = c.id
)
on conflict (case_id, requirement_id) do nothing;
