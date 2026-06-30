-- ============================================================================
-- CarryPath V2 · Reference flow v2 — self-serve answers + notarization
-- The reference answers questions on the public page (stored as `answers`), we
-- generate a notarization-ready PDF, and they upload the notarized copy (bound
-- to a documents row via `document_id`). Status lifecycle now uses sent →
-- opened → submitted (answered, PDF ready) → notarized (uploaded).
-- ============================================================================

alter table public.reference_requests
  add column if not exists answers      jsonb not null default '{}',
  add column if not exists notary_area  text,
  add column if not exists answered_at  timestamptz,
  add column if not exists notarized_at timestamptz,
  add column if not exists document_id  uuid references public.documents(id) on delete set null;
