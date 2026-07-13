-- ============================================================================
-- V3 Phase 1b — Correct the legal registry as DATED VERSIONS, and add the
-- missing tracks (renewal, retired-LEO, premises, non-resident).
--
-- Method: the versioned engine working as designed — close each wrong v1 row
-- (effective_to = 2026-07-12) and insert a corrected v2 (effective_from =
-- 2026-07-13). Existing case_requirements keep pointing at the version they
-- were generated from; new cases generate against v2.
--
-- ⚠️ needs_legal_review stays TRUE on every row here. These corrections were
-- verified against NYPD's checklist, 38 RCNY, and DCJS standards (July 2026)
-- but MUST be confirmed by a NY firearms attorney via /admin/legal before
-- client-facing filing use. Do not invent citations; where a source is
-- uncertain the note says so.
-- ============================================================================

-- ── 1. Close the v1 rows being corrected (both jurisdictions) ────────────────
update public.requirements
set effective_to = date '2026-07-12'
where req_code in ('SOC-01','REF-01','TRN-01','FEE-01','DMV-01','RES-01','IDN-04','ARR-01')
  and effective_to is null;

-- ── 2. Corrected v2 rows — shared by nyc + special_carry ─────────────────────
insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, source_url,
   validation_rule, trigger_cond, severity, document_type, effective_from,
   blocking, needs_legal_review)
select
  j.id, v.req_code, v.title, v.description, v.authority, v.source_url,
  v.validation_rule::jsonb, v.trigger_cond, v.severity::requirement_sev,
  v.document_type::document_type, date '2026-07-13', v.blocking, true
