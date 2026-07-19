-- ============================================================================
-- CONCIERGE SCOPE — what a trainer may see of each requirement
--
-- The trainer becomes the applicant's first-line reviewer for ordinary
-- paperwork. Some of the file is not ordinary paperwork:
--
--   hidden   — the trainer never learns this item EXISTS. Disclosure material:
--              arrests, orders of protection, domestic incidents, the Q10–28
--              addendum, and a Certificate of Good Conduct (which presupposes a
--              conviction). Merely seeing "ARR-01" on a checklist tells you the
--              applicant has an arrest history — that is the fact the
--              `disclosures` RLS exists to protect, so the row must be absent,
--              not redacted.
--   progress — counts only. Cohabitant affidavits and reference letters are
--              written and notarized by OTHER PEOPLE who never signed up for
--              this. The trainer needs "2 of 4 notarized" to chase them; they do
--              not need the letters, the names, or the addresses.
--   full     — the trainer reviews it like any other document.
--
-- DEFAULT IS 'hidden'. A requirement nobody classified is invisible rather than
-- exposed. Fail safe, by construction rather than by remembering.
--
-- This column lives in SQL because policies, views and RPCs must consult it.
-- The TypeScript map in lib/requirements/actions.ts carries the same values for
-- copy purposes only, and a test asserts the two agree.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'concierge_scope') then
    create type public.concierge_scope as enum ('hidden', 'progress', 'full');
  end if;
end $$;

alter table public.requirements
  add column if not exists concierge_scope public.concierge_scope not null default 'hidden';

comment on column public.requirements.concierge_scope is
  'What an engaged trainer may see. hidden = the row never appears (disclosure material); progress = counts only (third-party documents); full = reviewable. Default hidden — anything unclassified stays invisible.';

-- Backfill by req_code across EVERY dated row. The registry is versioned, so a
-- case_requirement created against last month''s row must resolve the same way
-- as one created today — filtering on `effective_to is null` would leave older
-- rows at the default and silently hide live requirements.
update public.requirements set concierge_scope = 'full'
 where req_code in (
   'IDN-01','IDN-02','IDN-03','IDN-04','RES-01','DMV-01','SAF-01','AFF-01',
   'SOC-01','TRN-01','RNW-01','MIL-01','NAM-01','LEO-01','LEO-02','LEO-03',
   'OOS-01','OOS-02','PRM-01','FEE-01','FMT-01','ELG-01','ELG-02','ELG-03','SPC-01'
 );

update public.requirements set concierge_scope = 'progress'
 where req_code in ('COH-01','REF-01','REF-02');

-- Named explicitly rather than left to the default, so the intent is legible and
-- a future `update ... set concierge_scope = 'full'` has to argue with a comment.
update public.requirements set concierge_scope = 'hidden'
 where req_code in ('DSC-01','QUE-01','ARR-01','OOP-01','DIR-01','GMC-01');

-- ── Trust tier ──────────────────────────────────────────────────────────────
-- Third-party marketplace instructors ('partner') and our own staff trainers
-- ('staff'). BOTH tiers resolve identically today: disclosures are scoped out
-- of every trainer. The tier is threaded through the resolver below so that
-- widening it later is one function body, not a re-plumb of every view.
alter table public.instructors
  add column if not exists trust_tier text not null default 'partner';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'instructors_trust_tier_check') then
    alter table public.instructors
      add constraint instructors_trust_tier_check check (trust_tier in ('partner', 'staff'));
  end if;
end $$;

comment on column public.instructors.trust_tier is
  'partner = third-party marketplace instructor (default); staff = our own. Read by trainer_scope(). Disclosures are hidden from BOTH tiers.';

-- An instructor must not promote themselves into the higher tier — same reason
-- they must not set their own `verified`. Extends the guard from 20260718001400.
create or replace function public.forbid_instructor_self_elevation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff_or_admin() or auth.uid() is null then
    return new;
  end if;

  if new.verified is distinct from old.verified then
    raise exception 'Only Gun License NYC can verify a DCJS credential.';
  end if;
  if new.trust_tier is distinct from old.trust_tier then
    raise exception 'Trust tier is set by Gun License NYC.';
  end if;
  if new.rating_avg is distinct from old.rating_avg
     or new.rating_count is distinct from old.rating_count then
    raise exception 'Ratings are computed from real bookings, not set by hand.';
  end if;

  return new;
end $$;

-- ── The one resolver every view and RPC calls ───────────────────────────────
create or replace function public.trainer_scope(p_requirement_id uuid, p_tier text)
returns public.concierge_scope
language sql stable security definer set search_path = public as $$
  -- p_tier is deliberately unused TODAY: 'partner' and 'staff' resolve
  -- identically because disclosures are out of scope for every trainer. It is
  -- in the signature so that granting staff-tier a wider view later is a change
  -- to this function alone.
  select coalesce(
    (select r.concierge_scope from public.requirements r where r.id = p_requirement_id),
    'hidden'::public.concierge_scope   -- unknown requirement => hidden
  )
$$;

revoke all on function public.trainer_scope(uuid, text) from public, anon;
grant execute on function public.trainer_scope(uuid, text) to authenticated;
