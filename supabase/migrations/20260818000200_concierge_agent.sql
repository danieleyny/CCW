-- ─────────────────────────────────────────────────────────────────────────────
-- CONCIERGE Tranche 3 · Phase 8 — the concierge-agent marker
--
-- `profiles.is_concierge_agent` labels which staff run done-for-you cases. It is
-- NOT a new permission tier — every staff member already has full case access via
-- is_staff_or_admin() + RLS — it drives the concierge operations hub (roster,
-- work-queue) and on-behalf attribution.
--
-- Guard: like `role`, only an admin may change it. The existing
-- guard_profile_role() trigger already freezes `role` for non-admins; we redefine
-- it to freeze this column too, so a staff member can't self-promote to agent.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists is_concierge_agent boolean not null default false;

-- Redefine the profile guard to also protect is_concierge_agent. (Same shape as
-- 20260608194251_rls_policies.sql — security definer, pinned search_path.)
create or replace function public.guard_profile_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an admin may change a profile role';
  end if;
  if new.is_concierge_agent is distinct from old.is_concierge_agent and not public.is_admin() then
    raise exception 'Only an admin may change concierge-agent status';
  end if;
  return new;
end;
$$;
