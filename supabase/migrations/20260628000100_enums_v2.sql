-- ============================================================================
-- CarryPath V2 · Phase 0 — Foundation hardening
-- Additive only: enables PostGIS, extends two existing enums, and declares the
-- new enums used across the V2 modules (requirements engine, intake/disclosure,
-- marketplace, scheduling, notifications, reference outreach). No table here
-- consumes these yet — later phases (0002+) build on top.
-- Ref: CCW_V2_Data_Model.md §1
-- ============================================================================

-- ── PostGIS (geo-matching for the trainer marketplace; free) ─────────────────
-- Installed into the search-path schema (public) so later migrations can use
-- `geography(point,4326)` unqualified, matching the spec's table DDL.
create extension if not exists postgis;

-- ── Extend existing enums ────────────────────────────────────────────────────
-- Trainer marketplace adds a fourth role alongside client | staff | admin.
alter type user_role add value if not exists 'instructor';

-- Conditional document types referenced by the versioned requirements registry.
-- (Existing values: id, reference_letter, cohabitant_affidavit, social_media_list,
--  safe_photo_open, safe_photo_closed, training_cert, proof_residence.)
alter type document_type add value if not exists 'certificate_of_disposition';
alter type document_type add value if not exists 'cert_relief_disabilities';
alter type document_type add value if not exists 'cert_good_conduct';
alter type document_type add value if not exists 'order_of_protection_copy';
alter type document_type add value if not exists 'dd214';
alter type document_type add value if not exists 'name_change_proof';
alter type document_type add value if not exists 'other_license';
alter type document_type add value if not exists 'affirmation_understanding';
alter type document_type add value if not exists 'safeguard_ack';

-- ── New enums ────────────────────────────────────────────────────────────────
do $$ begin
  create type jurisdiction_key as enum ('nyc','nassau','suffolk','westchester','special_carry');
exception when duplicate_object then null; end $$;

do $$ begin
  create type requirement_sev as enum ('critical','high','watch','long_lead');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_req_status as enum ('na','pending','satisfied','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type disclosure_type as enum ('arrest','summons','order_of_protection','domestic_incident','question_yes');
exception when duplicate_object then null; end $$;

do $$ begin
  create type offer_type as enum ('training','full_assist');
exception when duplicate_object then null; end $$;

do $$ begin
  create type offer_status as enum ('open','matched','accepted','expired','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type engagement_status as enum ('active','completed','cancelled','declined');
exception when duplicate_object then null; end $$;

do $$ begin
  create type slot_type as enum ('classroom_16h','live_fire_2h','combined_18h','consult');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum ('requested','confirmed','cancelled','completed','no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_kind as enum ('info','action_required','reminder','offer','booking','payment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type calendar_provider as enum ('google');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reference_req_status as enum ('pending','sent','opened','submitted','notarized');
exception when duplicate_object then null; end $$;
