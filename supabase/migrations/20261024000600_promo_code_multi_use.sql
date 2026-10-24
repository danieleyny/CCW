-- A client who already claimed a voucher may retry their checkout, while the
-- same code may be assigned to a bounded number of different client cases.
alter table public.promo_code_claims drop constraint promo_code_claims_pkey;
alter table public.promo_code_claims add primary key (code_fingerprint, case_id);

-- Serialise claims for the same fingerprint. This prevents two concurrent
-- checkout requests from both passing the max-use check.
create or replace function public.claim_promo_code(
  p_code_fingerprint text,
  p_code_label text,
  p_case_id uuid,
  p_client_id uuid,
  p_max_uses integer
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  claim_count integer;
begin
  if p_max_uses < 1 or p_max_uses > 10 then
    raise exception 'Invalid promotion use limit';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_code_fingerprint));

  if exists (
    select 1 from public.promo_code_claims
    where code_fingerprint = p_code_fingerprint and case_id = p_case_id
  ) then
    return 'existing';
  end if;

  select count(*) into claim_count
  from public.promo_code_claims
  where code_fingerprint = p_code_fingerprint;

  if claim_count >= p_max_uses then
    return 'exhausted';
  end if;

  insert into public.promo_code_claims (code_fingerprint, code_label, case_id, client_id)
  values (p_code_fingerprint, p_code_label, p_case_id, p_client_id);

  return 'claimed';
end;
$$;

revoke all on function public.claim_promo_code(text, text, uuid, uuid, integer) from public;
grant execute on function public.claim_promo_code(text, text, uuid, uuid, integer) to service_role;
