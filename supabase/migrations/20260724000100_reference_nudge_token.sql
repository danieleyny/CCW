-- ============================================================================
-- One-click "remind this reference" capability for the applicant.
--
-- The reference-unfilled reminder email now names the specific reference and
-- carries a button that resends the invite. That button needs a capability the
-- APPLICANT holds — distinct from `reference_requests.token`, which is the
-- REFERENCE's own private fill-link. Embedding the fill-token in the applicant's
-- email would leak the reference's link on a forward, so the nudge gets its own
-- opaque token.
--
-- No RLS change: like every tokenized public flow (/r, /c), the nudge route
-- reads this through the service-role client, scoped strictly by the token.
-- ============================================================================

alter table public.reference_requests
  add column if not exists nudge_token text unique;

create index if not exists idx_ref_requests_nudge on public.reference_requests (nudge_token);

comment on column public.reference_requests.nudge_token is
  'Applicant-held capability behind /r/nudge/<token> — resends this reference their invite. Distinct from `token` (the reference''s own fill-link).';
