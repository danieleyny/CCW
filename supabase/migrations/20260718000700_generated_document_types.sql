-- ============================================================================
-- Real document_type values for the documents the engine GENERATES.
--
-- The engine shipped with `type: doc.documentType ?? "id"` — every generated
-- document without a matching enum value (disclosure addendum, arrest
-- statements, order-of-protection and domestic-incident statements, the
-- application worksheet) was stored as a Government photo ID. Because the
-- documents view keys "latest per type", the ID slot then displayed the
-- disclosure addendum: a user could click "Government photo ID" and get their
-- PD 643-041A. Worse, a reviewer could treat it as an ID.
--
-- These values let every generated document carry its own identity; the `?? "id"`
-- fallback is deleted in the same change so mis-filing fails loudly instead.
-- driving_abstract also unblocks DMV-01, which had no uploader at all.
-- ============================================================================

alter type document_type add value if not exists 'disclosure_addendum';
alter type document_type add value if not exists 'arrest_statement';
alter type document_type add value if not exists 'order_of_protection_statement';
alter type document_type add value if not exists 'domestic_incident_statement';
alter type document_type add value if not exists 'application_worksheet';
alter type document_type add value if not exists 'driving_abstract';
alter type document_type add value if not exists 'court_request_letter';
