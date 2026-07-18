-- ============================================================================
-- SIGNING STATE ON A GENERATED DOCUMENT
--
-- The document engine produced every document unsigned: no signature stamped,
-- and the date printed on it was the RENDER date, not a date anybody signed
-- anything. Meanwhile the requirement was marked satisfied on generation — so an
-- unsigned draft could ride through the CP-5 gate and get filed.
--
-- `signed_at` makes the distinction explicit and queryable:
--   signed_at IS NULL  → DRAFT. Downloadable, labelled "DRAFT — UNSIGNED",
--                        and it must NOT satisfy a signable requirement.
--   signed_at IS NOT   → the applicant applied their signature to THESE bytes;
--                        signature_events holds the SHA-256 + consent trail.
--
-- Editing answers and regenerating produces fresh unsigned bytes, which clears
-- signed_at — a signature never sits on stale content.
-- ============================================================================

alter table public.documents
  add column if not exists signed_at timestamptz;

comment on column public.documents.signed_at is
  'When the applicant applied their signature to these exact bytes. NULL on a generated document means DRAFT — unsigned, and it cannot satisfy a signable requirement. See signature_events for the audit trail.';

create index if not exists idx_documents_generated_req
  on public.documents (case_id, req_code, created_at desc)
  where generated;
