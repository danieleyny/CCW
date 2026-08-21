-- ============================================================================
-- SPONSORED-APPLICANT PORTAL · Phase 2b — the Carry Guard requirement set
--
-- Adds the armed-guard requirement rows and re-versions the three Concealed/
-- Special-Carry items that do NOT belong on a Carry Guard file (16+2 training,
-- the extra references, the social-media list) so they no longer fire for an
-- armed-guard case — using the versioned engine (close v2, insert a v3 whose
-- trigger is a strict refinement, equivalent for every existing non-armed case).
--
-- ⚠️ needs_legal_review = true on every row: the Carry Guard set is a best-effort
-- assembly from 38 RCNY / DCJS guard-licensing rules and MUST be confirmed by a
-- NY firearms attorney via /admin/legal before client-facing filing use.
--
-- Two new generator flags drive conditionals (populated by resolveArmedTrack):
--   isArmedGuard, needsPreLicenseExemption (PLE-01), needsCountyLicenseDoc (SCG-01).
-- Sponsor-owned rows use trigger 'sponsor_packet' and are seeded by
-- materializeSponsorPacket(), NOT the generic generator (which excludes party='sponsor').
-- ============================================================================

-- ── 1. Sponsor-owned company packet (nyc carrier; seeded by the packet helper) ─
-- party='sponsor', applicant_scope='progress' (applicant sees row+status, never
-- the file), concierge_scope='hidden' (an engaged trainer never sees the packet).
insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, source_url,
   validation_rule, trigger_cond, severity, document_type, effective_from,
   blocking, needs_legal_review, party, applicant_scope, concierge_scope)
select
  (select id from public.jurisdiction_profiles where key = 'nyc'),
  v.req_code, v.title, v.description, v.authority, v.source_url,
  v.validation_rule::jsonb, 'sponsor_packet', v.severity::requirement_sev,
  v.document_type::public.document_type, date '2026-08-21',
  v.blocking, true, 'sponsor'::public.req_party, 'progress'::public.concierge_scope, 'hidden'::public.concierge_scope
from (values
  ('SPN-01','Carry Guard company form','The sponsoring company''s Carry Guard application form, completed and notarised where required.',
   '38 RCNY §5-03; NYPD Carry Guard procedure','https://licensing.nypdonline.org/',
   '{"kind":"document","document_type":"carry_guard_company_form","notarize_if_required":true}','high','carry_guard_company_form', true),
  ('SPN-02','Letter of necessity','A letter on company letterhead stating the armed duties, the business need, the anticipated start date, the work locations / assignment type, and that the position is at least 20 hours per week.',
   'NYPD Carry Guard procedure','https://licensing.nypdonline.org/',
   '{"kind":"document","document_type":"letter_of_necessity","min_hours_week":20}','high','letter_of_necessity', true),
  ('SPN-03','20-hour worksheet','A worksheet documenting at least 20 hours per week, consistent with the letter of necessity.',
   'NYPD Carry Guard procedure','https://licensing.nypdonline.org/',
   '{"kind":"document","document_type":"sponsor_hours_worksheet","consistent_with":"SPN-02"}','high','sponsor_hours_worksheet', true),
  ('SPN-04','Watch, Guard or Patrol Agency licence','A copy of the company''s Watch, Guard or Patrol Agency licence, showing the licence number and expiry date.',
   'NYS GBL Art. 7-A; NYPD Carry Guard procedure','https://dos.ny.gov/watch-guard-or-patrol-agency',
   '{"kind":"document","document_type":"wgp_agency_license"}','high','wgp_agency_license', true),
  ('SPN-05','Gun custodian record','The company''s designated gun custodian: name, contact, and NYPD licence number. Structured company data, not a file upload.',
   'NYPD Carry Guard procedure','https://licensing.nypdonline.org/',
   '{"kind":"structured","fields":["custodian_name","custodian_email","custodian_phone","custodian_license_number"]}','high', null, true),
  ('SPN-06','Sponsored position confirmation','Written confirmation of the sponsored position: job title, assignment site, and hours per week.',
   'NYPD Carry Guard procedure','https://licensing.nypdonline.org/',
   '{"kind":"document","document_type":"sponsored_position_confirmation"}','high','sponsored_position_confirmation', true),
  ('SPN-07','Firearm details','Conditional: whether the firearm is company-issued or personal, plus make, model, calibre, serial number, and approved storage. Provide when the assigned firearm is known.',
   'NYPD Carry Guard procedure','https://licensing.nypdonline.org/',
   '{"kind":"document","document_type":"firearm_specification","optional":true}','watch','firearm_specification', false)
) as v(req_code, title, description, authority, source_url, validation_rule, severity, document_type, blocking);

