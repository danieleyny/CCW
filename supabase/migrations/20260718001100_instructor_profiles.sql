-- ============================================================================
-- RICHER INSTRUCTOR PROFILES + FEED SIGNALS
--
-- The applicant's offer card was thin ("DCJS-credentialed · 0.0 mi · $600")
-- because the profile collected almost nothing. A nervous first-timer choosing
-- who teaches them to carry a firearm needs more than that: who this person is,
-- where they teach, what's actually included, and a way to meet them first.
--
-- LEGAL NOTE ON "VIRTUAL": the required 18-hour course (16h classroom + 2h live
-- fire) is IN-PERSON under NY's CCIA. Nothing here lets an instructor advertise
-- a virtual required course. `offers_intro_call` is a free, explicitly optional
-- introduction — never the course itself.
--
-- Everything is nullable so signup stays light. "Complete enough to be shown to
-- applicants" is enforced in app logic (lib/instructors/profile.ts), not here,
-- so a half-finished profile is savable but not yet live.
-- ============================================================================

alter table public.instructors
  -- About them
  add column if not exists website_url        text,
  add column if not exists instagram_handle   text,
  add column if not exists facebook_url       text,
  add column if not exists x_handle           text,
  add column if not exists years_experience   integer,
  add column if not exists background         text,
  add column if not exists languages          text[] default '{}'::text[],
  add column if not exists avatar_path        text,
  add column if not exists facility_photo_paths text[] default '{}'::text[],

  -- The course they run
  add column if not exists class_format       text,          -- private_1on1 | small_group | both
  add column if not exists typical_class_size integer,
  add column if not exists provides_range     boolean,
  add column if not exists separate_range_note text,         -- used when provides_range = false
  add column if not exists range_fee_included boolean,
  add column if not exists ammo_included      boolean,
  add column if not exists materials_included boolean,
  add column if not exists whats_to_bring     text,

  -- Scheduling + first contact
  add column if not exists scheduling_notes   text,
  add column if not exists response_time_note text,
  add column if not exists offers_intro_call  boolean not null default false,
  add column if not exists intro_call_note    text,

  -- Feed signals (see below)
  add column if not exists feed_seen_at       timestamptz,
  add column if not exists auto_offer_enabled boolean not null default false,
  add column if not exists auto_offer_note    text,
  add column if not exists auto_offer_price_cents integer;

comment on column public.instructors.feed_seen_at is
  'When this instructor last opened their request feed. Anything matched after this is "new" — that is the green dot on the Feed tab.';
comment on column public.instructors.auto_offer_enabled is
  'Automatically express interest in new in-area requests, using auto_offer_note/price. Only fires for instructors who are verified AND profile-complete.';
comment on column public.instructors.provides_range is
  'True when the instructor supplies the live-fire range. False means the applicant goes to a separate range — separate_range_note says which.';

-- Class format is a small closed set; a typo here would silently break filtering.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'instructors_class_format_check') then
    alter table public.instructors
      add constraint instructors_class_format_check
      check (class_format is null or class_format in ('private_1on1', 'small_group', 'both'));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'instructors_class_size_check') then
    alter table public.instructors
      add constraint instructors_class_size_check
      check (typical_class_size is null or (typical_class_size between 1 and 60));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'instructors_years_experience_check') then
    alter table public.instructors
      add constraint instructors_years_experience_check
      check (years_experience is null or (years_experience between 0 and 70));
  end if;
end $$;

-- ── Training locations: a usable address, and which range they'd actually use ─
alter table public.training_locations
  add column if not exists notes text;

comment on column public.training_locations.is_range is
  'Live-fire range (vs classroom). An instructor needs at least one classroom location with an address before applicants can see them.';

-- ── Marking the feed seen uses the DATABASE clock ────────────────────────────
-- offer_matches.created_at defaults to now() on the server, so a watermark
-- written from the app's clock can land *before* rows that already existed —
-- and the green dot never clears. One source of time, not two.
-- Returns the new watermark, or NULL when it matched nobody (e.g. a
-- service-role caller with no auth.uid()). A void return would let "updated
-- nothing" look exactly like success, and the dot would never clear.
create or replace function public.mark_instructor_feed_seen()
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_seen timestamptz;
begin
  update public.instructors
     set feed_seen_at = now()
   where profile_id = auth.uid()
  returning feed_seen_at into v_seen;
  return v_seen;
end $$;
grant execute on function public.mark_instructor_feed_seen() to authenticated;
