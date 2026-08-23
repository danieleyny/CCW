-- ============================================================================
-- SPONSORED-APPLICANT PORTAL · Phase 2a — document types for the Carry Guard set
--
-- New document_type enum values for the armed-guard / sponsor requirement rows.
-- MUST be its own migration: Postgres forbids using a freshly-added enum value in
-- the same transaction that adds it, and the next migration seeds rows that
-- reference these.
-- ============================================================================

-- Sponsor-owned company packet
alter type public.document_type add value if not exists 'carry_guard_company_form';        -- SPN-01
alter type public.document_type add value if not exists 'letter_of_necessity';             -- SPN-02
alter type public.document_type add value if not exists 'sponsor_hours_worksheet';         -- SPN-03
alter type public.document_type add value if not exists 'wgp_agency_license';              -- SPN-04 (Watch/Guard/Patrol)
alter type public.document_type add value if not exists 'sponsored_position_confirmation'; -- SPN-06
alter type public.document_type add value if not exists 'firearm_specification';           -- SPN-07 (conditional)

-- Applicant-owned armed-guard credentials
alter type public.document_type add value if not exists 'security_guard_registration';     -- GRD-01
alter type public.document_type add value if not exists 'guard_preassignment_cert';        -- GRD-02 (8-hr)
alter type public.document_type add value if not exists 'guard_ojt_cert';                  -- GRD-03 (16-hr OJT)
alter type public.document_type add value if not exists 'guard_inservice_cert';            -- GRD-04 (annual 8-hr)
alter type public.document_type add value if not exists 'prelicense_exemption';            -- PLE-01 (38 RCNY §5-09)
alter type public.document_type add value if not exists 'firearms_course_cert';            -- FRM-01 (47-hr)
alter type public.document_type add value if not exists 'child_support_cert';              -- CSC-01
alter type public.document_type add value if not exists 'county_pistol_license';           -- SCG-01 (Branch B)
