-- V5b Workstream A — an ISOLATED email-subscription table. A person who wanted a
-- PDF of their range plan is not a case: this never touches clients, cases,
-- tasks, or the requirements registry. Inserts happen only through the
-- service-role client in app/api/subscribe/route.ts.
create extension if not exists citext;

create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  offer text not null check (offer in ('fit-report', 'reciprocity-card', 'law-watch', 'checklist')),
  source text not null,                                   -- 'ck:report', 'carry:checklist', …
  payload jsonb not null default '{}'::jsonb,
  jurisdiction text,                                      -- 'ny' | 'nj' | null
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (email, offer)
);

create index idx_subscribers_offer_active on public.subscribers (offer) where unsubscribed_at is null;

alter table public.subscribers enable row level security;

-- Staff/admin may read; there is NO anon/client select and NO insert/update/delete
-- policy, so only the service-role route handler can write. Default-deny does the rest.
create policy subscribers_select on public.subscribers for select
  using (public.is_staff_or_admin());
