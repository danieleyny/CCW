-- CarryPath — Row-Level Security: helper functions + per-table policies.
-- Model: client sees only their own rows; staff see assigned cases; admin sees all.
-- The service_role key (seed, Stripe webhook, admin server client) bypasses RLS.

-- ─────────────────────────────────────────────────────────────────────────────
-- Privileges (RLS still gates rows; these just allow the API roles to try).
-- ─────────────────────────────────────────────────────────────────────────────
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper functions (security definer → bypass RLS internally, no recursion)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.current_user_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.current_user_role() = 'admin'
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.current_user_role() in ('staff', 'admin')
$$;

create or replace function public.client_visible(p_client_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.clients cl
    where cl.id = p_client_id and (
      public.is_admin()
      or cl.assigned_staff = auth.uid()
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
      public.is_admin()
      or cl.assigned_staff = auth.uid()
      or cl.profile_id = auth.uid()
    )
  )
$$;

-- Prevent non-admins from escalating their own role via a profile update.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an admin may change a profile role';
  end if;
  return new;
end;
$$;

create trigger trg_profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable RLS
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles             enable row level security;
alter table public.instructors          enable row level security;
alter table public.clients              enable row level security;
alter table public.cases                enable row level security;
alter table public.case_stages          enable row level security;
alter table public.checklist_items      enable row level security;
alter table public.documents            enable row level security;
alter table public.character_references enable row level security;
alter table public.cohabitants          enable row level security;
alter table public.training_sessions    enable row level security;
alter table public.payments             enable row level security;
alter table public.appointments         enable row level security;
alter table public.messages             enable row level security;
alter table public.tasks                enable row level security;
alter table public.activity_log         enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_staff_or_admin());
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy profiles_insert on public.profiles for insert
  with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- instructors (staff/admin managed; readable by staff/admin)
-- ─────────────────────────────────────────────────────────────────────────────
create policy instructors_select on public.instructors for select
  using (public.is_staff_or_admin());
create policy instructors_write on public.instructors for all
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- clients
-- ─────────────────────────────────────────────────────────────────────────────
create policy clients_select on public.clients for select
  using (public.client_visible(id));
create policy clients_insert on public.clients for insert
  with check (public.is_staff_or_admin());
create policy clients_update on public.clients for update
  using (public.is_admin() or assigned_staff = auth.uid())
  with check (public.is_admin() or assigned_staff = auth.uid());
create policy clients_delete on public.clients for delete
  using (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- cases
-- ─────────────────────────────────────────────────────────────────────────────
create policy cases_select on public.cases for select
  using (public.case_visible(id));
create policy cases_insert on public.cases for insert
  with check (public.is_staff_or_admin());
create policy cases_update on public.cases for update
  using (public.is_staff_or_admin() and public.case_visible(id))
  with check (public.is_staff_or_admin() and public.case_visible(id));
create policy cases_delete on public.cases for delete
  using (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- case_stages
-- ─────────────────────────────────────────────────────────────────────────────
create policy case_stages_select on public.case_stages for select
  using (public.case_visible(case_id));
create policy case_stages_write on public.case_stages for all
  using (public.is_staff_or_admin() and public.case_visible(case_id))
  with check (public.is_staff_or_admin() and public.case_visible(case_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- checklist_items  (clients may advance their own client-owned items)
-- ─────────────────────────────────────────────────────────────────────────────
create policy checklist_select on public.checklist_items for select
  using (public.case_visible(case_id));
create policy checklist_insert on public.checklist_items for insert
  with check (public.is_staff_or_admin() and public.case_visible(case_id));
create policy checklist_update on public.checklist_items for update
  using (public.case_visible(case_id) and (public.is_staff_or_admin() or owner = 'client'))
  with check (public.case_visible(case_id) and (public.is_staff_or_admin() or owner = 'client'));
create policy checklist_delete on public.checklist_items for delete
  using (public.is_staff_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- documents  (client uploads = insert; staff review = update)
-- ─────────────────────────────────────────────────────────────────────────────
create policy documents_select on public.documents for select
  using (public.case_visible(case_id));
create policy documents_insert on public.documents for insert
  with check (public.case_visible(case_id));
create policy documents_update on public.documents for update
  using (public.case_visible(case_id))
  with check (public.case_visible(case_id));
create policy documents_delete on public.documents for delete
  using (public.is_staff_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- character_references / cohabitants  (client collectors + staff)
-- ─────────────────────────────────────────────────────────────────────────────
create policy refs_select on public.character_references for select
  using (public.case_visible(case_id));
create policy refs_write on public.character_references for all
  using (public.case_visible(case_id))
  with check (public.case_visible(case_id));

create policy cohab_select on public.cohabitants for select
  using (public.case_visible(case_id));
create policy cohab_write on public.cohabitants for all
  using (public.case_visible(case_id))
  with check (public.case_visible(case_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- training_sessions  (visible to all on case; staff-managed writes)
-- ─────────────────────────────────────────────────────────────────────────────
create policy training_select on public.training_sessions for select
  using (public.case_visible(case_id));
create policy training_write on public.training_sessions for all
  using (public.is_staff_or_admin() and public.case_visible(case_id))
  with check (public.is_staff_or_admin() and public.case_visible(case_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- payments  (client sees own receipts; staff/admin manage)
-- ─────────────────────────────────────────────────────────────────────────────
create policy payments_select on public.payments for select
  using (public.client_visible(client_id));
create policy payments_write on public.payments for all
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- appointments  (client sees own; staff/admin manage)
-- ─────────────────────────────────────────────────────────────────────────────
create policy appointments_select on public.appointments for select
  using (public.case_visible(case_id) or public.client_visible(client_id));
create policy appointments_write on public.appointments for all
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- messages  (both sides post on a visible case)
-- ─────────────────────────────────────────────────────────────────────────────
create policy messages_select on public.messages for select
  using (public.case_visible(case_id));
create policy messages_insert on public.messages for insert
  with check (public.case_visible(case_id) and (sender_id = auth.uid() or sender_id is null));
create policy messages_update on public.messages for update
  using (public.case_visible(case_id))
  with check (public.case_visible(case_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- tasks  (internal — staff/admin only)
-- ─────────────────────────────────────────────────────────────────────────────
create policy tasks_all on public.tasks for all
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- activity_log  (append-only; staff/admin read; no update/delete policy = denied)
-- ─────────────────────────────────────────────────────────────────────────────
create policy activity_select on public.activity_log for select
  using (public.is_staff_or_admin());
create policy activity_insert on public.activity_log for insert
  with check (case_id is null or public.case_visible(case_id));
