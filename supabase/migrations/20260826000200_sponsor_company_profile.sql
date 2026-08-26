-- ============================================================================
-- SPONSORED PORTAL — the company profile (B2)
--
-- Three required fields on the official company pistol-licence form (business
-- address, phone, type) resolved ONLY from the APPLICANT's intake — but for a
-- sponsored guard the employer IS the sponsoring company, not something the
-- applicant types. The sponsors table had no place to store them, so they could
-- never be filled. Add the company's own business columns (plus DBA and the two
-- signatory names the form asks for) so the rep enters the company once.
-- ============================================================================
alter table public.sponsors
  add column if not exists business_street    text,
  add column if not exists business_city      text,
  add column if not exists business_state     text,
  add column if not exists business_zip       text,
  add column if not exists business_phone      text,
  add column if not exists business_type       text,
  add column if not exists dba_name            text,   -- "doing business as", if any
  add column if not exists president_owner     text,   -- company officer on the form
  add column if not exists qualifying_officer  text;   -- WGP qualifying officer on the form
