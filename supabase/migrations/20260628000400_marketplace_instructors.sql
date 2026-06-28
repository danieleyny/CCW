-- ============================================================================
-- CarryPath V2 · Phase 3 — Instructor accounts & profiles
-- Enriches the bare v1 `instructors` table into real, auth-bound, admin-verified
-- marketplace accounts with a PostGIS service-area center, and adds physical
-- `training_locations`. Geocoding is cached (lat/lng set once at signup) and the
-- geography column is maintained by trigger — no paid geo API, no per-search calls.
-- Offers / engagements / the redacted feed land in Phase 4.
-- Ref: CCW_V2_Data_Model.md §4
-- ============================================================================

-- ── Enrich instructors ───────────────────────────────────────────────────────
alter table public.instructors
  add column if not exists profile_id        uuid references public.profiles(id) on delete set null,
  add column if not exists bio               text,
  add column if not exists dcjs_id           text,
  add column if not exists verified          boolean not null default false,
  add column if not exists verified_at       timestamptz,
  add column if not exists service_radius_mi integer not null default 25,
  add column if not exists lat               double precision,
  add column if not exists lng               double precision,
  add column if not exists base_geog         geography(point, 4326),
  add column if not exists price_18h_cents   integer,
  add column if not exists rating_avg        numeric(3, 2),
  add column if not exists rating_count      integer not null default 0,
  add column if not exists jurisdictions     jurisdiction_key[] not null default '{nyc}';

create index if not exists idx_instructors_geog on public.instructors using gist (base_geog);
create index if not exists idx_instructors_profile on public.instructors (profile_id);
create index if not exists idx_instructors_verified on public.instructors (verified);

-- ── Physical training venues ─────────────────────────────────────────────────
create table public.training_locations (
  id            uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  label         text not null,
  address       text,
  lat           double precision,
  lng           double precision,
  geog          geography(point, 4326),
  is_range      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_train_loc_instructor on public.training_locations (instructor_id);
create index idx_train_loc_geog on public.training_locations using gist (geog);

-- ── Maintain geography from cached lat/lng (no live geocoding) ────────────────
create or replace function public.instructors_sync_geog()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.lat is not null and new.lng is not null then
    new.base_geog = ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326)::geography;
  end if;
  return new;
end $$;

create or replace function public.training_locations_sync_geog()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.lat is not null and new.lng is not null then
    new.geog = ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326)::geography;
  end if;
  return new;
end $$;

create trigger trg_instructors_sync_geog
  before insert or update of lat, lng on public.instructors
  for each row execute function public.instructors_sync_geog();
create trigger trg_train_loc_sync_geog
  before insert or update of lat, lng on public.training_locations
  for each row execute function public.training_locations_sync_geog();
create trigger trg_training_locations_updated_at
  before update on public.training_locations
  for each row execute function public.set_updated_at();

-- ── Role helper ──────────────────────────────────────────────────────────────
create or replace function public.is_instructor()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() = 'instructor'
$$;

-- ── Grants ───────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.training_locations to authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- instructors: existing staff/admin select+write policies stay. Add:
--  • verified instructors are readable by any signed-in user (clients browse)
--  • an instructor can read & update their OWN row (onboarding)
create policy instructors_select_verified on public.instructors for select
  using (verified = true);
create policy instructors_select_own on public.instructors for select
  using (profile_id = auth.uid());
create policy instructors_update_own on public.instructors for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

alter table public.training_locations enable row level security;
-- locations are visible for verified instructors (and to the owner / staff)
create policy training_locations_select on public.training_locations for select
  using (
    exists (
      select 1 from public.instructors i
      where i.id = instructor_id
        and (i.verified or i.profile_id = auth.uid() or public.is_staff_or_admin())
    )
  );
-- owner instructor (or staff/admin) manages locations
create policy training_locations_write on public.training_locations for all
  using (
    public.is_staff_or_admin()
    or exists (select 1 from public.instructors i where i.id = instructor_id and i.profile_id = auth.uid())
  )
  with check (
    public.is_staff_or_admin()
    or exists (select 1 from public.instructors i where i.id = instructor_id and i.profile_id = auth.uid())
  );

-- ── Geo-match RPC (verified only) ────────────────────────────────────────────
-- Returns verified, in-radius instructors with distance. security definer so it
-- can read across instructors, but it hard-filters verified = true, so an
-- unverified instructor is never returned to a client.
create or replace function public.instructors_within_radius(
  p_lat double precision,
  p_lng double precision,
  p_radius_mi double precision default 25,
  p_jurisdiction jurisdiction_key default null
)
returns table (
  id uuid,
  name text,
  bio text,
  dcjs_id text,
  service_radius_mi integer,
  price_18h_cents integer,
  rating_avg numeric,
  rating_count integer,
  jurisdictions jurisdiction_key[],
  distance_mi numeric
)
language sql stable security definer set search_path = public as $$
  select
    i.id, i.name, i.bio, i.dcjs_id, i.service_radius_mi, i.price_18h_cents,
    i.rating_avg, i.rating_count, i.jurisdictions,
    round((ST_Distance(i.base_geog, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) / 1609.34)::numeric, 2) as distance_mi
  from public.instructors i
  where i.verified = true
    and i.base_geog is not null
    and ST_DWithin(i.base_geog, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_mi * 1609.34)
    and (p_jurisdiction is null or p_jurisdiction = any (i.jurisdictions))
  order by distance_mi asc
$$;

grant execute on function public.instructors_within_radius(double precision, double precision, double precision, jurisdiction_key) to authenticated;
