-- A reference invitation row was written `status:'sent'` BEFORE the email was attempted,
-- so the applicant's card claimed "We've emailed your references" even when delivery was
-- skipped (Resend not configured) or rejected. Record whether the email ACTUALLY went, so
-- every surface can tell the truth on reload and offer a copy-link for the ones it didn't.
alter table public.reference_requests
  add column if not exists emailed boolean not null default false;
