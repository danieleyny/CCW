-- V3-P0.2 — Restore staff visibility over the pipeline.
--
-- Migration 20260608204200 fixed the INSERT ... RETURNING self-referential RLS
-- bug by rewriting clients_select against the row's own columns — but in doing
-- so it dropped is_staff_or_admin(), leaving staff able to see ONLY clients
-- explicitly assigned to them. A staff user with no assignments saw an empty
-- pipeline, while the packet route (service-role after requireStaff()) ignored
-- the restriction entirely — inconsistent.
--
-- Intended semantics, now made uniform: STAFF SEE ALL CASES. Assignment is
-- ownership (whose queue it's in), not visibility. is_staff_or_admin() queries
-- profiles — a DIFFERENT table — so it is safe inside a clients
-- INSERT ... RETURNING (the original bug only bit helpers that re-queried the
-- same table the policy guards).

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients for select
  using (
    public.is_staff_or_admin()
    or profile_id = auth.uid()
  );

-- client_visible / case_visible drive cases_select and most per-case child
-- tables (documents, messages, checklist_items, ...). Align them.
create or replace function public.client_visible(p_client_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.clients cl
    where cl.id = p_client_id and (
      public.is_staff_or_admin()
      or cl.profile_id = auth.uid()
    )
  )
$$;

create or replace function public.case_visible(p_case_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.cases ca
    join public.clients cl on cl.id = ca.client_id
    where ca.id = p_case_id and (
      public.is_staff_or_admin()
      or cl.profile_id = auth.uid()
    )
  )
$$;
