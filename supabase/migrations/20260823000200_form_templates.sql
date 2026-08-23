-- ============================================================================
-- NYPD FORM TEMPLATE LIBRARY (Phase 3)
--
-- We hold the OFFICIAL NYPD/HRA PDFs and fill the REAL document — never a
-- look-alike (a form that merely looks official is worse than no form). The
-- bytes live in the repo (assets/form-templates/, read like the fonts in
-- lib/pdf/builder.ts); this table is the provenance + drift registry: which file,
-- what hash, where it came from, when we last verified it. A generated document
-- records the template + hash it was built from, so a signed form traces to the
-- exact revision. field_map lives in code (lib/forms/templates.ts) because the
-- child-support declarations are conditional logic, not a flat map.
-- ============================================================================

create table if not exists public.form_templates (
  id                uuid primary key default gen_random_uuid(),
  key               text not null unique,          -- 'nypd_child_support_cert'
  official_title    text not null,
  form_number       text,                          -- 'M-522'
  revision          text,                          -- 'Rev 05/10'
  issuing_authority text not null,                 -- 'NYC HRA' | 'NYPD License Division'
  source_url        text not null,
  storage_path      text not null,                 -- file under assets/form-templates/
  sha256            text not null,                 -- detects a silently changed source
  is_fillable       boolean not null default false, -- has an AcroForm layer
  verified_at       timestamptz not null default now(),
  superseded_by     uuid references public.form_templates (id),
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

-- Drift audit: each re-fetch of source_url records the hash it saw. A mismatch
-- against form_templates.sha256 raises a staff task — we NEVER auto-swap a
-- template; a changed official form needs a human to look at what changed.
create table if not exists public.form_template_checks (
  id            uuid primary key default gen_random_uuid(),
  template_key  text not null,
  fetched_sha256 text,
  matched       boolean not null,
  note          text,
  checked_at    timestamptz not null default now()
);
create index if not exists idx_form_template_checks_key on public.form_template_checks (template_key, checked_at desc);

-- Traceability on the OUTPUT: which template + hash produced this document.
alter table public.documents
  add column if not exists template_key text,
  add column if not exists template_sha256 text;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- The registry is reference data: any authenticated user may READ it (the fill
-- engine + admin console); only staff/admin write. Writes in practice happen via
-- the service-role register script.
grant select on public.form_templates       to authenticated;
grant select on public.form_template_checks to authenticated;
alter table public.form_templates       enable row level security;
alter table public.form_template_checks  enable row level security;

create policy form_templates_select on public.form_templates for select using (true);
create policy form_templates_write  on public.form_templates for all
  using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy form_template_checks_select on public.form_template_checks for select
  using (public.is_staff_or_admin());
create policy form_template_checks_write on public.form_template_checks for all
  using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

-- ── COH-02 — solo-resident attestation ───────────────────────────────────────
-- The official cohabitant affidavit has a solo-resident section: a lone applicant
-- still files an attestation. COH-01 fires only WITH cohabitants, so a lone
-- applicant was asked for nothing. COH-02 fills that gap (trigger unless_cohabitants).
insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, source_url,
   validation_rule, trigger_cond, severity, document_type, effective_from,
   blocking, needs_legal_review, concierge_scope)
select
  j.id, 'COH-02',
  'Sole-occupancy attestation',
  'If you live alone, the NYPD cohabitant affidavit''s solo-resident section is completed and signed by you (under penalty of perjury; no notary). We prepare the official form filled with your details for you to review and sign.',
  '38 RCNY §5-03; NYPD Affidavit of Co-Habitant (solo-resident section)', 'https://licensing.nypdonline.org/additional-forms/forms-cohab',
  '{"kind":"attestation","field":"sole_occupancy"}', 'unless_cohabitants', 'high', 'cohabitant_affidavit', date '2026-08-23',
  true, true, 'full'::public.concierge_scope
from (select id from public.jurisdiction_profiles where key in ('nyc','special_carry')) as j;
