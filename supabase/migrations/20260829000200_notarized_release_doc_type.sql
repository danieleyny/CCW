-- PORTAL_ALIGNMENT_REBUILD (authoritative) · Part 8 — the notarized Release.
-- Affirmation #3 has the applicant affirm they will provide signed and notarized
-- Release(s) authorizing the License Division to obtain any relevant information. Make
-- it a real, tracked, notarised requirement. Added in its own migration so a later one
-- can reference it (Postgres forbids using a new enum value in the same transaction).
alter type public.document_type add value if not exists 'notarized_release';
