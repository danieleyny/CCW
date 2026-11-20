-- Public training registration. There are no public policies: all PII and
-- private ID files are read and written through server-side routes only.
create table if not exists public.training_classes (
  id uuid primary key default gen_random_uuid(), slug text not null unique, title text not null,
  sessions jsonb not null check (jsonb_typeof(sessions) = 'array'), location_public text not null,
  location_private text, hours_copy text, price_cents integer not null check (price_cents >= 0),
  capacity integer check (capacity > 0), status text not null default 'draft' check (status in ('draft','open','closed')),
  registration_closes_at timestamptz, instructor_name text not null, vendor_company text not null,
  vendor_class_urls jsonb not null default '[]'::jsonb, vendor_access_code text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.training_registrations (
  id uuid primary key default gen_random_uuid(), class_id uuid not null references public.training_classes(id) on delete cascade,
  status text not null default 'pending_payment' check (status in ('pending_payment','paid','enrolled','confirmed','cancelled','refunded')),
  first_name text not null, middle_name text not null default '', last_name text not null, dob date not null,
  gender text not null check (gender in ('male','female','na')), email text not null, mobile_phone text not null,
  home_phone text not null default '', address1 text not null, address2 text not null default '', city text not null, state text not null, zip text not null,
  us_citizen text not null check (us_citizen in ('yes','legal_resident','no')),
  experience text not null check (experience in ('none','beginner','intermediate','advanced')),
  background text not null check (background in ('civilian','military','former_military','law_enforcement','former_law_enforcement','instructor','first_responder','gov_contractor')),
  emergency_name text not null, emergency_phone text not null, medical_notes text, id_file_path text,
  sms_opt_in boolean not null default false, agreed_terms_at timestamptz not null, agreed_terms_version text not null,
  stripe_payment_intent_id text unique, amount_cents integer not null, utm jsonb not null default '{}'::jsonb, admin_notes text,
  paid_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (class_id, email)
);
create table if not exists public.training_waitlist (
  id uuid primary key default gen_random_uuid(), class_id uuid references public.training_classes(id) on delete set null,
  email text not null, created_at timestamptz not null default now(), unique(class_id, email)
);
create index if not exists training_classes_open_idx on public.training_classes(status);
create index if not exists training_registrations_class_status_idx on public.training_registrations(class_id, status);
alter table public.training_classes enable row level security;
alter table public.training_registrations enable row level security;
alter table public.training_waitlist enable row level security;
create policy training_classes_staff on public.training_classes for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy training_registrations_staff on public.training_registrations for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy training_waitlist_staff on public.training_waitlist for select using (public.is_staff_or_admin());
insert into storage.buckets (id, name, public) values ('training-ids', 'training-ids', false) on conflict (id) do nothing;
insert into public.training_classes (
  slug, title, sessions, location_public, location_private, hours_copy, price_cents, capacity, status, registration_closes_at,
  instructor_name, vendor_company, vendor_class_urls, vendor_access_code
) values (
  'ccw-2026-11', 'NYS CCW Licensing Class',
  '[{"date":"2026-11-02","start":"17:00","end":"22:00","label":"Session 1"},{"date":"2026-11-03","start":"17:00","end":"22:00","label":"Session 2"},{"date":"2026-11-05","start":"17:00","end":"22:00","label":"Session 3"}]'::jsonb,
  'Manhattan', null, null, 70000, null, 'open', '2026-11-01T22:00:00-05:00', 'Yariv Ben-Ari', '50B EDC Training & Consulting LLC',
  '["https://www.shootingclasses.com/class-registration/?classId=61285","https://www.shootingclasses.com/class-registration/?classId=61286","https://www.shootingclasses.com/class-registration/?classId=61287"]'::jsonb, null
) on conflict (slug) do update set
  title = excluded.title, sessions = excluded.sessions, location_public = excluded.location_public, price_cents = excluded.price_cents,
  status = excluded.status, registration_closes_at = excluded.registration_closes_at, instructor_name = excluded.instructor_name,
  vendor_company = excluded.vendor_company, vendor_class_urls = excluded.vendor_class_urls, updated_at = now();
