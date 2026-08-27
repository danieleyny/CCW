-- ============================================================================
-- PART D · new document types for the wired official forms
--   affidavit_familiarity      — Affidavit of Familiarity with Rules & Law (5-33)
--   safeguard_acknowledgement  — Acknowledgement of Person Agreeing to Safeguard
--                                Firearm(s) (distinct from SAF-01's safe-storage)
--   affirmation_penal_law      — Affirmation re Penal Law Art. 35/265/400 (deferred)
-- Enum values are added in their own transaction before any cast to them.
-- ============================================================================
alter type public.document_type add value if not exists 'affidavit_familiarity';
alter type public.document_type add value if not exists 'safeguard_acknowledgement';
alter type public.document_type add value if not exists 'affirmation_penal_law';
