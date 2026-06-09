-- Fix INSERT ... RETURNING under RLS.
--
-- The original clients_select / cases_select policies called helper functions
-- (client_visible / case_visible) that re-query the SAME table the policy
-- guards. During an `INSERT ... RETURNING` (what supabase-js .select() does),
-- Postgres evaluates the SELECT policy against the new row, but a sub-query
-- inside the policy cannot see the row being inserted by the enclosing command,
-- so the post-insert read returns no row → "violates row-level security policy".
--
-- Rows that already exist (lists, UPDATE ... RETURNING) were unaffected, which
-- is why this only surfaced when creating a client/case and reading it back.
--
-- Fix: make each table's own SELECT policy reference the row's columns directly
-- (clients) or check a DIFFERENT table (cases → clients), so no self-query.

-- clients: evaluate against the row's own columns.
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients for select
  using (
    public.is_admin()
    or assigned_staff = auth.uid()
    or profile_id = auth.uid()
  );

-- cases: client_visible() queries the clients table (not cases), so it is safe
-- inside a cases INSERT ... RETURNING.
drop policy if exists cases_select on public.cases;
create policy cases_select on public.cases for select
  using (public.client_visible(client_id));
