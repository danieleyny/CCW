-- Portal-parity corrections to requirement `destination` (see PORTAL_PARITY_AUDIT).
-- The live NYPD portal's step-13 upload screen has NO citizenship slot and no
-- armed-guard slots; those documents are held for the in-person interview, not
-- uploaded online. Retag the live (effective_to IS NULL) versions accordingly.
--
-- destination is a classification of an existing requirement, not a dated rule change,
-- so this corrects the current rows in place (the same way 20260828000400 set them).

-- Proof of citizenship / lawful status: a field at step 1, an interview document — the
-- portal has no upload slot for it.
update public.requirements set destination = 'interview'
  where req_code = 'IDN-03' and effective_to is null;

-- Armed-guard (ISS Action) certificates are not a CCW online-portal upload.
update public.requirements set destination = 'interview'
  where req_code in ('GRD-01', 'GRD-02', 'GRD-03', 'GRD-04') and effective_to is null;

-- IDN-04 (retired, merged into PHO-01) and PBR-01 (retired — step 11 fills inline) have
-- no live version; these are defensive no-ops that document intent if one is ever revived.
update public.requirements set destination = 'internal'
  where req_code in ('IDN-04', 'PBR-01') and effective_to is null;

-- COH-01/COH-02 (cohabitant affidavit / sole-occupancy attestation), TRN-01/RNW-01
-- (training / renewal live-fire) stay 'portal_upload' — they map to the Cohabitant and
-- Training Documents slots. No change needed.
