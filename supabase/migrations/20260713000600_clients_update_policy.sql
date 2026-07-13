-- V3-P2.3 — staff can reassign cases. The old clients_update policy
-- (is_admin() OR assigned_staff = auth.uid()) had the same ownership-vs-
-- visibility confusion fixed for SELECT in 20260713000100 — worse here, its
-- WITH CHECK made it impossible for a staff member to hand a case to anyone
-- else (the new row no longer satisfies assigned_staff = auth.uid()).
-- Uniform semantics: any staff/admin may update client records; assignment is
-- ownership, not a write fence. Found by the Phase-2 verify harness.

drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients for update
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());
