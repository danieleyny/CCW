-- ============================================================================
-- APPLICATION_COMPLETION · Part 10 — the public-records-exemption document type.
--
-- PL §400.00(5)(b) lets a licensee ask the License Division to withhold their name
-- and address from the otherwise-public licensee record. We offer the official form
-- (hand-filled for v1). Added in its own migration so a later one can reference it
-- (Postgres forbids using a new enum value in the same transaction that adds it).
-- letter_of_necessity already exists (20260821000300).
-- ============================================================================
alter type public.document_type add value if not exists 'public_records_exemption';
