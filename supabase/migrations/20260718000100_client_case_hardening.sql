-- ============================================================================
-- Harden the client/case identity so intake can never strand on a duplicate.
--
-- getMyCase (lib/portal.ts) unions every client row for a profile and reads the
-- NEWEST case; provisioning (lib/onboarding.ts) reused an UNORDERED case. If a
-- profile ever held >1 client/case row, a completed intake could live on one
-- case while the portal displayed another blank one. No violations exist today
-- (verified), so enforce the invariant: one client row per auth profile.
-- (intake_sessions.case_id is already UNIQUE — that lets the intake writes upsert
-- and self-heal instead of silently no-oping against a missing row.)
-- ============================================================================

create unique index if not exists idx_clients_one_per_profile
  on public.clients (profile_id)
  where profile_id is not null;
