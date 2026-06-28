-- ============================================================================
-- CarryPath V2 · Phase 4 — Marketplace: offers, redacted feed, accept
-- A client broadcasts a case_offer; it is geo-matched to verified in-radius
-- instructors as offer_matches. Instructors NEVER select case_offers directly —
-- they read a redacted, PII-free security-barrier VIEW. Acceptance goes through
-- a security-definer RPC that creates the engagement, grants scoped case access,
-- and logs the cross-actor event. Disclosures remain off-limits to instructors.
-- Ref: CCW_V2_Data_Model.md §4 + §8
-- (Numbered before scheduling 000600 so bookings can reference engagements.)
-- ============================================================================

-- ── case_offers (broadcast request) ─────────────────────────────────────────
create table public.case_offers (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  type          offer_type not null,
  status        offer_status not null default 'open',
  jurisdiction  jurisdiction_key not null,
  area_label    text,                            -- coarse area shown in the feed (no PII)
  lat           double precision,
  lng           double precision,
  client_geog   geography(point, 4326),
  radius_mi     integer not null default 25,
  needs_note    text,
  expires_at    timestamptz,
  accepted_engagement_id uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_offers_status on public.case_offers (status, jurisdiction);
create index idx_offers_case on public.case_offers (case_id);

-- ── offer_matches (which verified instructors were shown the offer) ──────────
create table public.offer_matches (
  id            uuid primary key default gen_random_uuid(),
  offer_id      uuid not null references public.case_offers(id) on delete cascade,
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  distance_mi   numeric(6, 2),
  responded     text,                            -- null | 'accepted' | 'declined'
  responded_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (offer_id, instructor_id)
);
create index idx_offer_matches_instr on public.offer_matches (instructor_id, responded);

-- ── engagements (instructor ↔ case binding + access scope) ───────────────────
create table public.engagements (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  offer_id      uuid references public.case_offers(id) on delete set null,
  type          offer_type not null,
  status        engagement_status not null default 'active',
  scope_full_assist boolean not null default false, -- broader docs (NEVER disclosures)
  client_consented_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (case_id, instructor_id)
);
create index idx_engagements_instr on public.engagements (instructor_id, status);
create index idx_engagements_case on public.engagements (case_id, status);

-- ── geography from cached lat/lng + updated_at triggers ──────────────────────
create or replace function public.case_offers_sync_geog()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.lat is not null and new.lng is not null then
    new.client_geog = ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326)::geography;
  end if;
  return new;
end $$;
create trigger trg_case_offers_sync_geog
  before insert or update of lat, lng on public.case_offers
  for each row execute function public.case_offers_sync_geog();
create trigger trg_case_offers_updated_at
  before update on public.case_offers for each row execute function public.set_updated_at();
create trigger trg_engagements_updated_at
  before update on public.engagements for each row execute function public.set_updated_at();

-- ── Engaged-instructor helper ────────────────────────────────────────────────
create or replace function public.instructor_engaged(p_case_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.engagements e
    join public.instructors i on i.id = e.instructor_id
    where e.case_id = p_case_id and e.status = 'active' and i.profile_id = auth.uid()
  )
$$;

-- ── Grants ───────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.case_offers   to authenticated;
grant select, insert, update, delete on public.offer_matches to authenticated;
grant select, insert, update, delete on public.engagements   to authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.case_offers   enable row level security;
alter table public.offer_matches enable row level security;
alter table public.engagements   enable row level security;

-- case_offers: client owns their case's offers; staff/admin all.
-- Instructors have NO policy here — they only ever see the redacted view below.
create policy case_offers_select on public.case_offers for select
  using (public.case_visible(case_id));
create policy case_offers_write on public.case_offers for all
  using (public.case_visible(case_id))
  with check (public.case_visible(case_id));

