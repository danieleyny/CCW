-- V3-P4.2 — bind the photo requirement (IDN-04) to the new applicant_photo
-- document type so an approved upload auto-satisfies it.
--
-- Same-day amendment, not a new version: IDN-04 v2 was created earlier today
-- (2026-07-13) and the registry's version key is (jurisdiction, code,
-- effective_from) — a v3 dated today would collide. Amending the still-
-- unverified same-day row preserves its identity for any case_requirements
-- already pointing at it.
update public.requirements
set document_type = 'applicant_photo'::document_type
where req_code = 'IDN-04' and effective_to is null;
