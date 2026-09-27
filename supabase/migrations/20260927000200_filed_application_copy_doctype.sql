-- Special Carry portal step 17 (Final review) produces a COMPLETE COPY of the submitted
-- application — the authoritative record of exactly what was filed, and the artifact the
-- Application tab exists to approximate. Store it as a tracked document so a later
-- discrepancy between what we hold and what was actually filed becomes visible.
--
-- This is a new document_type only. The copy is tagged req_code 'APP-01' by convention on
-- the documents row; it is deliberately NOT a materialised applicant requirement (no
-- `requirements` row), so it never appears on the applicant's checklist. Staff save it at
-- filing time (prompted from config/portal-steps.ts step 17 `producesReqCode`).
alter type document_type add value if not exists 'filed_application_copy';
