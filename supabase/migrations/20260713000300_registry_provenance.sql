-- ============================================================================
-- V3 Phase 1a — Registry provenance, blocking semantics, fee schedule, and
-- training as a decaying asset.
--
--  · Every requirement now carries provenance: where the rule comes from
--    (source_url), who verified it and when, and a needs_legal_review flag
--    (defaults TRUE — nothing is presumed attorney-verified).
--  · `blocking` is the crisp gate semantic the CP-5 pre-filing QA gate (Phase 2)
--    will read: advisory rows (e.g. the enjoined social-media disclosure) can
--    never block filing.
--  · Fees move out of prose and into a config table — a fee change is a data
--    edit, not a deploy.
--  · Training is time-limited (38 RCNY § 5-03(a)(2): completed ≤6 months before
--    submission) — model completion + expiry on the case.
-- ============================================================================

-- ── new document types for the new tracks ────────────────────────────────────
-- (added here, used by the next migration — a new enum value can't be used in
-- the transaction that creates it)
alter type document_type add value if not exists 'leo_good_guy_letter';
alter type document_type add value if not exists 'leo_property_receipt';
alter type document_type add value if not exists 'leo_cert_of_service';
alter type document_type add value if not exists 'oos_background_form';

-- ── requirements provenance + blocking ───────────────────────────────────────
alter table public.requirements
  add column if not exists source_url         text,
  add column if not exists verified_by        uuid references public.profiles(id) on delete set null,
  add column if not exists verified_on        date,
  add column if not exists needs_legal_review boolean not null default true,
  add column if not exists blocking           boolean not null default true;

create index if not exists idx_requirements_legal_review
  on public.requirements (needs_legal_review) where needs_legal_review;

-- ── training as a decaying asset ─────────────────────────────────────────────
alter table public.cases
  add column if not exists training_completed_on date,
  add column if not exists training_expires_on   date;

-- ── fee schedule ─────────────────────────────────────────────────────────────
create table if not exists public.fees (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique,
  label        text not null,
  amount_cents integer not null,
  payee        text not null,
  authority    text,
  notes        text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_fees_updated_at
  before update on public.fees
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.fees to authenticated;

alter table public.fees enable row level security;
-- Fees are public reference data for any signed-in user; only admin edits them
-- (they are compliance-bearing amounts).
create policy fees_select on public.fees for select using (true);
create policy fees_write on public.fees for all
  using (public.is_admin())
  with check (public.is_admin());

insert into public.fees (key, label, amount_cents, payee, authority, notes) values
  ('nypd_application', 'NYPD License Division application fee', 34000, 'NYPD License Division',
   'P.L. §400.00(14); NYPD portal',
   'Applies to NEW applications and RENEWALS alike. Non-refundable regardless of outcome. Cash and personal checks not accepted.'),
  ('dcjs_fingerprint', 'NYS DCJS fingerprint fee', 8825, 'NYS Division of Criminal Justice Services',
   'NYS DCJS fee schedule; NYPD portal',
   'Paid separately from the application fee. Portal lists $88.25 (nyc.gov shows $89.75 — portal is likelier current; verify). Non-refundable.'),
  ('retired_leo_application', 'Application fee — retired law enforcement', 0, 'NYPD License Division',
   'NYPD License Division policy',
   'Application fee waived for retired law-enforcement applicants; the DCJS fingerprint fee is still owed.')
on conflict (key) do nothing;
