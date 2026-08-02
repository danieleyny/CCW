-- ============================================================================
-- SECURITY (CRITICAL) — remote privilege escalation via signup role metadata.
--
-- handle_new_user copied the new profile's role straight from
-- `raw_user_meta_data->>'role'` (user_metadata). user_metadata is populated
-- VERBATIM from the client-supplied `options.data` on the PUBLIC auth.signUp
-- endpoint — so anyone holding the public anon key (shipped in the browser
-- bundle) could:
--     POST /auth/v1/signup  {"email":..,"password":..,"data":{"role":"admin"}}
-- and self-provision an ADMIN. The trigger is SECURITY DEFINER, so it bypasses
-- the profiles_insert = is_admin() policy; with email-confirm off the attacker
-- gets a live admin session immediately → full read/write of every applicant's
-- arrests, disclosures, and PII. Full remote takeover, zero prior access.
--
-- FIX: this trigger ALWAYS creates a 'client'. Signup can never produce a
-- privileged role, full stop — no metadata is trusted for role. Non-client
-- accounts (instructor/staff) are minted only by the service-role provisioning
-- flows, which set the role with an explicit profiles UPDATE after createUser
-- (the service role is permitted to change roles; guard_profile_role only
-- blocks non-privileged callers). full_name / phone still come from
-- user_metadata — those are the user's own to set; only ROLE is sensitive.
-- (Note: GoTrue writes app_metadata AFTER this AFTER-INSERT trigger fires, so
-- reading role from app_metadata here would not work — hence the explicit
-- follow-up UPDATE in the app flows.)
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    'client'  -- NEVER derived from client-supplied metadata.
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
