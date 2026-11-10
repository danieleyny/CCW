-- The ordered upload set is system-managed. Authenticated applicants/staff may
-- inspect links allowed by RLS, but only token-scoped service actions may write
-- them. Remove the broad write grant/policy created with the initial table.

drop policy if exists reference_request_documents_write
  on public.reference_request_documents;

revoke insert, update, delete
  on public.reference_request_documents
  from authenticated;
