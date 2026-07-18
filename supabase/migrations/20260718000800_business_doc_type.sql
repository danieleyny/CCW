-- PRM-01 (premises-business documentation) is mode:"obtain" but had no
-- document_type, so like DMV-01 it rendered guidance with nowhere to upload.
-- A discriminated union now makes documentType REQUIRED for every "obtain"
-- requirement; this gives PRM-01 a type to bind to.
alter type document_type add value if not exists 'business_documentation';
