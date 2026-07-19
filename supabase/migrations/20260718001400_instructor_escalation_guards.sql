-- ============================================================================
-- PRIVILEGE-ESCALATION GUARDS (ships alone — these are live holes)
--
-- Four defects, all confirmed exploitable against the local database before
-- this migration was written:
--
--   1. SELF-VERIFY  — `instructors_update_own` (20260628000400:93) allows UPDATE
--      on your own row with NO column restriction and no guarding trigger, so an
--      instructor could run `update instructors set verified = true`. `verified`
--      is what makes them visible to applicants, lets them express_interest /
--      accept_offer, and earns the "DCJS-credentialed" badge. It is supposed to
--      mean "an admin checked the DCJS credential".
--
--   2. SELF-RATE    — the same policy let them write `rating_avg` / `rating_count`.
--      Confirmed: rating_count could be set to 999.
--
--   3. RE-ACTIVATE  — `engagements_update` (20260628000500:127) likewise, so a
--      CANCELLED engagement could be flipped back to 'active', restoring
--      instructor_engaged() and with it access to the case. They could also set
--      scope_full_assist, the column that exists to widen document scope.
--
--   4. MESSAGE SPOOF — the 20260718000400 rewrite of `messages_insert` dropped
--      the `sender_id = auth.uid()` binding the original policy had, and never
--      bound case_id to the engagement's case. Confirmed: an instructor could
--      insert a message onto a case they have no engagement with, attributed to
--      the applicant's own profile.
--
-- WHY TRIGGERS AND NOT POLICIES: an RLS policy filters ROWS, not COLUMNS. There
-- is no way to say "you may update your bio but not your verified flag" in a
-- policy, and column-level GRANTs are per-role while this app funnels client,
-- staff and instructor through the single `authenticated` role. A BEFORE UPDATE
-- trigger is the only mechanism that can express it.
-- ============================================================================

-- ── 1 + 2: an instructor may not grant themselves credentials or reputation ──
create or replace function public.forbid_instructor_self_elevation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Staff/admin and the service role (no auth.uid()) set these legitimately:
  -- admin verification, and the ratings pipeline.
  if public.is_staff_or_admin() or auth.uid() is null then
    return new;
  end if;

  if new.verified is distinct from old.verified then
    raise exception 'Only Gun License NYC can verify a DCJS credential.';
  end if;
  if new.rating_avg is distinct from old.rating_avg
     or new.rating_count is distinct from old.rating_count then
    raise exception 'Ratings are computed from real bookings, not set by hand.';
  end if;

  return new;
end $$;

drop trigger if exists trg_forbid_instructor_self_elevation on public.instructors;
create trigger trg_forbid_instructor_self_elevation
  before update on public.instructors
  for each row execute function public.forbid_instructor_self_elevation();

-- ── 3: an instructor may not widen or resurrect their own engagement ─────────
create or replace function public.forbid_engagement_self_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- accept_offer() / choose_instructor() are SECURITY DEFINER and run with no
  -- auth.uid() context for the service role; staff manage engagements directly.
  if public.is_staff_or_admin() or auth.uid() is null then
    return new;
  end if;

  -- The applicant owns the decision to engage or end an engagement.
  if public.case_visible(new.case_id) then
    return new;
  end if;

  if new.status is distinct from old.status then
    raise exception 'An engagement''s status is set by the applicant, not the instructor.';
  end if;
  if new.scope_full_assist is distinct from old.scope_full_assist then
    raise exception 'Access scope is set by Gun License NYC, not the instructor.';
  end if;

  return new;
end $$;

drop trigger if exists trg_forbid_engagement_self_escalation on public.engagements;
create trigger trg_forbid_engagement_self_escalation
  before update on public.engagements
  for each row execute function public.forbid_engagement_self_escalation();

-- ── 4: messages — bind the sender and bind the case ──────────────────────────
-- A CANCELLED or DECLINED engagement ends access. A COMPLETED one keeps the
-- transcript readable (it's a conversation the instructor was party to) but
-- can't be written to any more — hence two predicates, not one.
create or replace function public.instructor_owns_engagement(p_engagement_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.engagements e
    join public.instructors i on i.id = e.instructor_id
    where e.id = p_engagement_id
      and e.status in ('active', 'completed')
      and i.profile_id = auth.uid()
  )
$$;

create or replace function public.instructor_engagement_writable(p_engagement_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.engagements e
    join public.instructors i on i.id = e.instructor_id
    where e.id = p_engagement_id
      and e.status = 'active'
      and i.profile_id = auth.uid()
  )
$$;

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert
  with check (
    -- You are who you say you are. Every app insert already sets this from the
    -- session; the seed writes with the service role and bypasses RLS.
    sender_id = auth.uid()
    and (
      public.case_visible(case_id)
      or (
        engagement_id is not null
        and public.instructor_engagement_writable(engagement_id)
        -- ...and the message lands on the engagement's OWN case. Without this an
        -- instructor could post into any case while holding one valid engagement.
        and case_id = (select e.case_id from public.engagements e where e.id = engagement_id)
      )
    )
  );
