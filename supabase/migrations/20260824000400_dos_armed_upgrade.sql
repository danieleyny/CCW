-- ============================================================================
-- CARRY GUARD — PASS 3 · the DOS armed-status upgrade (3C)
--
-- The NYPD handgun licence and the NYS DOS armed-status change are TWO filings,
-- two authorities, two timelines. This models the DOS side as a parallel
-- POST-ISSUANCE sub-lifecycle — deliberately NOT a case_stage and NOT a CP-5
-- blocker (evaluatePreFilingGate never consults it). It opens only after the
-- NYPD licence is issued for an armed-guard case.
--
-- Items (DOS-1619-f · 47-hour firearms course · guard-card RETURN · $25 fee) each
-- carry their own status. The guard-card return is a real applicant action with a
-- real consequence — surrendering the working credential — so it is its own step.
--
-- Recurrence: armed status carries an 8-hour annual in-service AND an 8-hour
-- annual firearms course, every year status is held; registrations run two years.
-- The due dates live here and drive the recurring reminders (lib/reminders).
--
-- Copy guardrail (enforced in the UI): the NYPD licence never makes the applicant
-- armed-qualified — both approvals must be active AND the employer must clear the
-- assignment.
-- ============================================================================

create table if not exists public.dos_armed_upgrade (
  case_id                uuid primary key references public.cases (id) on delete cascade,
  -- Each item's own state: outstanding → filed (submitted to DOS) → approved.
  dos_1619f_status       text not null default 'outstanding'
                           check (dos_1619f_status in ('outstanding','filed','approved')),
  firearms_47hr_status   text not null default 'outstanding'
                           check (firearms_47hr_status in ('outstanding','filed','approved')),
  guard_card_returned    boolean not null default false,   -- surrenders the working credential
  dos_fee_paid           boolean not null default false,   -- the $25 DOS fee
  -- Recurring obligations + the 2-year registration cycle (set when status granted).
  inservice_due_on       date,
  firearms_annual_due_on date,
  registration_expires_on date,
  opened_at              timestamptz not null default now(),
  updated_by             uuid references public.profiles (id),
  updated_at             timestamptz not null default now()
);

-- ── RLS: the owning applicant + staff (case_visible). The sponsor never manages
-- the DOS filing — it is the applicant's own post-issuance obligation. ─────────
grant select, insert, update on public.dos_armed_upgrade to authenticated;
alter table public.dos_armed_upgrade enable row level security;

create policy dos_armed_upgrade_select on public.dos_armed_upgrade for select
  using (public.case_visible(case_id));
create policy dos_armed_upgrade_write on public.dos_armed_upgrade for all
  using (public.case_visible(case_id))
  with check (public.case_visible(case_id));