from (values
  -- SOC-01 — the CCIA social-media clause is PERMANENTLY ENJOINED (2d Cir.
  -- Antonyuk v. James; cert denied Apr 2025; NY consented to a permanent
  -- injunction 2026). NYPD's published checklist still lists it — stale PDF.
  -- Advisory only; can never block filing.
  ('SOC-01','Social-media disclosure (OPTIONAL — requirement enjoined)',
   'The CCIA''s social-media disclosure requirement is permanently enjoined and unenforceable (Antonyuk v. James; injunction final 2026). NYPD''s published checklist may still list it — that PDF is stale. Providing a list is optional; some applicants include one as a candor gesture. This item never blocks filing.',
   'P.L. §400.00(1)(o)(iv) — ENJOINED (Antonyuk v. James)', 'https://licensing.nypdonline.org/new-app-instruction/',
   '{"kind":"document","document_type":"social_media_list","optional":true}','always','watch','social_media_list', false),

  -- REF-01 — carry: 4 references, at least 2 non-family; NYPD operationalizes
  -- as 2 references + 2 notarized letters. RENEWALS ARE EXEMPT (§ 5-05(c)).
  ('REF-01','Character references — 4 total, at least 2 non-family',
   'Four character references for carry / special carry (38 RCNY §5-03(a)(1)): at least two must be non-family, and none may be in law enforcement. NYPD operationalizes this as two references plus two notarized reference letters. Renewals are exempt from references entirely (§5-05(c)).',
   '38 RCNY §5-03(a)(1); §5-05(c) (renewal exemption)', 'https://licensing.nypdonline.org/new-app-instruction/',
   '{"kind":"reference_count","min":4,"min_non_family":2}','carry_not_renewal','high','reference_letter', true),

  -- TRN-01 — 16 hr classroom + 2 hr live-fire, CARRY ONLY, and it EXPIRES:
  -- must be completed within 6 months before submission.
  ('TRN-01','16-hr classroom + 2-hr live-fire training (expires after 6 months)',
   'CCIA-compliant course from a DCJS-approved instructor: 16 hours in-person classroom plus 2 hours live-fire; written test ≥80%; live-fire qualification 4-of-5 at 4 yards on a 25½"×11" target. Carry licenses only — not premises. MUST be completed within 6 months before submission (§5-03(a)(2)) — training is a decaying asset; start it on day one. Long-lead.',
   'P.L. §400.00(1)(o); 38 RCNY §5-03(a)(2); DCJS minimum standards', 'https://www.criminaljustice.ny.gov/',
   '{"kind":"document","document_type":"training_cert","expires_months":6,"written_min_pct":80,"livefire":"4of5@4yd"}','carry_not_renewal','long_lead','training_cert', true),

  -- FEE-01 — amounts live in the fees table (config-driven), not in prose.
  ('FEE-01','Application + fingerprint fees ready at filing',
   'NYPD application fee (currently $340 — new AND renewal) paid to the NYPD License Division, plus the NYS DCJS fingerprint fee (currently $88.25) paid separately. No cash, no personal checks; all fees non-refundable. Retired law enforcement: application fee waived, fingerprint fee still owed. Current amounts are maintained in the platform fee schedule.',
   'P.L. §400.00(14); NYPD portal fee schedule', 'https://licensing.nypdonline.org/new-app-instruction/',
   '{"kind":"fee","config":"fees","keys":["nypd_application","dcjs_fingerprint"]}','always','high', null, true),

  -- DMV-01 — lifetime abstract, EVERY state of residence in the past 5 years.
  ('DMV-01','Lifetime driving abstract — every state of residence (past 5 years)',
   'A lifetime driving abstract from every state you have resided in during the past five years (38 RCNY §5-05(b)(12)) — not just New York. NYS abstracts are available from DMV online.',
   '38 RCNY §5-05(b)(12)', 'https://dmv.ny.gov/dmv-records/get-my-own-driving-record-abstract',
   '{"kind":"attestation","field":"dmv_abstract_all_states"}','always','high', null, true),

  -- RES-01 — cell phone bills are NOT accepted.
  ('RES-01','Proof of residence (cell phone bills NOT accepted)',
   'A recent utility, cable, landline, or gas bill at the application address — CELL PHONE BILLS ARE NOT ACCEPTED — or a lease/deed PLUS a filed NYS tax return showing the same address.',
   '38 RCNY §5-02; NYPD checklist', 'https://licensing.nypdonline.org/new-app-instruction/',
   '{"kind":"document","document_type":"proof_residence","excluded":["cell_phone_bill"]}','always','high','proof_residence', true),

  -- IDN-04 — the photo spec is machine-checkable; validator lands in Phase 4.
  ('IDN-04','Photo — square, 600×600–1200×1200 px, taken within 30 days',
   'A color photo taken within the last 30 days: square aspect, between 600×600 and 1200×1200 pixels, chest-up, facing the camera, nothing obscuring identification (no hats/sunglasses). This is checked mechanically before filing.',
   '38 RCNY §5-05(b)(1); NYPD portal spec', 'https://licensing.nypdonline.org/new-app-instruction/',
   '{"kind":"photo_spec","min_px":600,"max_px":1200,"max_age_days":30,"aspect":"square"}','always','high', null, true),

  -- ARR-01 — sealed/dismissed ARE disclosed; felony adds a Certificate of
  -- Relief from Disabilities.
  ('ARR-01','Certificate of Disposition + affirmed statement (EVERY arrest/summons)',
   'For every arrest and every criminal/OATH/TAB summons — EVEN IF dismissed, sealed, nullified, or ACD''d: a Certificate of Disposition from the court plus an affirmed written statement of what happened. Sealed arrests ARE disclosed to the License Division (CPL Art. 160 carve-out). A felony or serious-offense conviction additionally requires a Certificate of Relief from Disabilities. Candor is the requirement: an undisclosed item found in the background check is far more damaging than the event itself.',
   'P.L. §400.00(1)(b); CPL Art. 160; 38 RCNY §5-10(e),(n)', 'https://licensing.nypdonline.org/new-app-instruction/',
   '{"kind":"document_plus_narrative","document_type":"certificate_of_disposition","include_sealed":true}','if_arrest_hx','critical','certificate_of_disposition', true)
) as v(req_code, title, description, authority, source_url, validation_rule, trigger_cond, severity, document_type, blocking)
cross join (select id from public.jurisdiction_profiles where key in ('nyc','special_carry')) as j;

-- ── 3. New rows — both jurisdictions ─────────────────────────────────────────
insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, source_url,
   validation_rule, trigger_cond, severity, document_type, effective_from,
   blocking, needs_legal_review)
select
  j.id, v.req_code, v.title, v.description, v.authority, v.source_url,
  v.validation_rule::jsonb, v.trigger_cond, v.severity::requirement_sev,
  v.document_type::document_type, date '2026-07-13', v.blocking, true
