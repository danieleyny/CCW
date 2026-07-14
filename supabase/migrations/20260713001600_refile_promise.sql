-- V5b Workstream C — per-package eligibility for The Refile Promise, so a
-- package can opt out without hardcoding the rule in a component.
alter table public.service_packages add column if not exists refile_promise boolean not null default true;

-- The Non-Resident / Special Carry track is custom-scoped case by case; opt it
-- out of the standing promise until its scope is defined.
update public.service_packages set refile_promise = false where key = 'non_resident';
