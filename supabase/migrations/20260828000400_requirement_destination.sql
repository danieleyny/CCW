-- ============================================================================
-- PORTAL_ALIGNMENT_REBUILD · Part 4 — where each document GOES.
--
-- Every requirement now declares a destination so the applicant can see, at a glance,
-- which pile a document is in:
--   portal_upload — uploaded to the NYPD online portal's document-upload page.
--   interview     — held for the in-person interview / our file; NOT uploaded.
--   internal      — our record / data entered into the portal (disclosures, letter of
--                   necessity, fees, system checks). Default.
-- ============================================================================
do $$ begin
  create type public.requirement_destination as enum ('portal_upload', 'interview', 'internal');
exception when duplicate_object then null; end $$;

alter table public.requirements
  add column if not exists destination public.requirement_destination not null default 'internal';

-- Uploaded to the portal's document-upload page.
update public.requirements set destination = 'portal_upload'
 where req_code in (
   'IDN-01','IDN-02','IDN-03','IDN-04','RES-01','COH-01','COH-02','TRN-01','RNW-01',
   'PBR-01','GRD-01','GRD-02','GRD-03','GRD-04'
 ) and effective_to is null;

-- Held for the interview / our file — never uploaded to the portal.
update public.requirements set destination = 'interview'
 where req_code in (
   'REF-01','REF-02','SSN-01','CSC-01','DMV-01','FAM-01','AFF-01','AFF-02','SFG-01',
   'COR-01','ARR-01','OOP-01','DIR-01','SOC-01','NAM-01','MIL-01','GMC-01','PRM-01',
   'OOS-01','LEO-01','LEO-02','LEO-03'
 ) and effective_to is null;

-- Everything else stays 'internal' (disclosures, letter of necessity, fees, eligibility
-- and format checks, sponsor packet).
