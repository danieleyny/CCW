-- ============================================================================
-- CarryPath V2 · Phase 7 — Notifications & reminder engine
-- In-app notifications (a bell on every surface) + a reminder_log that makes the
-- daily cron idempotent: a unique (rule_key, target, window_key) means a given
-- nudge can fire at most once, so re-running the cron never double-sends.
-- Ref: CCW_V2_Data_Model.md §6
-- ============================================================================

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  recipient   uuid not null references public.profiles(id) on delete cascade,
  case_id     uuid references public.cases(id) on delete cascade,
  kind        notification_kind not null default 'info',
  title       text not null,
  body        text,
  link        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index idx_notifications_recipient on public.notifications (recipient, read, created_at desc);

create table public.reminder_log (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid references public.cases(id) on delete cascade,
  rule_key    text not null,
  target      text not null,
  window_key  text not null,
  sent_at     timestamptz not null default now(),
  unique (rule_key, target, window_key)
);
create index idx_reminder_log_case on public.reminder_log (case_id);

grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.reminder_log  to authenticated;

-- RLS
alter table public.notifications enable row level security;
alter table public.reminder_log  enable row level security;

-- notifications: a user sees/updates their own (e.g. the read flag); staff/admin all.
create policy notifications_select on public.notifications for select
  using (recipient = auth.uid() or public.is_staff_or_admin());
create policy notifications_update on public.notifications for update
  using (recipient = auth.uid())
  with check (recipient = auth.uid());

-- reminder_log: internal — admin-only read; the cron writes via the service role.
create policy reminder_log_admin on public.reminder_log for select
  using (public.is_admin());
