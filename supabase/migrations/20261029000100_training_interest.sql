-- A standalone marketing-interest list. It intentionally does not create a client,
-- case, task, or requirement: training interest is not an application intake.
create extension if not exists citext;

create table public.training_interest (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 80),
  email citext not null,
  phone_e164 text not null check (phone_e164 ~ '^\\+1[0-9]{10}$'),
  timeframe text not null check (timeframe in ('1-2_months', '3-6_months', '12_plus_months')),
  source text not null check (source = 'home_training_section'),
  user_agent text,
  ip_hash text not null,
  status text not null default 'new' check (status in ('new', 'unsubscribed'))
);

create index training_interest_email_created_at_idx on public.training_interest (email, created_at desc);
create index training_interest_ip_hash_created_at_idx on public.training_interest (ip_hash, created_at desc);

alter table public.training_interest enable row level security;

-- Public writes are only through the server route; admins may review / export.
create policy training_interest_admin_select on public.training_interest for select
  using (public.is_staff_or_admin());
