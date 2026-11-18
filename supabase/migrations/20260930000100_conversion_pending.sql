-- Round 1 recorded a `conversion_note` on applicant photos, but one column carried BOTH
-- "we converted this, here's what changed" (done) and "this needs a human" (a PDF we
-- can't auto-convert). Those must be distinguishable WITHOUT string-matching the prose,
-- because a document still awaiting manual conversion cannot be filed — it must not count
-- as satisfied or let a case report ready (the SPC-01 failure shape).
--
-- Explicit flag: `conversion_pending` = a person still has to convert this file before it
-- can go to the portal. `conversion_note` stays the human-readable detail either way.
alter table public.documents
  add column if not exists conversion_pending boolean not null default false;
