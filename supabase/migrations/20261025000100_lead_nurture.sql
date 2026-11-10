-- Consented, privacy-conscious lead nurture.
--
-- A public eligibility lead is NOT automatically a marketing subscriber. This
-- isolated audience records an explicit opt-in and never carries quiz answers,
-- disclosures, or other sensitive application data. The service-role nurture
-- engine is the only writer; staff may inspect the state through RLS.

create table public.marketing_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  email citext not null unique,
  first_name text not null,
  source text not null,
  track public.client_track,
  consented_at timestamptz not null,
  account_created_at timestamptz,
  consent_version text not null,
  unsubscribed_at timestamptz,
  suppressed_at timestamptz,
  suppression_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_contacts_suppression_reason_check check (
    (suppressed_at is null and suppression_reason is null)
    or (suppressed_at is not null and suppression_reason is not null)
  )
);

create index marketing_contacts_active_idx
  on public.marketing_contacts(consented_at)
  where unsubscribed_at is null and suppressed_at is null;
create index marketing_contacts_client_idx on public.marketing_contacts(client_id);

create trigger trg_marketing_contacts_updated_at
  before update on public.marketing_contacts
  for each row execute function public.set_updated_at();

create table public.marketing_email_log (
  id uuid primary key default gen_random_uuid(),
  marketing_contact_id uuid not null references public.marketing_contacts(id) on delete cascade,
  campaign_key text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  resend_email_id text,
  sent_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (marketing_contact_id, campaign_key)
);

create index marketing_email_log_contact_sent_idx
  on public.marketing_email_log(marketing_contact_id, sent_at desc)
  where status = 'sent';

create trigger trg_marketing_email_log_updated_at
  before update on public.marketing_email_log
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.marketing_contacts to authenticated;
grant select, insert, update, delete on public.marketing_email_log to authenticated;

alter table public.marketing_contacts enable row level security;
alter table public.marketing_email_log enable row level security;

create policy marketing_contacts_staff_select on public.marketing_contacts
  for select using (public.is_staff_or_admin());
create policy marketing_email_log_staff_select on public.marketing_email_log
  for select using (public.is_staff_or_admin());
