-- ============================================================================
-- COMPLIANCE PR4 · Part H2 — the sponsor's self-assessment facts
--
-- Whether the sponsoring company holds an NYPD Carry Business licence is a fact
-- only the sponsor can answer, and it changes what the applicant's packet needs.
-- Captured as a tri-state (yes / no / not sure) — an "I'm not sure" that reaches a
-- human is worth more than a confident wrong "yes", so it is accepted and routed to
-- staff (surfaced, flagged, on the admin case view). When "yes", the licence number
-- and expiry are captured too.
-- ============================================================================
alter table public.sponsors
  add column if not exists carry_business_status  text,   -- 'yes' | 'no' | 'unsure'
  add column if not exists carry_business_number  text,
  add column if not exists carry_business_expires text;
