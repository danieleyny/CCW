-- CarryPath — core schema (enums, tables, triggers, indexes).
-- RLS policies live in the next migration; storage in the one after.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────
create type user_role        as enum ('client', 'staff', 'admin');
create type client_track      as enum ('resident', 'business', 'non_resident');
create type case_stage        as enum (
  'lead', 'eligibility_screened', 'signed_up_paid', 'training_scheduled',
  'training_complete', 'document_collection', 'notarization',
  'application_assembled', 'filed', 'fingerprinting_booked',
  'under_investigation', 'decision', 'licensed'
);
create type case_status       as enum ('active', 'blocked', 'on_hold', 'closed', 'approved', 'denied');
create type stage_status      as enum ('not_started', 'in_progress', 'complete');
create type checklist_status  as enum ('not_started', 'in_progress', 'submitted', 'approved', 'rejected');
create type checklist_owner   as enum ('client', 'staff');
create type document_type     as enum (
  'id', 'reference_letter', 'cohabitant_affidavit', 'social_media_list',
  'safe_photo_open', 'safe_photo_closed', 'training_cert', 'proof_residence'
);
create type document_status   as enum ('pending', 'approved', 'rejected');
create type cohabitant_status as enum ('not_started', 'received', 'notarized');
create type payment_type      as enum ('deposit', 'full', 'installment');
create type payment_status    as enum ('pending', 'paid', 'failed', 'refunded');
create type appointment_type  as enum ('consult', 'training', 'fingerprinting', 'nypd_interview');
create type task_status       as enum ('open', 'in_progress', 'done');

