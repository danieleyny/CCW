-- ============================================================================
-- THE GREEN DOT NEEDS "WHEN WAS THIS MATCHED TO ME"
--
-- Counting new requests by joining offer_matches → case_offers doesn't work for
-- an instructor: case_offers is behind case_visible(), which is false for them
-- by design. That's the privacy firewall doing its job, and it's exactly why
-- instructor_offer_feed exists — so the count has to come from the view too.
--
-- The view exposed o.created_at (when the APPLICANT posted). What the dot needs
-- is when the request became visible to THIS instructor: a request posted last
-- week but matched to them a minute ago (they just got verified, or backfill
-- picked it up) is new to them.
-- ============================================================================

drop view if exists public.instructor_offer_feed;

create view public.instructor_offer_feed with (security_barrier = true) as
  select
    o.id          as offer_id,
    o.type,
    o.jurisdiction,
    o.area_label,
    m.distance_mi,
    c.stage,
    o.needs_note,
    o.expires_at,
    o.created_at,
    m.created_at  as matched_at,
    m.responded
  from public.offer_matches m
  join public.case_offers o on o.id = m.offer_id
  join public.cases c on c.id = o.case_id
  join public.instructors i on i.id = m.instructor_id
  where i.profile_id = auth.uid()
    and i.verified = true
    and o.status = 'open'
    and (m.responded is null or m.responded = 'interested')
    and (o.expires_at is null or o.expires_at > now());

grant select on public.instructor_offer_feed to authenticated;
