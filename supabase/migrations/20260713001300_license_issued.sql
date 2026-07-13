-- V4-A2 — record the license issuance date. The lifecycle columns
-- (license_expires_on, county_license_expires_on) already exist but NOTHING
-- wrote them, so renewal-runway / county-watcher reminders and the portal
-- license card read a column nobody filled. recordLicenseIssued now writes all
-- three; add issued-on so the record is complete and auditable.
alter table public.cases add column if not exists license_issued_on date;
