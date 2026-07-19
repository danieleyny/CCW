-- ============================================================================
-- PART A / Phase 3 — data retention, erasure requests, and the erasure record.
--
-- Context: the public privacy policy has promised, for months, that records are
-- "deleted on request or per our retention schedule". No retention schedule
-- existed and nothing ever deleted anything. This migration builds the
-- mechanism. It deliberately does NOT set a window — see below.
--
-- See docs/DATA_INVENTORY.md for what we actually hold and the two documented
-- positions (signature_events is minimized rather than erased; activity_log
-- cannot be the record of its own erasure).
-- ============================================================================

-- ── 1. Retention policy: configurable, and OFF ──────────────────────────────
-- ⚖ A table rather than an env var or a settings blob, for the same reason the
-- `fees` table is a table: this is a compliance-bearing number that counsel must
-- be able to change without a deploy, carrying the authority it rests on. Env
-- vars would also give one global window to data classes with different
-- statutory clocks, and no record of who changed it.
--
-- Retention obligations for firearms-licensing records may include statutory
-- MINIMUMS as well as maximums. We do not guess that number. Every policy ships
-- disabled with a null window, and lib/retention.ts refuses to act unless a
-- policy is both enabled and has a window — two independent offs.
create table if not exists public.retention_policies (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  label       text not null,
  description text,
  -- null = retain indefinitely. Set by counsel, never by us.
  retain_days integer check (retain_days is null or retain_days > 0),
  enabled     boolean not null default false,
  action      text not null check (action in ('purge', 'minimize')),
  -- The legal basis for the window, so a future reader knows why it is what it is.
  authority   text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.retention_policies is
  'Configurable retention windows. Ships disabled with null windows — nothing is deleted on a timer until counsel sets the number. See docs/DATA_INVENTORY.md.';

alter table public.retention_policies enable row level security;

create policy retention_policies_select on public.retention_policies for select
  using (public.is_staff_or_admin());
-- Changing a retention window is a legal decision, not an operational one.
create policy retention_policies_write on public.retention_policies for all
  using (public.is_admin())
  with check (public.is_admin());

insert into public.retention_policies (key, label, description, action, retain_days, enabled, notes)
values
  ('closed_case',
   'Closed cases',
   'Sensitive disclosure content on cases closed longer than the window.',
   'minimize', null, false,
   'AWAITING COUNSEL: firearms-licensing records may carry a statutory retention minimum. Do not enable until that is confirmed.'),
  ('abandoned_intake',
   'Abandoned intakes',
   'Intake sessions never completed, on cases with no engagement.',
   'purge', null, false,
   'AWAITING COUNSEL.'),
  ('notification',
   'Delivered notifications',
   'In-app notification rows past the window.',
   'purge', null, false,
   'Low sensitivity; safe to enable early once a window is chosen.'),
  ('reminder_log',
   'Reminder ledger',
   'Idempotency rows for reminders already sent.',
   'purge', null, false,
   'Operational only — holds no narrative content.')
on conflict (key) do nothing;

-- ── 2. Access / deletion requests ───────────────────────────────────────────
-- Modelled on license_reports (a typed client-initiated row that staff
-- acknowledge), NOT on the tasks queue. Three reasons: a task is free text
-- matched by ilike, tasks are freely mutable and deletable by any staffer, and
-- a task tied to the case would be DESTROYED BY THE ERASURE IT RECORDS.
--
-- Note the FKs are `on delete set null`, not cascade, and requester_email is
-- denormalized — the request must stay legible after the client row is gone.
create table if not exists public.data_requests (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid references public.cases(id) on delete set null,
  client_id       uuid references public.clients(id) on delete set null,
  requester_email text not null,
  kind            text not null check (kind in ('access', 'deletion', 'correction')),
  status          text not null default 'open'
                    check (status in ('open', 'acknowledged', 'fulfilled', 'refused')),
  detail          text,
  requested_at    timestamptz not null default now(),
  acknowledged_by uuid references public.profiles(id) on delete set null,
  acknowledged_at timestamptz,
  fulfilled_at    timestamptz,
  resolution_note text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_data_requests_status on public.data_requests (status)
  where status in ('open', 'acknowledged');

alter table public.data_requests enable row level security;

-- A client sees and files their own; staff see all. Mirrors license_reports.
create policy data_requests_select on public.data_requests for select
  using (public.case_visible(case_id) or public.is_staff_or_admin());
create policy data_requests_insert on public.data_requests for insert
  with check (public.case_visible(case_id));
-- Acting on a request is a staff act. A client cannot mark their own fulfilled.
create policy data_requests_update on public.data_requests for update
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

-- ── 3. The erasure record ───────────────────────────────────────────────────
-- activity_log cascades away with the case (case_id/client_id are both
-- `on delete cascade`), so it cannot be the record of a case's own deletion —
-- backwards for the one entry that must outlive its subject. logActivity() also
-- swallows errors by design, which is fine for a stage change and unacceptable
-- as the sole trace of an irreversible act.
--
-- Hence: plain uuid columns, deliberately NOT foreign keys, so nothing can
-- cascade this away. Insert-only — no update or delete grant at all.
create table if not exists public.data_erasure_log (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid,
  client_id       uuid,
  data_request_id uuid references public.data_requests(id) on delete set null,
  actor           uuid references public.profiles(id) on delete set null,
  -- Per-surface counts: {"disclosures": 3, "documents": 11, "storage_objects": 11, ...}
  surfaces        jsonb not null default '{}'::jsonb,
  note            text,
  created_at      timestamptz not null default now()
);

comment on table public.data_erasure_log is
  'Append-only record of erasures. Plain uuids by design so it survives the deletion it documents. No update/delete grant, ever.';

alter table public.data_erasure_log enable row level security;

create policy data_erasure_log_select on public.data_erasure_log for select
  using (public.is_staff_or_admin());
create policy data_erasure_log_insert on public.data_erasure_log for insert
  with check (public.is_staff_or_admin());
-- No update policy and no delete policy: both are denied, like activity_log.

-- ── 4. Fix an orphan-producing grant found while writing this ───────────────
-- Clients hold DELETE on their own storage objects (20260608194252) but there
-- is no matching DELETE policy on public.documents. So a client could remove
-- the bytes and leave a `documents` row pointing at a dead path — which breaks
-- the signed-URL loop in loadRequirementView and silently guts the evidence
-- binding on case_requirements.document_id (a satisfied requirement whose proof
-- no longer exists).
--
-- Revoking is the safe direction: deletion now flows through the request path
-- above, where it is recorded, rather than being a one-click client action with
-- no audit trail.
drop policy if exists documents_storage_delete on storage.objects;
