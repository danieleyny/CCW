-- V3-P4.2 — a dedicated document slot for the NYPD application photo (the spec
-- is machine-checkable; the portal validates it client-side before upload).
-- Enum value added alone: it can't be used in the transaction that creates it.
alter type document_type add value if not exists 'applicant_photo';
