-- ============================================================================
-- CarryPath V2 · In-system e-signature
-- Captured signatures (small PNGs, base64) keyed per case + signer. Stamped into
-- generated PDFs so the applicant, references, and cohabitants can sign without
-- printing/scanning. Signatures are PII — client/staff RLS only, never instructors
-- (the public reference/cohabitant flows write via the service-role token path).
-- ============================================================================

create table public.signatures (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  signer_key  text not null,            -- 'applicant' | 'reference:<id>' | 'cohabitant:<id>'
  png_base64  text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (case_id, signer_key)
);

create trigger trg_signatures_updated_at
  before update on public.signatures for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.signatures to authenticated;

alter table public.signatures enable row level security;
create policy signatures_select on public.signatures for select
  using (public.case_visible(case_id));
create policy signatures_write on public.signatures for all
  using (public.case_visible(case_id))
  with check (public.case_visible(case_id));
