-- ============================================================================
-- Two-phase marketplace: instructor EXPRESSES INTEREST → applicant CHOOSES.
--
-- Before: the first instructor to Accept an offer was bound to the case and the
-- offer closed — the applicant had no say. Now an instructor signals interest
-- (offer stays open), the applicant sees everyone interested with their profile
-- + distance, and picks ONE. Choosing creates the engagement and declines the
-- rest. Reuses offer_matches.responded (free text): null → interested → accepted
-- / declined. Engagement creation moves out of accept_offer into choose_instructor.
-- ============================================================================

-- Interest carries an optional note + price quote from the instructor.
alter table public.offer_matches
  add column if not exists note               text,
  add column if not exists quoted_price_cents integer;

-- ── Instructor: express interest (does NOT create an engagement) ─────────────
create or replace function public.express_interest(
  p_offer_id uuid,
  p_note text default null,
  p_price_cents integer default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_instructor public.instructors%rowtype;
  v_offer      public.case_offers%rowtype;
begin
  select * into v_instructor from public.instructors where profile_id = auth.uid();
  if v_instructor.id is null then raise exception 'Not an instructor account'; end if;
  if not v_instructor.verified then raise exception 'Instructor is not verified'; end if;

  select * into v_offer from public.case_offers where id = p_offer_id;
  if v_offer.id is null then raise exception 'Offer not found'; end if;
  if v_offer.status <> 'open' then raise exception 'This request is no longer open'; end if;

  if not exists (
    select 1 from public.offer_matches where offer_id = p_offer_id and instructor_id = v_instructor.id
  ) then
    raise exception 'You were not matched to this request';
  end if;

  update public.offer_matches
     set responded = 'interested', responded_at = now(),
         note = p_note, quoted_price_cents = p_price_cents
   where offer_id = p_offer_id and instructor_id = v_instructor.id;
end $$;
grant execute on function public.express_interest(uuid, text, integer) to authenticated;

-- ── Applicant: choose one interested instructor ─────────────────────────────
create or replace function public.choose_instructor(p_offer_id uuid, p_instructor_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_offer         public.case_offers%rowtype;
  v_engagement_id uuid;
begin
  select * into v_offer from public.case_offers where id = p_offer_id for update;
  if v_offer.id is null then raise exception 'Offer not found'; end if;
  if not public.case_visible(v_offer.case_id) then raise exception 'Not authorized'; end if;
  if v_offer.status <> 'open' then raise exception 'This request is no longer open'; end if;

  if not exists (
    select 1 from public.offer_matches
    where offer_id = p_offer_id and instructor_id = p_instructor_id and responded = 'interested'
  ) then
    raise exception 'That instructor is not available for this request';
  end if;

  insert into public.engagements (case_id, instructor_id, offer_id, type, status, scope_full_assist)
  values (v_offer.case_id, p_instructor_id, p_offer_id, v_offer.type, 'active', false)
  returning id into v_engagement_id;

  update public.offer_matches set responded = 'accepted', responded_at = now()
    where offer_id = p_offer_id and instructor_id = p_instructor_id;
  update public.offer_matches set responded = 'declined', responded_at = now()
    where offer_id = p_offer_id and instructor_id <> p_instructor_id
      and (responded is null or responded = 'interested');

  update public.case_offers
    set status = 'accepted', accepted_engagement_id = v_engagement_id, updated_at = now()
    where id = p_offer_id;

  insert into public.activity_log (actor, action, case_id, entity, entity_id, detail)
  values (auth.uid(), 'offer.chosen', v_offer.case_id, 'engagement', v_engagement_id,
          jsonb_build_object('offer_id', p_offer_id, 'instructor_id', p_instructor_id));

  return v_engagement_id;
end $$;
grant execute on function public.choose_instructor(uuid, uuid) to authenticated;

-- ── Instructor feed: keep OWN 'interested' offers visible (awaiting applicant) ─
-- and expose `responded` so the UI can split "new" vs "you're interested".
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
    o.created_at,
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

-- ── Applicant feed: the instructors who expressed interest in my open offers ──
-- Security-barrier + case_visible scopes rows to the caller's own case; exposes
-- only the instructor's PUBLIC profile (no cross-applicant leakage).
create or replace view public.applicant_interest_feed with (security_barrier = true) as
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
    i.price_18h_cents,
    i.rating_avg,
    i.rating_count,
    i.service_radius_mi
  from public.offer_matches m
  join public.case_offers o on o.id = m.offer_id
  join public.instructors i on i.id = m.instructor_id
  where public.case_visible(o.case_id)
    and m.responded = 'interested'
    and o.status = 'open';

grant select on public.applicant_interest_feed to authenticated;
