-- ============================================================================
-- V3 Phase 3 — revenue (packages in the DB) + the post-issuance lifecycle
-- (38 RCNY §§ 5-24, 5-25). The license is valid 3 years; the product should
-- carry the relationship all 3 — not end at "filed".
-- ============================================================================

-- ── service_packages: pricing is a data edit, not a deploy ───────────────────
create table public.service_packages (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique,
  name          text not null,
  blurb         text not null,
  price_cents   integer not null default 0,   -- 0 = custom/quote
  deposit_cents integer not null default 0,   -- 0 = full payment only
  price_label   text,                          -- display override ("Custom")
  featured      boolean not null default false,
  active        boolean not null default true,
  sort          integer not null default 100,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_service_packages_updated_at
  before update on public.service_packages
  for each row execute function public.set_updated_at();

grant select on public.service_packages to anon;
grant select, insert, update, delete on public.service_packages to authenticated;

alter table public.service_packages enable row level security;
-- Public pricing: anyone (incl. anonymous marketing visitors) reads active rows;
-- pricing edits are admin-only (they're revenue-bearing).
create policy service_packages_select on public.service_packages for select
  using (active or public.is_staff_or_admin());
create policy service_packages_write on public.service_packages for all
  using (public.is_admin())
  with check (public.is_admin());

insert into public.service_packages (key, name, blurb, price_cents, deposit_cents, price_label, featured, sort) values
  ('self_guided',    'Self-Guided',    'Portal access, full document checklist, and filing guidance.', 49900, 19900, null, false, 10),
  ('full_concierge', 'Full Concierge', 'End-to-end: training coordination, document prep, notarization help, assembly + filing, interview prep.', 199900, 50000, null, true, 20),
  ('non_resident',   'Non-Resident / Special Carry', 'Dedicated track for out-of-area applicants.', 0, 0, 'Custom', false, 30),
  ('renewal',        'Renewal',        'Discounted recurring service every 3 years.', 39900, 0, null, false, 40)
on conflict (key) do nothing;

-- payments learn which package they purchase + the Stripe session that did it.
alter table public.payments
  add column if not exists package_key text,
  add column if not exists stripe_session_id text;

-- ── purchase authorizations (§ 5-25): 30-day validity, 90-day rule, 72-hour
--    inspection window after acquisition ────────────────────────────────────
create table public.purchase_authorizations (
  id             uuid primary key default gen_random_uuid(),
  case_id        uuid not null references public.cases(id) on delete cascade,
  client_id      uuid not null references public.clients(id) on delete cascade,
  authorized_on  date not null,
  expires_on     date not null,                -- authorized_on + 30 days
  handgun_desc   text,
  acquired_on    date,                         -- purchase date (starts both clocks)
  inspection_due timestamptz,                  -- acquired + 72 hours
  inspected_on   date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_purchase_auth_case on public.purchase_authorizations (case_id, created_at desc);
create trigger trg_purchase_authorizations_updated_at
  before update on public.purchase_authorizations
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.purchase_authorizations to authenticated;

alter table public.purchase_authorizations enable row level security;
create policy purchase_auth_select on public.purchase_authorizations for select
  using (public.case_visible(case_id));
create policy purchase_auth_write on public.purchase_authorizations for all
  using (public.case_visible(case_id))
  with check (public.case_visible(case_id));

-- ── § 5-24 reporting duties: guided, recorded, acknowledged ─────────────────
create table public.license_reports (
  id              uuid primary key default gen_random_uuid(),
  case_id         uuid not null references public.cases(id) on delete cascade,
  client_id       uuid not null references public.clients(id) on delete cascade,
  kind            text not null check (kind in (
    'address_change','email_change','arrest_or_summons','psychiatric_treatment',
    'substance_treatment','order_of_protection','erpo','other'
  )),
  details         text not null,
  reported_at     timestamptz not null default now(),
  acknowledged_by uuid references public.profiles(id) on delete set null,
  acknowledged_at timestamptz,
  created_at      timestamptz not null default now()
);
create index idx_license_reports_case on public.license_reports (case_id, reported_at desc);

grant select, insert, update, delete on public.license_reports to authenticated;

alter table public.license_reports enable row level security;
create policy license_reports_select on public.license_reports for select
  using (public.case_visible(case_id));
create policy license_reports_insert on public.license_reports for insert
  with check (public.case_visible(case_id));
-- Acknowledgement is a staff act.
create policy license_reports_update on public.license_reports for update
  using (public.is_staff_or_admin())
  with check (public.is_staff_or_admin());

-- ── Special Carry dependency (§ 5-25): track the underlying county license ──
alter table public.cases
  add column if not exists county_license_expires_on date;
