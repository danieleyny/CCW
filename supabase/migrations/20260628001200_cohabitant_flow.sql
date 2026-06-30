-- ============================================================================
-- CarryPath V2 · Cohabitant affidavit self-serve flow (mirrors references)
-- Each adult cohabitant gets a tokenized link to confirm + notarize their
-- affidavit. We pre-fill the affidavit PDF, recommend a notary, and accept the
-- notarized upload — all in-system. Reuses the existing cohabitant_status enum
-- (not_started -> received -> notarized). Cohabitants stay client/staff-only
-- (no instructor RLS — same privacy posture as disclosures).
-- ============================================================================

alter table public.cohabitants
  add column if not exists contact_email text,
  add column if not exists token         text unique,
  add column if not exists answers       jsonb not null default '{}',
  add column if not exists notary_area   text,
  add column if not exists document_id   uuid references public.documents(id) on delete set null,
  add column if not exists notarized_at  timestamptz;

create index if not exists idx_cohabitants_token on public.cohabitants (token);
