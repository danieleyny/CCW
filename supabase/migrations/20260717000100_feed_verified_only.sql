-- ============================================================================
-- Marketplace correctness: the redacted offer feed must exclude UNVERIFIED
-- instructors. The original view scoped rows to the caller's own matches but
-- did not require the instructor to be verified, so a stale match row (e.g. an
-- instructor matched while verified, then un-verified) could still surface
-- redacted case info in their feed. accept_offer() already blocks unverified
-- acceptance; this closes the *visibility* half of the same firewall.
--
-- Matching itself is now two-sided (see lib/marketplace/offers.ts): offers are
-- matched to verified in-radius instructors at creation AND backfilled when an
-- instructor loads their feed, so a later-verified or geo-less case is no longer
-- stranded. Only verified instructors are ever inserted as matches.
-- ============================================================================

create or replace view public.instructor_offer_feed with (security_barrier = true) as
  select
    o.id          as offer_id,
    o.type,
    o.jurisdiction,
    o.area_label,
    m.distance_mi,
    c.stage,
    o.needs_note,
    o.expires_at,
    o.created_at
  from public.offer_matches m
  join public.case_offers o on o.id = m.offer_id
  join public.cases c on c.id = o.case_id
  join public.instructors i on i.id = m.instructor_id
  where i.profile_id = auth.uid()
    and i.verified = true
    and o.status = 'open'
    and m.responded is null
    and (o.expires_at is null or o.expires_at > now());

-- Drop stale match rows for instructors who are not verified (they should never
-- have been matched; the feed now hides them regardless, but keep the data clean).
delete from public.offer_matches m
  using public.instructors i
  where i.id = m.instructor_id and i.verified = false;
