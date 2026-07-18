-- ============================================================================
-- Applicant location for distance-ranked instructor matching.
--
-- Clients only had a coarse, often-null `borough`, so offers geocoded to a
-- borough centroid (or nothing). Capture a ZIP → neighborhood point so the
-- marketplace can rank instructors by real distance. Instructors still never
-- see the ZIP/address — only borough + distance (redacted feed).
-- Mirrors case_offers_sync_geog: home_geog is derived from lat/lng by a trigger.
-- ============================================================================

alter table public.clients
  add column if not exists zip       text,
  add column if not exists lat       double precision,
  add column if not exists lng       double precision,
  add column if not exists home_geog geography(point, 4326);

create index if not exists idx_clients_home_geog on public.clients using gist (home_geog);

create or replace function public.clients_sync_home_geog()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.lat is not null and new.lng is not null then
    new.home_geog = ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326)::geography;
  end if;
  return new;
end $$;

create trigger trg_clients_sync_home_geog
  before insert or update of lat, lng on public.clients
  for each row execute function public.clients_sync_home_geog();
