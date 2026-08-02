-- ============================================================================
-- Security Wave 3 (DB) — webhook idempotency, message-content immutability, and
-- retiring a dead client-writable policy.
-- ============================================================================

-- ── SEC-23 · Stripe event idempotency ledger ────────────────────────────────
-- The webhook records each event id before acting; a replayed/retried event
-- collides on the primary key and is acknowledged without re-running side
-- effects. Service-role only (the webhook uses the admin client); no
-- authenticated access at all.
create table if not exists public.stripe_events (
  id          text primary key,          -- Stripe event id (evt_…)
  type        text,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
-- No policies → the authenticated/anon roles can't touch it; the service role
-- bypasses RLS, which is exactly (and only) who writes here.

-- ── SEC-16 · messages are append-only for non-staff; only `read` may flip ───
-- messages_update exists so a client/instructor can mark their lane read. The
-- policy can't restrict WHICH columns change, so an instructor who owns the
-- engagement could rewrite a message body or flip staff_only. Freeze the content
-- and routing columns for any non-staff writer; staff/admin and the service role
-- are unaffected.
create or replace function public.guard_message_content()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_staff_or_admin()
     or current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  -- Client / instructor: mark-read only. Everything that carries meaning or
  -- routes the message is frozen to its stored value.
  new.body          := old.body;
  new.case_id       := old.case_id;
  new.sender_id     := old.sender_id;
  new.staff_only    := old.staff_only;
  new.engagement_id := old.engagement_id;
  new.created_at    := old.created_at;
  return new;
end;
$$;

create trigger trg_messages_guard_content
  before update on public.messages
  for each row execute function public.guard_message_content();

-- ── SEC-24 · retire the dead checklist_items client-write policy ────────────
-- The V1 `checklist_items` table is superseded by case_requirements and is read
-- and written by NOTHING in the app. Its inherited policy still let a client
-- INSERT/UPDATE rows (owner='client'). Drop the write policies so the dormant
-- table exposes no client-writable surface; SELECT (staff) stays for any
-- archival read.
drop policy if exists checklist_update on public.checklist_items;
drop policy if exists checklist_insert on public.checklist_items;