-- offer_matches: an instructor sees/updates only their OWN matches; staff/admin all.
-- (Match rows are created by the matching engine via the service-role client.)
create policy offer_matches_rw on public.offer_matches for all
  using (
    public.is_staff_or_admin()
    or exists (select 1 from public.instructors i where i.id = instructor_id and i.profile_id = auth.uid())
  )
  with check (
    public.is_staff_or_admin()
    or exists (select 1 from public.instructors i where i.id = instructor_id and i.profile_id = auth.uid())
  );

-- engagements: client reads their case's engagements; instructor reads/updates own.
-- (Created by accept_offer() which runs security-definer, so no client insert path.)
create policy engagements_select on public.engagements for select
  using (
    public.case_visible(case_id)
    or exists (select 1 from public.instructors i where i.id = instructor_id and i.profile_id = auth.uid())
  );
create policy engagements_update on public.engagements for update
  using (
    public.is_staff_or_admin()
    or exists (select 1 from public.instructors i where i.id = instructor_id and i.profile_id = auth.uid())
  )
  with check (
    public.is_staff_or_admin()
    or exists (select 1 from public.instructors i where i.id = instructor_id and i.profile_id = auth.uid())
  );

-- ── Scoped case access for engaged instructors (NO PII, NO disclosures) ─────
-- They may read the case row (stage) and its requirement checklist — but NOT
-- clients (PII), documents, disclosures, or intake_sessions (no policy there).
create policy cases_select_instructor on public.cases for select
  using (public.instructor_engaged(id));
create policy case_requirements_select_instructor on public.case_requirements for select
  using (public.instructor_engaged(case_id));

-- ── Redacted offer feed (security-barrier view; no client identity) ─────────
-- Runs with definer (view-owner) rights so it can read case_offers/cases, but it
-- returns only non-PII columns and is scoped to the current instructor's open
-- matches via auth.uid().
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
    o.created_at
  from public.offer_matches m
  join public.case_offers o on o.id = m.offer_id
  join public.cases c on c.id = o.case_id
  join public.instructors i on i.id = m.instructor_id
  where i.profile_id = auth.uid()
    and o.status = 'open'
    and m.responded is null
    and (o.expires_at is null or o.expires_at > now());

grant select on public.instructor_offer_feed to authenticated;

-- ── accept_offer RPC (creates engagement, grants scope, logs) ───────────────
create or replace function public.accept_offer(p_offer_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_instructor public.instructors%rowtype;
  v_offer      public.case_offers%rowtype;
  v_engagement_id uuid;
begin
  select * into v_instructor from public.instructors where profile_id = auth.uid();
  if v_instructor.id is null then raise exception 'Not an instructor account'; end if;
  if not v_instructor.verified then raise exception 'Instructor is not verified'; end if;

  select * into v_offer from public.case_offers where id = p_offer_id for update;
  if v_offer.id is null then raise exception 'Offer not found'; end if;
  if v_offer.status <> 'open' then raise exception 'Offer is no longer open'; end if;

  if not exists (
    select 1 from public.offer_matches
    where offer_id = p_offer_id and instructor_id = v_instructor.id
  ) then
    raise exception 'You were not matched to this offer';
  end if;

  insert into public.engagements (case_id, instructor_id, offer_id, type, status, scope_full_assist)
  values (v_offer.case_id, v_instructor.id, p_offer_id, v_offer.type, 'active', false)
  returning id into v_engagement_id;

  update public.offer_matches set responded = 'accepted', responded_at = now()
    where offer_id = p_offer_id and instructor_id = v_instructor.id;

  update public.case_offers
    set status = 'accepted', accepted_engagement_id = v_engagement_id, updated_at = now()
    where id = p_offer_id;

  insert into public.activity_log (actor, action, case_id, entity, entity_id, detail)
  values (
    auth.uid(), 'offer.accepted', v_offer.case_id, 'engagement', v_engagement_id,
    jsonb_build_object('offer_id', p_offer_id, 'instructor_id', v_instructor.id)
  );

  return v_engagement_id;
end $$;

grant execute on function public.accept_offer(uuid) to authenticated;
