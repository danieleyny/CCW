-- PORTAL_ALIGNMENT_REBUILD · Part 4a — the safeguard person's photo ID (and, if the
-- applicant holds a firearm licence, its front and back) is a NEW portal upload. Added
-- in its own migration so a later one can reference it (Postgres forbids using a new
-- enum value in the same transaction that adds it). applicant_photo already exists.
alter type public.document_type add value if not exists 'safeguard_id';
