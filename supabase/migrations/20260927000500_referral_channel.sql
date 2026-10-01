-- Referral channel — a company (e.g. ISS Action) INTRODUCES personal-carry applicants.
-- This is NOT a sponsorship. In a personal application the introducer has no role, and
-- giving them a window into the applicant's file would expose arrests, mental-health,
-- drug and domestic-incident disclosures to a boss. Commit af9d55e was exactly that bug
-- via the sponsor scope; this deliberately does NOT reuse party_scope or any sponsor view.
--
-- What a referrer gets: attribution + AGGREGATE COUNTS by default, and per-person STAGE
-- LABEL only with that person's explicit, revocable consent — never a name, requirement,
-- document or disclosure. Everything flows through SECURITY DEFINER functions keyed on
-- the caller's own sponsor_id, so a referrer can only ever see their own aggregates.

-- 1. Attribution only. A referred case names the introducing company; this grants NO
--    read access to anything (no sponsorship row, no scope).
alter table public.cases
  add column if not exists referred_by_sponsor_id uuid references public.sponsors (id) on delete set null;
create index if not exists idx_cases_referred_by on public.cases (referred_by_sponsor_id);

-- 2. The applicant's explicit, revocable consent to let the referrer see their STAGE only.
create table if not exists public.referral_consent (
  case_id            uuid primary key references public.cases (id) on delete cascade,
  sponsor_id         uuid not null references public.sponsors (id) on delete cascade,
  consented_at       timestamptz,
  consent_version    text,
  revoked_at         timestamptz,
  created_at         timestamptz not null default now()
);
alter table public.referral_consent enable row level security;
-- The applicant (case owner) and staff can see the consent row; the referrer never reads
-- this table directly (they get a stage label via the definer RPC below). No write policy
-- ⇒ only the SECURITY DEFINER RPCs mutate it.
drop policy if exists referral_consent_select on public.referral_consent;
create policy referral_consent_select on public.referral_consent
  for select using (public.is_staff_or_admin() or public.case_visible(case_id));

-- 3. Applicant records / revokes consent (owner-or-staff guarded, like sponsor_record_consent).
create or replace function public.referral_record_consent(p_case_id uuid, p_version text)
returns void language plpgsql security definer set search_path = public as $$
declare v_sponsor uuid;
begin
  if not public.case_visible(p_case_id) then
    raise exception 'not authorized';
  end if;
  select referred_by_sponsor_id into v_sponsor from public.cases where id = p_case_id;
  if v_sponsor is null then
    raise exception 'case has no referrer';
  end if;
  insert into public.referral_consent (case_id, sponsor_id, consented_at, consent_version, revoked_at)
  values (p_case_id, v_sponsor, now(), p_version, null)
  on conflict (case_id) do update
    set consented_at = now(), consent_version = p_version, revoked_at = null, sponsor_id = excluded.sponsor_id;
end $$;

create or replace function public.referral_revoke(p_case_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.case_visible(p_case_id) then
    raise exception 'not authorized';
  end if;
  update public.referral_consent set revoked_at = now(), consented_at = null where case_id = p_case_id;
end $$;

-- 4. AGGREGATE counts for the caller's own channel. SECURITY DEFINER so it can count
--    without the caller reading any case row. Introduced = attributed; signed up = the
--    applicant claimed an account; completed = licensed. Counts only — never a rollup
--    that could out a single person.
create or replace function public.referral_channel_stats()
returns table (introduced bigint, signed_up bigint, completed bigint)
language sql security definer set search_path = public as $$
  select
    count(*)::bigint,
    count(*) filter (where cl.profile_id is not null)::bigint,
    count(*) filter (where c.stage = 'licensed')::bigint
  from public.cases c
  join public.clients cl on cl.id = c.client_id
  where c.referred_by_sponsor_id = (select p.sponsor_id from public.profiles p where p.id = auth.uid())
    and (select p.sponsor_id from public.profiles p where p.id = auth.uid()) is not null;
$$;

-- 5. Per-person STAGE LABEL, and ONLY for a person who has consented (and not revoked).
--    No name, no requirement, no document, no disclosure — just case_id + stage. The
--    referrer joins nothing to PII; an un-consented case is simply absent.
create or replace function public.referral_consented_stages()
returns table (case_id uuid, stage text)
language sql security definer set search_path = public as $$
  select c.id, c.stage::text
  from public.cases c
  join public.referral_consent rc on rc.case_id = c.id
  where c.referred_by_sponsor_id = (select p.sponsor_id from public.profiles p where p.id = auth.uid())
    and (select p.sponsor_id from public.profiles p where p.id = auth.uid()) is not null
    and rc.consented_at is not null
    and rc.revoked_at is null;
$$;

revoke all on function public.referral_channel_stats() from anon;
revoke all on function public.referral_consented_stages() from anon;
