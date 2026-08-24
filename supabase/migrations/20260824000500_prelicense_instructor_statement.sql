-- ============================================================================
-- CARRY GUARD — PASS 3 · the §5-09 pre-licence instructor statement (3D)
--
-- 38 RCNY §5-09 requires the applicant's firearms instructor to provide a
-- verified statement covering: that they have MET the applicant; a danger
-- assessment (the applicant poses no danger to self or others); the instructor's
-- certification / authority to instruct; the instructor's name, address and
-- telephone; and the EXACT location where the training will take place.
--
-- The instructor is a first-class user here, so we collect this IN-PLATFORM from
-- the assigned (actively engaged) instructor and fill the OFFICIAL PLE-01 form
-- (request-pre-exemption.pdf) from it. The form stays notarize:true / signable:
-- false — filled + printed + NOTARISED on paper, filed WITH the handgun
-- application. Nothing here is a digital signature.
--
-- ⚠️ The exact §5-09 wording must be confirmed against the rule / License
-- Division by counsel before live filing (operator task).
-- ============================================================================

create table if not exists public.prelicense_instructor_statements (
  case_id            uuid primary key references public.cases (id) on delete cascade,
  instructor_id      uuid references public.instructors (id),
  met_applicant      boolean not null default false,   -- has met the applicant
  no_danger          boolean not null default false,   -- poses no danger to self/others
  credentials        text,                             -- certification / authority to instruct
  instructor_name    text,
  instructor_address text,
  instructor_phone   text,
  range_name         text,                             -- the range / school name
  training_location  text,                             -- EXACT location + contact
  notes              text,
  submitted_at       timestamptz,                      -- set when the instructor submits
  updated_by         uuid references public.profiles (id),
  updated_at         timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- The ASSIGNED instructor (active engagement) writes their own statement; the
-- applicant + staff may read it (to see status / generate the form); staff may
-- write. instructor_engaged() is a SECURITY DEFINER helper (marketplace) — using
-- it (not a self-query) keeps INSERT…RETURNING working.
grant select, insert, update on public.prelicense_instructor_statements to authenticated;
alter table public.prelicense_instructor_statements enable row level security;

create policy pls_select on public.prelicense_instructor_statements for select
  using (public.case_visible(case_id) or public.instructor_engaged(case_id));

create policy pls_write on public.prelicense_instructor_statements for all
  using (public.instructor_engaged(case_id) or public.is_staff_or_admin())
  with check (public.instructor_engaged(case_id) or public.is_staff_or_admin());
