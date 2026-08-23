-- ============================================================================
-- Investigation-phase form outputs (Phase 4). These are pre-prepared on request
-- (not packet requirements), stored as generated documents so they persist and
-- surface on the applicant's file. Own migration so the seed/runtime can use the
-- new enum values (Postgres forbids using a fresh enum value in the txn that adds it).
-- ============================================================================
alter type public.document_type add value if not exists 'employment_authorization';
alter type public.document_type add value if not exists 'hipaa_release';
