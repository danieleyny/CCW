-- ============================================================================
-- CarryPath V2 · Phase 1 — Requirements registry seed (data migration)
--
-- ⚠️  VERIFY-LIVE: These authority citations, validation rules, and severities
-- are a BEST-EFFORT starting registry assembled from the NYC CCW process and
-- public statute/rule references. NYC is a discretionary, litigation-driven
-- jurisdiction (Antonyuk; Int. 0372-2026) — reference counts, the social-media
-- requirement, and fees shift. Confirm every row against the live NYPD License
-- Division portal and a NY firearms attorney before client-facing filing use.
-- The versioned engine is the mechanism to correct these as DATED DATA EDITS
-- (close a row's effective_to, insert a new dated version) — never a code change.
--
-- Seeds: nyc (active) + special_carry (active, cloned) as version 1
-- (effective_from = 2026-06-01, in force at launch); nassau/suffolk/westchester
-- stubbed inactive.
-- Ref: CCW_V2_Data_Model.md §10
-- ============================================================================

-- ── Jurisdiction profiles ────────────────────────────────────────────────────
insert into public.jurisdiction_profiles (key, label, issuing_authority, active) values
  ('nyc',           'New York City',                'NYPD License Division',                 true),
  ('special_carry', 'Special / Non-Resident Carry', 'NYS / issuing county licensing officer', true),
  ('nassau',        'Nassau County',                'Nassau County Police Dept. (future)',   false),
  ('suffolk',       'Suffolk County',               'Suffolk County Police Dept. (future)',  false),
  ('westchester',   'Westchester County',           'Westchester County (future)',           false)
on conflict (key) do nothing;

-- ── NYC registry — version 1 (effective 2026-06-01) ─────────────────────────
insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, validation_rule, trigger_cond, severity, document_type, effective_from)
select
  (select id from public.jurisdiction_profiles where key = 'nyc'),
  v.req_code, v.title, v.description, v.authority,
  v.validation_rule::jsonb, v.trigger_cond, v.severity::requirement_sev,
  v.document_type::document_type, date '2026-06-01'
