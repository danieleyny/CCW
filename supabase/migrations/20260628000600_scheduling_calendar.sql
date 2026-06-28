-- ============================================================================
-- CarryPath V2 · Phase 5 — Scheduling, booking & calendar
-- Instructor availability_slots → client bookings (with a transactional
-- overbooking guard) → native .ics invites (zero cost). Optional Google two-way
-- sync stores tokens in calendar_connections (feature-flagged in the app).
-- Completed bookings feed the existing training_sessions table.
-- Ref: CCW_V2_Data_Model.md §5
-- ============================================================================

-- ── availability_slots ───────────────────────────────────────────────────────
create table public.availability_slots (
  id            uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  location_id   uuid references public.training_locations(id) on delete set null,
  type          slot_type not null,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  capacity      integer not null default 1,
  booked_count  integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_slots_instr_time on public.availability_slots (instructor_id, starts_at);

-- ── bookings ─────────────────────────────────────────────────────────────────
create table public.bookings (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete cascade,
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  engagement_id uuid references public.engagements(id) on delete set null,
  slot_id       uuid references public.availability_slots(id) on delete set null,
  location_id   uuid references public.training_locations(id) on delete set null,
  type          slot_type not null,
  status        booking_status not null default 'requested',
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  ics_uid       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_bookings_case on public.bookings (case_id);
create index idx_bookings_instr on public.bookings (instructor_id, starts_at);

-- ── Overbooking guard ────────────────────────────────────────────────────────
-- A 'requested' or 'confirmed' booking holds a seat. The AFTER trigger adjusts
-- booked_count and RAISES (rolling back the whole statement) if a slot would go
-- over capacity — so a slot can never be overbooked even under a race.
-- security definer: the booked_count bookkeeping is a system invariant and must
-- bypass the booker's RLS (a client has no write access to availability_slots).
create or replace function public.bookings_guard_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_cap int;
  v_count int;
  holding constant text[] := array['requested', 'confirmed'];
begin
  if tg_op = 'INSERT' then
    if new.slot_id is not null and new.status::text = any(holding) then
      update public.availability_slots set booked_count = booked_count + 1
        where id = new.slot_id returning capacity, booked_count into v_cap, v_count;
      if v_count > v_cap then raise exception 'Slot is full (capacity %).', v_cap; end if;
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.slot_id is not null then
      if (old.status::text = any(holding)) and not (new.status::text = any(holding)) then
        update public.availability_slots set booked_count = greatest(booked_count - 1, 0)
          where id = new.slot_id;
      elsif not (old.status::text = any(holding)) and (new.status::text = any(holding)) then
        update public.availability_slots set booked_count = booked_count + 1
          where id = new.slot_id returning capacity, booked_count into v_cap, v_count;
        if v_count > v_cap then raise exception 'Slot is full (capacity %).', v_cap; end if;
      end if;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.slot_id is not null and old.status::text = any(holding) then
      update public.availability_slots set booked_count = greatest(booked_count - 1, 0)
        where id = old.slot_id;
    end if;
    return old;
  end if;
  return null;
end $$;
create trigger trg_bookings_guard_capacity
  after insert or update or delete on public.bookings
  for each row execute function public.bookings_guard_capacity();

create trigger trg_availability_slots_updated_at
  before update on public.availability_slots for each row execute function public.set_updated_at();
create trigger trg_bookings_updated_at
  before update on public.bookings for each row execute function public.set_updated_at();

-- ── calendar_connections (optional Google sync; feature-flagged in app) ──────
create table public.calendar_connections (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  provider      calendar_provider not null default 'google',
  access_token  text,
  refresh_token text,
  calendar_id   text,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (profile_id, provider)
);
create trigger trg_calendar_connections_updated_at
  before update on public.calendar_connections for each row execute function public.set_updated_at();

-- ── Grants ───────────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.availability_slots   to authenticated;
grant select, insert, update, delete on public.bookings             to authenticated;
grant select, insert, update, delete on public.calendar_connections to authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.availability_slots   enable row level security;
alter table public.bookings             enable row level security;
alter table public.calendar_connections enable row level security;

-- availability_slots: clients browse verified instructors' slots; owner/staff manage.
create policy availability_slots_select on public.availability_slots for select
  using (
    exists (
      select 1 from public.instructors i
      where i.id = instructor_id
        and (i.verified or i.profile_id = auth.uid() or public.is_staff_or_admin())
    )
  );
create policy availability_slots_write on public.availability_slots for all
  using (
    public.is_staff_or_admin()
    or exists (select 1 from public.instructors i where i.id = instructor_id and i.profile_id = auth.uid())
  )
  with check (
    public.is_staff_or_admin()
    or exists (select 1 from public.instructors i where i.id = instructor_id and i.profile_id = auth.uid())
  );

-- bookings: client owns their case's bookings; instructor owns theirs; staff all.
create policy bookings_select on public.bookings for select
  using (
    public.case_visible(case_id)
    or exists (select 1 from public.instructors i where i.id = instructor_id and i.profile_id = auth.uid())
  );
create policy bookings_write on public.bookings for all
  using (
    public.is_staff_or_admin()
    or public.case_visible(case_id)
    or exists (select 1 from public.instructors i where i.id = instructor_id and i.profile_id = auth.uid())
  )
  with check (
    public.is_staff_or_admin()
    or public.case_visible(case_id)
    or exists (select 1 from public.instructors i where i.id = instructor_id and i.profile_id = auth.uid())
  );

-- calendar_connections: strictly own.
create policy calendar_connections_rw on public.calendar_connections for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
