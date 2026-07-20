-- Soft email confirmation on invitee submissions.
--
-- The reference / cohabitant confirms (or corrects) the email address the
-- applicant listed for them when they submit. We record it so the applicant and
-- staff can see the submission came from the intended person, and flag a
-- mismatch against character_references.contact_email / cohabitants.contact_email.
--
-- This is deliberately SOFT: the token remains the access grant and the notary
-- provides the real identity proof, so a mismatch never blocks the submission —
-- it is a signal, not a gate. No RLS change: the new column inherits each table's
-- existing row policies (the applicant already reads their own rows).
alter table public.reference_requests add column if not exists confirmed_email text;
alter table public.cohabitants add column if not exists confirmed_email text;

comment on column public.reference_requests.confirmed_email is
  'Email the reference confirmed on their submission page (soft-verified against character_references.contact_email).';
comment on column public.cohabitants.confirmed_email is
  'Email the cohabitant confirmed on their affidavit page (soft-verified against cohabitants.contact_email).';