from (values
  -- Renewal: no references, no 16+2 — but a fresh 2-hr live-fire cert ≤6 months old.
  ('RNW-01','Renewal live-fire certificate (2-hr, dated within 6 months)',
   'Renewal applicants complete a 2-hour live-fire refresher; the certificate must be dated within 6 months of the renewal submission. Renewals need no character references (§5-05(c)) and pay the same $340 application fee.',
   '38 RCNY §5-05(c); P.L. §400.00(1)(o)', 'https://licensing.nypdonline.org/renew-instruction/',
   '{"kind":"document","document_type":"training_cert","expires_months":6,"renewal":true}','if_renewal','long_lead','training_cert', true),

  -- Retired law enforcement — separate document set; application fee waived.
  ('LEO-01','"Good Guy" letter (PD 643-155)',
   'Letter of Good Standing / "Good Guy" letter (PD 643-155) from the applicant''s former agency, confirming retirement in good standing.',
   'NYPD License Division retired-officer procedure', 'https://licensing.nypdonline.org/',
   '{"kind":"document","document_type":"leo_good_guy_letter"}','if_retired_leo','high','leo_good_guy_letter', true),
  ('LEO-02','Property Receipt / Discontinuance of Service (PD 520-013)',
   'PD 520-013 documenting return of service equipment / discontinuance of service.',
   'NYPD License Division retired-officer procedure', 'https://licensing.nypdonline.org/',
   '{"kind":"document","document_type":"leo_property_receipt"}','if_retired_leo','high','leo_property_receipt', true),
  ('LEO-03','Certificate of Service on agency letterhead',
   'Certificate of Service on the former agency''s letterhead (dates of service, rank, separation status). The NYPD application fee is waived for retired law enforcement; the DCJS fingerprint fee is still owed.',
   'NYPD License Division retired-officer procedure', 'https://licensing.nypdonline.org/',
   '{"kind":"document","document_type":"leo_cert_of_service"}','if_retired_leo','high','leo_cert_of_service', true)
) as v(req_code, title, description, authority, source_url, validation_rule, trigger_cond, severity, document_type, blocking)
cross join (select id from public.jurisdiction_profiles where key in ('nyc','special_carry')) as j;

-- ── 4. NYC-only: the premises-business track ─────────────────────────────────
insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, source_url,
   validation_rule, trigger_cond, severity, document_type, effective_from,
   blocking, needs_legal_review)
select
  (select id from public.jurisdiction_profiles where key = 'nyc'),
  v.req_code, v.title, v.description, v.authority, v.source_url,
  v.validation_rule::jsonb, v.trigger_cond, v.severity::requirement_sev,
  v.document_type::document_type, date '2026-07-13', v.blocking, true
from (values
  ('REF-02','Character references — 2, non-family (premises)',
   'Premises licenses require two character references, neither of whom may be family (38 RCNY §5-05(b)(8)). Renewals are exempt.',
   '38 RCNY §5-05(b)(8); §5-05(c)', 'https://licensing.nypdonline.org/',
   '{"kind":"reference_count","min":2,"min_non_family":2}','premises_not_renewal','high','reference_letter', true),
  ('PRM-01','Business documentation (premises business)',
   'For a premises-business license: certificate of incorporation / DBA filing, proof of business address, and two photographs of the installed safe — door open and door closed, showing the full safe (no stock images).',
   '38 RCNY §5-05; NYPD checklist', 'https://licensing.nypdonline.org/',
   '{"kind":"document_set","items":["business_docs","safe_photo_open","safe_photo_closed"]}','premises_only','high', null, true)
) as v(req_code, title, description, authority, source_url, validation_rule, trigger_cond, severity, document_type, blocking);

-- ── 5. Special-carry-only: the non-resident track (38 RCNY §5-03(b), eff. 1/5/2025)
insert into public.requirements
  (jurisdiction_id, req_code, title, description, authority, source_url,
   validation_rule, trigger_cond, severity, document_type, effective_from,
   blocking, needs_legal_review)
select
  (select id from public.jurisdiction_profiles where key = 'special_carry'),
  v.req_code, v.title, v.description, v.authority, v.source_url,
  v.validation_rule::jsonb, v.trigger_cond, v.severity::requirement_sev,
  v.document_type::document_type, date '2026-07-13', v.blocking, true
from (values
  ('OOS-01','Out-of-state background form — every jurisdiction of residence (5 years)',
   'The out-of-state background-investigation form must be completed by LOCAL LAW ENFORCEMENT in every jurisdiction the applicant has resided in during the last five years (38 RCNY §5-03(b), effective 1/5/2025). Long-lead: each agency moves at its own pace — start immediately.',
   '38 RCNY §5-03(b) (eff. 1/5/2025)', 'https://licensing.nypdonline.org/',
   '{"kind":"document","document_type":"oos_background_form","per":"jurisdiction_of_residence_5yr"}','always','long_lead','oos_background_form', true),
  ('OOS-02','Disclosure of firearms licenses held elsewhere',
   'Disclose every firearms license or permit held in any other jurisdiction, current or prior.',
   '38 RCNY §5-03(b)', 'https://licensing.nypdonline.org/',
   '{"kind":"attestation","field":"other_licenses_disclosed"}','always','high', null, true),
  ('SPC-01','Special Carry validity depends on the underlying county license',
   'A Special Carry license is valid only while the underlying county license remains valid — it voids automatically if the county license lapses. Advisory: track both expirations together.',
   '38 RCNY §5-25 (validity dependency)', 'https://licensing.nypdonline.org/',
   '{"kind":"advisory"}','always','watch', null, false)
) as v(req_code, title, description, authority, source_url, validation_rule, trigger_cond, severity, document_type, blocking);