-- ── 2. Applicant-owned armed-guard credentials (shared: nyc + special_carry) ──
insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, source_url,
   validation_rule, trigger_cond, severity, document_type, effective_from,
   blocking, needs_legal_review, concierge_scope)
select
  j.id, v.req_code, v.title, v.description, v.authority, v.source_url,
  v.validation_rule::jsonb, v.trigger_cond, v.severity::requirement_sev,
  v.document_type::public.document_type, date '2026-08-21',
  v.blocking, true, 'full'::public.concierge_scope
from (values
  ('GRD-01','NYS security guard registration card (front and back)','Your NYS Division of Criminal Justice Services security guard registration card — clear images of the front and back.',
   'NYS GBL Art. 7-A; 19 NYCRR Part 170','https://dos.ny.gov/security-guard','{"kind":"document","document_type":"security_guard_registration"}','carry_guard_only','high','security_guard_registration', true),
  ('GRD-02','8-hour pre-assignment training certificate','Certificate for the 8-hour pre-assignment security guard training course.',
   '19 NYCRR §170.2','https://dos.ny.gov/security-guard-training','{"kind":"document","document_type":"guard_preassignment_cert"}','carry_guard_only','high','guard_preassignment_cert', true),
  ('GRD-03','16-hour on-the-job training certificate','Certificate for the 16-hour on-the-job security guard training.',
   '19 NYCRR §170.2','https://dos.ny.gov/security-guard-training','{"kind":"document","document_type":"guard_ojt_cert"}','carry_guard_only','high','guard_ojt_cert', true),
  ('GRD-04','Current annual 8-hour in-service certificate','Proof of the current annual 8-hour in-service security guard training.',
   '19 NYCRR §170.2','https://dos.ny.gov/security-guard-training','{"kind":"document","document_type":"guard_inservice_cert"}','carry_guard_only','high','guard_inservice_cert', true),
  ('FRM-01','47-hour firearms course certificate','Certificate for the 47-hour armed-guard firearms training course.',
   'NYS GBL §89-g; 19 NYCRR Part 170','https://dos.ny.gov/armed-guard-training','{"kind":"document","document_type":"firearms_course_cert"}','carry_guard_only','long_lead','firearms_course_cert', true),
  ('CSC-01','Child support certification form','The child support certification form required with the application.',
   'NYPD application; NY Family Court Act','https://licensing.nypdonline.org/','{"kind":"document","document_type":"child_support_cert"}','carry_guard_only','high','child_support_cert', true),
  -- PLE-01 — the pre-licence exemption (38 RCNY §5-09) needs an AUTHORISED
  -- INSTRUCTOR''s signed statement, filed WITH the application. Modelled as an
  -- obtain (the instructor provides the signed statement); a future version can
  -- generate-and-instructor-sign it in-platform.
  ('PLE-01','Pre-licence exemption statement (38 RCNY §5-09)','An authorised instructor''s signed statement supporting the 38 RCNY §5-09 pre-licence exemption, so you may enrol in the 47-hour course before the licence issues. Filed with the application. Only required if you do not already hold a pistol licence.',
   '38 RCNY §5-09','https://licensing.nypdonline.org/','{"kind":"document","document_type":"prelicense_exemption","signed_by":"instructor"}','if_pre_license_exemption','high','prelicense_exemption', true)
) as v(req_code, title, description, authority, source_url, validation_rule, trigger_cond, severity, document_type, blocking)
cross join (select id from public.jurisdiction_profiles where key in ('nyc','special_carry')) as j;

