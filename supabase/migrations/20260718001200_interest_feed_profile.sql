-- ============================================================================
-- APPLICANT INTEREST FEED — carry the whole instructor profile
--
-- The offer card was thin because the view only exposed name/bio/dcjs_id/price/
-- rating. A first-timer deciding who teaches them to carry a firearm needs the
-- rest: where you teach, what's included, what languages you teach in, whether
-- the range is sorted, and whether they can meet you first.
--
-- CREDENTIAL INTEGRITY: `verified` is now exposed so the UI can gate the
-- "DCJS-credentialed" badge on admin verification. It used to render whenever a
-- dcjs_id string was present, which meant anybody could type a number and look
-- credentialed.
--
-- Still the instructor's OWN public business information. Nothing about the
-- applicant flows the other way — the privacy firewall is untouched.
-- ============================================================================

-- Dropped and recreated rather than CREATE OR REPLACE: replace can only append
-- columns, and `verified` belongs next to the credential it gates.
drop view if exists public.applicant_interest_feed;

create view public.applicant_interest_feed with (security_barrier = true) as
  select
    o.id            as offer_id,
    o.case_id,
    o.type,
    m.instructor_id,
    m.distance_mi,
    m.note,
    m.quoted_price_cents,
    m.responded_at,
    i.name,
    i.bio,
    i.dcjs_id,
    i.verified,
    i.price_18h_cents,
    i.rating_avg,
    i.rating_count,
    i.service_radius_mi,
    i.years_experience,
    i.background,
    i.languages,
    i.website_url,
    i.instagram_handle,
    i.class_format,
    i.typical_class_size,
    i.provides_range,
    i.separate_range_note,
    i.range_fee_included,
    i.ammo_included,
    i.materials_included,
    i.whats_to_bring,
    i.scheduling_notes,
    i.response_time_note,
    i.offers_intro_call,
    i.intro_call_note,
    i.avatar_path
  from public.offer_matches m
  join public.case_offers o on o.id = m.offer_id
  join public.instructors i on i.id = m.instructor_id
  where public.case_visible(o.case_id)
    and m.responded = 'interested'
    and o.status = 'open';

grant select on public.applicant_interest_feed to authenticated;
