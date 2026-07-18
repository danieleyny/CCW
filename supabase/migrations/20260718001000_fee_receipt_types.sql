-- ============================================================================
-- FEE RECEIPT DOCUMENT TYPES
--
-- The applicant pays two government fees directly — the NYPD application fee on
-- the NYPD portal, and the fingerprint fee to the DCJS-approved vendor at the
-- appointment. WE NEVER COLLECT EITHER. What we can usefully do is let them keep
-- the receipts with the rest of their file, where staff can see them and the
-- packet can include them.
--
-- Real types, deliberately: dumping a fee receipt into the generic 'id' slot is
-- the exact class of bug that put a generated disclosure addendum in the
-- Government-photo-ID slot (see 20260718000700).
--
-- Note: new enum values can't be USED in the same transaction that adds them, so
-- nothing below references them. The app writes these values from the next
-- deploy onward.
-- ============================================================================

alter type public.document_type add value if not exists 'nypd_fee_receipt';
alter type public.document_type add value if not exists 'fingerprint_fee_receipt';

-- The personalized "your fees & how to pay them" sheet we generate for them.
alter type public.document_type add value if not exists 'fee_sheet';
