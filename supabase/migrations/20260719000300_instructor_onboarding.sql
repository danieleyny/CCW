-- ============================================================================
-- PART C / Phase 13 — trainer onboarding gate.
--
-- Before an instructor reaches applicants they must complete a short onboarding
-- that puts the non-negotiables in front of them: the privacy firewall (they
-- never see disclosures), candor + no-legal-advice, and that the applicant files
-- their own application. `verified` (admin-checked DCJS credential) proves who
-- they are; onboarding proves they know the rules of this platform. Both gate
-- go-live now.
--
-- Existing verified instructors are GRANDFATHERED: they were vetted before this
-- step existed, and flipping the gate on must not silently pull them out of the
-- marketplace. New instructors must complete it.
--
-- Self-settable, deliberately: an instructor completes their OWN onboarding
-- (unlike `verified`, which only staff set). The escalation guard in
-- 20260718001400 only blocks verified/trust_tier/rating_* — it leaves this
-- column alone, which is correct.
-- ============================================================================

alter table public.instructors
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.instructors.onboarding_completed_at is
  'When the instructor completed platform onboarding (privacy firewall, candor, applicant-files-own-app). Required for live eligibility. Self-set; grandfathered for pre-existing verified instructors.';

-- Grandfather everyone already verified — they predate the gate.
update public.instructors
set onboarding_completed_at = now()
where verified = true and onboarding_completed_at is null;