from (values
  ('ELG-01','Applicant is 21 or older','NYC carry licenses require the applicant be at least 21.','P.L. §400.00(1)(a)','{"kind":"attestation","field":"age_21_plus"}','always','critical', null),
  ('ELG-02','NYC residence or principal place of business','Establishes NYPD License Division jurisdiction; non-residents route to the Special Carry track.','38 RCNY §5-02; P.L. §400.00(3)(a)','{"kind":"attestation","field":"nyc_nexus"}','always','critical', null),
  ('ELG-03','No statutory disqualifiers','No felony or serious-offense conviction, disqualifying mental-health adjudication, active order of protection, or unlawful drug use.','P.L. §400.00(1); 18 U.S.C. §922(g)','{"kind":"attestation","field":"no_disqualifiers"}','always','critical', null),
  ('TRN-01','18-hour firearms safety training','16-hour classroom plus 2-hour live-fire range from a DCJS-approved Duly Authorized Instructor. Long-lead — start on day one.','P.L. §400.00(1)(o); DCJS model curriculum','{"kind":"document","document_type":"training_cert"}','carry_only','long_lead','training_cert'),
  ('IDN-01','Government-issued photo ID','Driver license, non-driver ID, or passport.','38 RCNY §5-03','{"kind":"document","document_type":"id"}','always','high','id'),
  ('IDN-02','Proof of date of birth','Birth certificate or passport establishing date of birth.','38 RCNY §5-03','{"kind":"document","document_type":"id"}','always','high','id'),
  ('IDN-03','Proof of citizenship or lawful status','U.S. passport, birth certificate, or immigration documentation.','P.L. §400.00(1); 38 RCNY §5-03','{"kind":"attestation","field":"status_proof"}','always','high', null),
  ('IDN-04','Passport-style photographs','Two color passport photos per NYPD specification.','38 RCNY §5-03','{"kind":"attestation","field":"passport_photos"}','always','watch', null),
  ('RES-01','Proof of residence','Recent utility bill, lease, or equivalent at the application address.','38 RCNY §5-02','{"kind":"document","document_type":"proof_residence"}','always','high','proof_residence'),
  ('DMV-01','Driving abstract / DMV record','NYS DMV abstract supporting identity and record review.','NYPD License Division application','{"kind":"attestation","field":"dmv_abstract"}','always','watch', null),
  ('COH-01','Cohabitant affidavit for each adult','A notarized affidavit for every household member 18+, or an "I live alone" statement.','38 RCNY §5-03; NYC safe-storage policy','{"kind":"cohabitant_affidavits"}','if_cohabitants','high','cohabitant_affidavit'),
  ('SAF-01','Safe-storage evidence','Photographs of the gun safe (door open and closed) plus a safe-storage attestation.','P.L. §265.45; NYC Admin Code §10-312','{"kind":"safe_photos"}','always','high','safe_photo_closed'),
  ('AFF-01','Affirmation of understanding','Signed affirmation acknowledging NYC carry rules and prohibited/sensitive locations.','38 RCNY §5-03; P.L. §400.00(0-a)','{"kind":"document","document_type":"affirmation_understanding"}','always','high','affirmation_understanding'),
  ('REF-01','Four character references','Four references attesting to good moral character (count is contested and may change with litigation/Council action).','38 RCNY §5-03 (contested)','{"kind":"reference_count","min":4}','always','high','reference_letter'),
  ('SOC-01','Three-year social-media list','All current and former social-media accounts for the past three years.','P.L. §400.00(1)(o)(iv) (CCIA 2022 — contested, Antonyuk)','{"kind":"document","document_type":"social_media_list"}','always','watch','social_media_list'),
  ('DSC-01','Complete and truthful disclosure questionnaire','Every question 10–28 answered; non-disclosure is more damaging than the underlying event.','P.L. §400.00(1); NYPD application','{"kind":"attestation","field":"disclosure_complete"}','always','critical', null),
  ('ARR-01','Certificate of Disposition + narrative (each arrest)','For every arrest or summons (even sealed/dismissed/ACD): a Certificate of Disposition and a written explanation.','P.L. §400.00(1)(b); CPL §160.50','{"kind":"document_plus_narrative","document_type":"certificate_of_disposition"}','if_arrest_hx','critical','certificate_of_disposition'),
  ('OOP-01','Order of protection copy + narrative','A copy of every order of protection (past or present) and a written explanation.','18 U.S.C. §922(g)(8); P.L. §400.00(1)','{"kind":"document_plus_narrative","document_type":"order_of_protection_copy"}','if_oop_hx','critical','order_of_protection_copy'),
  ('DIR-01','Domestic-incident disclosure + narrative','Disclosure and written explanation for any domestic-incident report.','P.L. §400.00(1)','{"kind":"narrative"}','if_dir_hx','high', null),
  ('MIL-01','Military discharge documentation','DD-214 (or equivalent) for applicants with military service.','38 RCNY §5-03','{"kind":"document","document_type":"dd214"}','if_veteran','watch','dd214'),
  ('GMC-01','Certificate of Good Conduct','Lawful permanent residents with under 7 years U.S. residence provide a Certificate of Good Conduct.','P.L. §400.00(1); 38 RCNY §5-03','{"kind":"document","document_type":"cert_good_conduct"}','if_lpr_under_7yr','high','cert_good_conduct'),
  ('NAM-01','Proof of name change','Court order or documentation for any legal name change.','38 RCNY §5-03','{"kind":"document","document_type":"name_change_proof"}','if_name_change','watch','name_change_proof'),
  ('QUE-01','Written explanation for each "yes"','A written narrative for every "yes" answered on questions 10–28.','P.L. §400.00(1); NYPD application','{"kind":"narrative"}','if_any_q_yes','high', null),
  ('FEE-01','Application and fingerprinting fees','Approx. $340 application fee plus approx. $88.25 fingerprinting fee, ready at filing.','P.L. §400.00(15); NYC Admin Code','{"kind":"fee","application_cents":34000,"fingerprint_cents":8825}','always','high', null),
  ('FMT-01','Upload format compliance','Every upload under 5 MB, an allowed type (PDF/JPG/PNG/BMP/TIF), with a sanitized filename — the NYPD portal silently rejects bad names.','NYPD online application portal requirements','{"kind":"file_format","max_mb":5,"exts":["pdf","jpg","jpeg","png","bmp","tif","tiff"]}','always','watch', null)
) as v(req_code, title, description, authority, validation_rule, trigger_cond, severity, document_type);

-- ── Special Carry — clone the NYC version-1 set (authority noted as cloned) ──
insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, validation_rule, trigger_cond, severity, document_type, effective_from)
select
  (select id from public.jurisdiction_profiles where key = 'special_carry'),
  r.req_code, r.title, r.description, r.authority, r.validation_rule, r.trigger_cond, r.severity, r.document_type, r.effective_from
from public.requirements r
where r.jurisdiction_id = (select id from public.jurisdiction_profiles where key = 'nyc');