-- ─────────────────────────────────────────────────────────────────────────────
-- Shared trigger functions
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles (extends auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         user_role   not null default 'client',
  full_name    text        not null default '',
  phone        text,
  contact_pref text        not null default 'email', -- email | sms | both
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- instructors
-- ─────────────────────────────────────────────────────────────────────────────
create table public.instructors (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text,
  phone        text,
  availability jsonb not null default '[]'::jsonb,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_instructors_updated_at
  before update on public.instructors
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- clients
-- ─────────────────────────────────────────────────────────────────────────────
create table public.clients (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid references public.profiles (id) on delete set null,
  full_name      text not null,
  email          text,
  phone          text,
  borough        text,
  track          client_track not null default 'resident',
  eligibility    jsonb not null default '{}'::jsonb,
  assigned_staff uuid references public.profiles (id) on delete set null,
  current_stage  case_stage not null default 'lead',
  license_type   text,
  lead_source    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_clients_profile       on public.clients (profile_id);
create index idx_clients_assigned       on public.clients (assigned_staff);
create index idx_clients_current_stage  on public.clients (current_stage);

create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- cases (one application; renewals open a new case)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.cases (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.clients (id) on delete cascade,
  stage              case_stage  not null default 'lead',
  status             case_status not null default 'active',
  is_renewal         boolean     not null default false,
  opened_at          timestamptz not null default now(),
  target_file_date   date,
  closed_at          timestamptz,
  nypd_app_ref       text,
  license_expires_on date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_cases_client on public.cases (client_id);
create index idx_cases_stage  on public.cases (stage);
create index idx_cases_status on public.cases (status);

create trigger trg_cases_updated_at
  before update on public.cases
  for each row execute function public.set_updated_at();

-- Keep clients.current_stage in sync with the case's stage.
create or replace function public.sync_client_stage()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.clients set current_stage = new.stage where id = new.client_id;
  return new;
end;
$$;

create trigger trg_cases_sync_stage
  after insert or update of stage on public.cases
  for each row execute function public.sync_client_stage();

-- ─────────────────────────────────────────────────────────────────────────────
-- case_stages (per-case stage timeline for reporting)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.case_stages (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.cases (id) on delete cascade,
  stage        case_stage not null,
  status       stage_status not null default 'not_started',
  entered_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (case_id, stage)
);

create index idx_case_stages_case on public.case_stages (case_id);

create trigger trg_case_stages_updated_at
  before update on public.case_stages
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- checklist_items (templated per stage)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.checklist_items (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases (id) on delete cascade,
  template_key  text,
  stage         case_stage not null,
  title         text not null,
  description   text,
  required      boolean not null default true,
  owner         checklist_owner not null default 'client',
  status        checklist_status not null default 'not_started',
  document_type document_type,
  due_date      date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_checklist_case  on public.checklist_items (case_id);
create index idx_checklist_stage on public.checklist_items (case_id, stage);

create trigger trg_checklist_updated_at
  before update on public.checklist_items
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- documents
-- ─────────────────────────────────────────────────────────────────────────────
create table public.documents (
  id                uuid primary key default gen_random_uuid(),
  case_id           uuid not null references public.cases (id) on delete cascade,
  client_id         uuid not null references public.clients (id) on delete cascade,
  type              document_type not null,
  file_path         text,
  file_name         text,
  status            document_status not null default 'pending',
  reviewer          uuid references public.profiles (id) on delete set null,
  review_notes      text,
  notarized         boolean not null default false,
  version           integer not null default 1,
  checklist_item_id uuid references public.checklist_items (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_documents_case   on public.documents (case_id);
create index idx_documents_client on public.documents (client_id);
create index idx_documents_status on public.documents (status);

create trigger trg_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- character_references  (NB: `references` is a reserved SQL keyword)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.character_references (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases (id) on delete cascade,
  name          text not null,
  relationship  text,
  is_family     boolean not null default false,
  contact_email text,
  contact_phone text,
  notarized     boolean not null default false,
  received      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_references_case on public.character_references (case_id);

create trigger trg_references_updated_at
  before update on public.character_references
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- cohabitants
-- ─────────────────────────────────────────────────────────────────────────────
create table public.cohabitants (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references public.cases (id) on delete cascade,
  name             text not null,
  relationship     text,
  affidavit_status cohabitant_status not null default 'not_started',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_cohabitants_case on public.cohabitants (case_id);

create trigger trg_cohabitants_updated_at
  before update on public.cohabitants
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- training_sessions
-- ─────────────────────────────────────────────────────────────────────────────
create table public.training_sessions (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases (id) on delete cascade,
  instructor_id uuid references public.instructors (id) on delete set null,
  class_date    timestamptz,
  range_date    timestamptz,
  location      text,
  attended      boolean not null default false,
  test_score    integer,
  passed        boolean,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_training_case on public.training_sessions (case_id);

create trigger trg_training_updated_at
  before update on public.training_sessions
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- payments
-- ─────────────────────────────────────────────────────────────────────────────
create table public.payments (
  id                    uuid primary key default gen_random_uuid(),
  case_id               uuid references public.cases (id) on delete cascade,
  client_id             uuid references public.clients (id) on delete cascade,
  stripe_payment_intent text,
  amount_cents          integer not null,
  currency              text not null default 'usd',
  type                  payment_type not null default 'deposit',
  status                payment_status not null default 'pending',
  invoice_url           text,
  description           text,
  paid_at               timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_payments_case   on public.payments (case_id);
create index idx_payments_client on public.payments (client_id);
create index idx_payments_status on public.payments (status);

create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- appointments
-- ─────────────────────────────────────────────────────────────────────────────
create table public.appointments (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid references public.cases (id) on delete cascade,
  client_id    uuid references public.clients (id) on delete cascade,
  type         appointment_type not null,
  scheduled_at timestamptz not null,
  location     text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_appointments_case on public.appointments (case_id);
create index idx_appointments_time on public.appointments (scheduled_at);

create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- messages (threaded per case)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.cases (id) on delete cascade,
  sender_id  uuid references public.profiles (id) on delete set null,
  body       text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_messages_case on public.messages (case_id, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- tasks (internal action items)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid references public.cases (id) on delete cascade,
  title       text not null,
  description text,
  assignee    uuid references public.profiles (id) on delete set null,
  due_date    date,
  status      task_status not null default 'open',
  priority    integer not null default 2, -- 1 high, 2 normal, 3 low
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_tasks_assignee on public.tasks (assignee, status);
create index idx_tasks_case     on public.tasks (case_id);

create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- activity_log (immutable audit trail)
-- ─────────────────────────────────────────────────────────────────────────────
create table public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid references public.cases (id) on delete cascade,
  client_id  uuid references public.clients (id) on delete cascade,
  actor      uuid references public.profiles (id) on delete set null,
  action     text not null,
  entity     text,
  entity_id  uuid,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_activity_case    on public.activity_log (case_id, created_at desc);
create index idx_activity_created on public.activity_log (created_at desc);
