-- Per-client delivery preference for paid application support.
--
-- This controls follow-up intensity, never legal advice or eligibility logic.
-- Critical document fixes, booked appointments, and statutory timing notices are
-- intentionally outside the optional routine cadence.

do $$ begin
  create type public.follow_up_cadence as enum ('standard', 'proactive', 'essential_only');
exception when duplicate_object then null; end $$;

create table public.client_notification_preferences (
  client_id uuid primary key references public.clients(id) on delete cascade,
  cadence public.follow_up_cadence not null default 'standard',
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_client_notification_preferences_updated_at
  before update on public.client_notification_preferences
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.client_notification_preferences to authenticated;

alter table public.client_notification_preferences enable row level security;

-- Clients see only their own communication setting. Staff may audit all settings.
create policy client_notification_preferences_select on public.client_notification_preferences for select
  using (
    public.is_staff_or_admin()
    or exists (
      select 1 from public.clients c
      where c.id = client_id and c.profile_id = auth.uid()
    )
  );

-- Changes go through authenticated server actions so a paid-status check and
-- activity record cannot be bypassed by a direct browser write.