-- ── 3. Branch B only (special_carry): the home-county pistol licence ─────────
insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, source_url,
   validation_rule, trigger_cond, severity, document_type, effective_from,
   blocking, needs_legal_review, concierge_scope)
select
  (select id from public.jurisdiction_profiles where key = 'special_carry'),
  'SCG-01','Home-county pistol licence (front and back)',
  'Your active pistol licence issued by your home county, front and back. A Special Carry Guard licence is built on top of an existing county licence and is valid only while that licence remains active.',
  '38 RCNY §5-25; P.L. §400.00(6)','https://licensing.nypdonline.org/',
  '{"kind":"document","document_type":"county_pistol_license","must_be_active":true}','if_county_license_doc','high','county_pistol_license', date '2026-08-21',
  true, true, 'full'::public.concierge_scope;

-- ── 4. References for armed guards: base TWO (reuse REF-02), broadened ───────
-- Close the nyc REF-02 v2 (premises_not_renewal) and re-issue it (nyc) plus a new
-- special_carry copy, both firing for premises OR armed guard: 'two_refs_not_renewal'.
update public.requirements set effective_to = date '2026-08-20'
 where req_code = 'REF-02' and effective_to is null;

insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, source_url,
   validation_rule, trigger_cond, severity, document_type, effective_from,
   blocking, needs_legal_review, concierge_scope, party, applicant_scope)
select
  j.id, 'REF-02',
  'Character references — 2, non-family',
  'Two character references, neither of whom may be family (38 RCNY §5-05(b)(8)). Premises and Carry Guard licences require the base two references. Renewals are exempt.',
  '38 RCNY §5-05(b)(8); §5-05(c)','https://licensing.nypdonline.org/',
  '{"kind":"reference_count","min":2,"min_non_family":2}','two_refs_not_renewal','high','reference_letter', date '2026-08-21',
  true, true, 'progress'::public.concierge_scope, 'applicant'::public.req_party, 'full'::public.concierge_scope
from (select id from public.jurisdiction_profiles where key in ('nyc','special_carry')) as j;

-- ── 5. Re-version the three items that do NOT belong on a Carry Guard file ───
-- Copy each live row verbatim (SELECT), overriding only trigger_cond +
-- effective_from, then close the old version. The new triggers are strict
-- refinements: identical for every non-armed case, absent for an armed guard.
--   REF-01 / TRN-01 : carry_not_renewal      → carry_not_renewal_not_armed
--   SOC-01          : always                 → unless_armed
do $$
declare r record; new_trigger text;
begin
  for r in
    select * from public.requirements
     where req_code in ('REF-01','TRN-01','SOC-01') and effective_to is null
  loop
    new_trigger := case r.req_code
      when 'SOC-01' then 'unless_armed'
      else 'carry_not_renewal_not_armed'
    end;
    insert into public.requirements
      (jurisdiction_id, req_code, title, description, authority, source_url,
       validation_rule, trigger_cond, severity, document_type, effective_from,
       effective_to, blocking, needs_legal_review, concierge_scope, party, applicant_scope)
    values
      (r.jurisdiction_id, r.req_code, r.title, r.description, r.authority, r.source_url,
       r.validation_rule, new_trigger, r.severity, r.document_type, date '2026-08-21',
       null, r.blocking, r.needs_legal_review, r.concierge_scope, r.party, r.applicant_scope);
  end loop;

  update public.requirements set effective_to = date '2026-08-20'
   where req_code in ('REF-01','TRN-01','SOC-01')
     and effective_to is null
     and effective_from < date '2026-08-21';
end $$;
