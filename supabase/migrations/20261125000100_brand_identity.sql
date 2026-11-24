-- Firearm License NYC brand identity. Additive only: all existing data remains
-- Gun License NYC and no application, payment, message or document is deleted.

do $$ begin
  create type public.brand_key as enum ('gln', 'fl');
exception when duplicate_object then null;
end $$;

alter table public.cases
  add column if not exists brand public.brand_key not null default 'gln',
  add column if not exists brand_origin public.brand_key not null default 'gln';

alter table public.clients
  add column if not exists signup_brand public.brand_key not null default 'gln';

alter table public.payments
  add column if not exists brand public.brand_key;
update public.payments set brand = 'gln' where brand is null;

alter table public.messages
  add column if not exists brand public.brand_key not null default 'gln';

alter table public.notifications
  add column if not exists brand public.brand_key not null default 'gln';

alter table public.marketing_contacts
  add column if not exists brand public.brand_key not null default 'gln';

alter table public.service_packages
  add column if not exists sold_by public.brand_key[] not null default '{gln}';

create index if not exists cases_brand_idx on public.cases (brand);
create index if not exists payments_brand_idx on public.payments (brand);
create index if not exists clients_signup_brand_idx on public.clients (signup_brand);

create table if not exists public.brand_transfers (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete restrict,
  from_brand public.brand_key not null,
  to_brand public.brand_key not null,
  reason text not null check (reason in ('upgrade_to_concierge', 'staff_correction')),
  consent_text text,
  consented_at timestamptz,
  payment_id uuid references public.payments(id) on delete set null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint brand_transfers_different_brands check (from_brand <> to_brand)
);
create index if not exists brand_transfers_case_idx
  on public.brand_transfers(case_id, created_at desc);

grant select on public.brand_transfers to authenticated;
alter table public.brand_transfers enable row level security;
drop policy if exists brand_transfers_staff_read on public.brand_transfers;
create policy brand_transfers_staff_read on public.brand_transfers
  for select using (public.is_staff_or_admin());

create or replace function public.guard_case_brand()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.brand_origin is distinct from old.brand_origin then
    raise exception 'cases.brand_origin is immutable';
  end if;
  if new.brand is distinct from old.brand
     and coalesce(current_setting('ccw.brand_transfer', true), '') <> 'on' then
    raise exception 'cases.brand may only change via transfer_case_brand()';
  end if;
  return new;
end;
$$;

drop trigger if exists cases_brand_guard on public.cases;
create trigger cases_brand_guard
  before update of brand, brand_origin on public.cases
  for each row execute function public.guard_case_brand();

create or replace function public.set_case_brand_origin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.brand_origin := new.brand;
  return new;
end;
$$;

drop trigger if exists cases_brand_origin_ins on public.cases;
create trigger cases_brand_origin_ins
  before insert on public.cases
  for each row execute function public.set_case_brand_origin();

create or replace function public.inherit_case_brand()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.case_id is not null then
    select c.brand into new.brand from public.cases c where c.id = new.case_id;
  end if;
  new.brand := coalesce(new.brand, 'gln');
  return new;
end;
$$;

create or replace function public.inherit_payment_brand()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.brand is null then
    if new.case_id is not null then
      select c.brand into new.brand from public.cases c where c.id = new.case_id;
    elsif new.client_id is not null then
      select c.signup_brand into new.brand from public.clients c where c.id = new.client_id;
    end if;
    new.brand := coalesce(new.brand, 'gln');
  end if;
  return new;
end;
$$;

drop trigger if exists payments_brand_ins on public.payments;
create trigger payments_brand_ins
  before insert on public.payments
  for each row execute function public.inherit_payment_brand();

alter table public.payments alter column brand set not null;
-- A NULL default keeps generated Insert types optional while the BEFORE INSERT
-- trigger supplies the case snapshot before the NOT NULL constraint is checked.
-- Explicit GLN upgrade payments on an FL case are therefore still preserved.
alter table public.payments alter column brand set default null;

drop trigger if exists messages_brand_ins on public.messages;
create trigger messages_brand_ins
  before insert on public.messages
  for each row execute function public.inherit_case_brand();

drop trigger if exists notifications_brand_ins on public.notifications;
create trigger notifications_brand_ins
  before insert on public.notifications
  for each row execute function public.inherit_case_brand();

create or replace function public.transfer_case_brand(
  p_case_id uuid,
  p_to public.brand_key,
  p_reason text,
  p_consent_text text,
  p_consented_at timestamptz,
  p_payment_id uuid,
  p_actor uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from public.brand_key;
  v_id uuid;
begin
  if p_reason not in ('upgrade_to_concierge', 'staff_correction') then
    raise exception 'invalid brand transfer reason';
  end if;

  select brand into v_from from public.cases where id = p_case_id for update;
  if v_from is null then raise exception 'case not found'; end if;
  if v_from = p_to then return null; end if;

  perform set_config('ccw.brand_transfer', 'on', true);
  update public.cases set brand = p_to, updated_at = now() where id = p_case_id;

  insert into public.brand_transfers(
    case_id, from_brand, to_brand, reason, consent_text, consented_at,
    payment_id, actor_profile_id
  ) values (
    p_case_id, v_from, p_to, p_reason, p_consent_text, p_consented_at,
    p_payment_id, p_actor
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.transfer_case_brand(
  uuid, public.brand_key, text, text, timestamptz, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.transfer_case_brand(
  uuid, public.brand_key, text, text, timestamptz, uuid, uuid
) to service_role;
