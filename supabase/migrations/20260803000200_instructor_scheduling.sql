-- ============================================================================
-- STRUCTURED INSTRUCTOR SCHEDULING & CONSULT AVAILABILITY
--
-- Replaces the free-text "Typical availability" box with structured fields the
-- marketplace can actually reason about:
--   · how OFTEN the instructor can run the 18-hour course (one cadence),
--   · whether they'd take on more if we bring enough demand,
--   · and WHEN applicants can reach them to talk (days + an hours window).
--
-- The old scheduling_notes column is left in place (not dropped — never edit a
-- shipped column out from under data) but the UI no longer writes it.
-- ============================================================================

alter table public.instructors
  -- How often they can run a class. One value, decreasing frequency.
  add column if not exists class_frequency        text,
  -- Would run more than that cadence if we send enough interested applicants.
  add column if not exists open_to_more_classes    boolean not null default false,
  -- Days they can be available to talk to applicants (Mon…Sun).
  add column if not exists consult_days            text[]  not null default '{}'::text[],
  -- Consult window, as hour-of-day integers in local time (0–23). start < end.
  add column if not exists consult_hours_start     integer,
  add column if not exists consult_hours_end       integer;

comment on column public.instructors.class_frequency is
  'How often the instructor can run the 18-hour course: weekly | biweekly | monthly | bimonthly (every 2 months).';
comment on column public.instructors.open_to_more_classes is
  'True if they''d run classes more often than class_frequency when we supply enough interested applicants.';
comment on column public.instructors.consult_days is
  'Days the instructor is available to speak/consult with applicants (Mon…Sun). We ask for at least one hour on each.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'instructors_class_frequency_check') then
    alter table public.instructors
      add constraint instructors_class_frequency_check
      check (class_frequency is null or class_frequency in ('weekly','biweekly','monthly','bimonthly'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'instructors_consult_hours_check') then
    alter table public.instructors
      add constraint instructors_consult_hours_check
      check (
        (consult_hours_start is null and consult_hours_end is null)
        or (consult_hours_start between 0 and 23
            and consult_hours_end between 1 and 24
            and consult_hours_end > consult_hours_start)
      );
  end if;
end $$;
