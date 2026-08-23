-- ============================================================================
-- SPONSOR PARITY · the draft / adopt split + attribution
--
-- A full-scope sponsor may PREPARE anything on the case, but sworn statements
-- must be ADOPTED by the applicant to become final. The adoption is already the
-- applicant's SIGNATURE (signatures.signer_key='applicant', documents.signed_at)
-- — signRequirementDocument is client-only and stays that way. What was missing
-- is WHO drafted the answers, so the applicant's card can say "your sponsor
-- prepared this — review and sign" and the activity trail can attribute it.
--
-- drafted_by records the last party to save a questionnaire's answers. It is
-- attribution only; it never substitutes for the applicant's signature.
-- ============================================================================
alter table public.requirement_answers
  add column if not exists drafted_by uuid references public.profiles (id);

comment on column public.requirement_answers.drafted_by is
  'The profile that last drafted these answers (applicant or a full-scope sponsor rep). Attribution only — a sworn document is still not final until the APPLICANT signs it.';
