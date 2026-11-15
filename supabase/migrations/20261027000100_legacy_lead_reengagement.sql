-- One-time, operator-authorized follow-up for people who directly requested
-- information through the site before the explicit marketing opt-in existed.
-- This is deliberately separate from marketing_contacts: it must never be
-- mistaken for affirmative consent to an ongoing nurture sequence.

create table public.legacy_lead_outreach (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  email citext not null,
  source text not null,
  campaign_key text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  resend_email_id text,
  sent_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, campaign_key)
);

create index legacy_lead_outreach_sent_idx
  on public.legacy_lead_outreach(sent_at desc)
  where status = 'sent';

create trigger trg_legacy_lead_outreach_updated_at
  before update on public.legacy_lead_outreach
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.legacy_lead_outreach to authenticated;
alter table public.legacy_lead_outreach enable row level security;
create policy legacy_lead_outreach_staff_select on public.legacy_lead_outreach
  for select using (public.is_staff_or_admin());
