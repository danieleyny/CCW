-- ============================================================================
-- PUBLIC INSTRUCTOR DIRECTORY (SEO V2 Phase 4)
--
-- A public, indexable directory of DCJS-approved instructors — but STRICTLY
-- opt-in and STRICTLY projected. Two new columns let an instructor consent and
-- say which boroughs they serve; a curated view is the ONLY thing the public
-- page reads, and it exposes nothing but the fields an instructor chose to make
-- public.
--
--   public_profile   — explicit opt-in, default FALSE. Admin-/instructor-toggled.
--   public_boroughs  — the boroughs the instructor lists for the public card.
--
-- The view exposes ONLY: a derived slug, name, boroughs, languages, class
-- format, and public bio — and only for rows that are BOTH opted-in AND
-- admin-verified. Email, phone, DCJS id, addresses, prices, feed signals, and
-- every other column are structurally absent from the projection, so the public
-- surface cannot leak them even by accident. tests/rls/instructor-public-directory
-- asserts this column set and the two filters, positively and negatively.
--
-- SECURITY-DEFINER VIEW — intentional, same rationale as the trainer firewall
-- (20260718001600): the WHERE clause + the column list ARE the security boundary.
-- The base `instructors` table stays RLS-protected; this view is a deliberate,
-- minimal public projection over it. Do NOT set security_invoker=true — under
-- invoker semantics anon (not signed in) would read zero rows and the directory
-- would silently go dark.
-- ============================================================================

alter table public.instructors
  add column if not exists public_profile  boolean not null default false,
  add column if not exists public_boroughs text[]  not null default '{}'::text[];

comment on column public.instructors.public_profile is
  'Explicit opt-in to the PUBLIC /instructors directory. Default false. Only rows that are public_profile=true AND verified=true ever appear publicly (via public_instructor_directory). Never implies anything beyond the projected columns.';
comment on column public.instructors.public_boroughs is
  'Boroughs the instructor lists on their PUBLIC card. Separate from service_radius routing — this is the consented public claim.';

-- Curated public projection. Slug is derived deterministically from name + a
-- short id fragment (stable, URL-safe, unique) so profile URLs are readable
-- without exposing the raw uuid as data. Nothing sensitive is selected.
create or replace view public.public_instructor_directory
with (security_barrier = true) as
  select
    -- e.g. "jane-smith-1a2b3c4d" — readable + collision-safe.
    trim(both '-' from regexp_replace(lower(i.name), '[^a-z0-9]+', '-', 'g'))
      || '-' || substr(i.id::text, 1, 8)               as slug,
    i.name                                              as name,
    i.public_boroughs                                   as boroughs,
    i.languages                                         as languages,
    i.class_format                                      as class_format,
    i.bio                                               as bio
  from public.instructors i
  where i.public_profile = true
    and i.verified = true;

comment on view public.public_instructor_directory is
  'PUBLIC, opt-in instructor directory. Exposes ONLY slug/name/boroughs/languages/class_format/bio for public_profile=true AND verified=true rows. The projection is the privacy boundary — see 20260803000100 header and the leak test.';

-- Readable by everyone (the marketing page is public); the projection is safe.
revoke all on public.public_instructor_directory from public;
grant select on public.public_instructor_directory to anon, authenticated;
