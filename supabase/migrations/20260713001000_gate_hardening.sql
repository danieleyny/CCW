-- ============================================================================
-- V4-A1b / A4c — close the CP-5 gate's DB-level escape hatches.
--
-- A1b: a staffer could flip a BLOCKING requirement to `na` (one click) and it
-- would silently stop blocking the pre-filing gate. `blocking` lives on
-- `requirements` (not `case_requirements`), so a plain CHECK can't express the
-- invariant — a BEFORE trigger is the correct tool.
--
-- The subtlety: the system generator (materializeCaseRequirements, always run
-- via the service-role client) LEGITIMATELY marks a blocking row `na` when it
-- doesn't apply to the case's track/renewal (e.g. REF-01 on a renewal). That
-- runs with auth.uid() = null. A staff bypass runs with auth.uid() set. So we
-- forbid `na` on a blocking requirement ONLY for interactive (logged-in)
-- writes; the generator is untouched.
-- ============================================================================

create or replace function public.forbid_manual_na_on_blocking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blocking boolean;
begin
  if new.status = 'na' and auth.uid() is not null then
    select r.blocking into v_blocking from public.requirements r where r.id = new.requirement_id;
    if coalesce(v_blocking, false) then
      raise exception 'A blocking requirement (%) cannot be marked N/A — a legally required item is never optional.', new.req_code;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_case_requirements_no_na_blocking on public.case_requirements;
create trigger trg_case_requirements_no_na_blocking
  before insert or update on public.case_requirements
  for each row execute function public.forbid_manual_na_on_blocking();

-- A4c — the versioned legal registry is admin-only. requireAdmin() was added at
-- the app layer, but the RLS still allowed any staff session to rewrite rules
-- via PostgREST. Tighten to is_admin().
drop policy if exists requirements_write on public.requirements;
create policy requirements_write on public.requirements for all
  using (public.is_admin())
  with check (public.is_admin());
