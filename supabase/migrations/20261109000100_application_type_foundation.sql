-- Premise Residence foundation.
--
-- The old model encoded applicant audience in clients.track and reserved
-- cases.license_track for armed-guard routing. Neither is a safe canonical
-- place for the NYPD application category. Add an explicit, nullable category:
-- new applicants choose it before intake; existing cases are backfilled only
-- where their stored facts are unambiguous.

create type public.application_type as enum (
  'concealed_carry',
  'premise_residence',
  'premise_business',
  'special_carry',
  'carry_guard',
  'special_carry_guard',
  'retired_leo'
);

alter table public.cases
  add column application_type public.application_type,
  add column application_type_selected_at timestamptz,
  add column application_type_selected_by uuid references public.profiles(id) on delete set null;

comment on column public.cases.application_type is
  'Canonical NYPD licence/application category. Nullable for legacy or sponsored cases that have not been classified.';
comment on column public.cases.application_type_selected_at is
  'When an applicant or staff member explicitly selected the canonical application category.';
comment on column public.cases.application_type_selected_by is
  'Profile that explicitly selected the application category; null for deterministic migration backfills.';

create index cases_application_type_idx on public.cases(application_type);

-- Sponsored armed-guard routes are already explicit and deterministic.
update public.cases
   set application_type = case license_track
     when 'carry_guard'::public.license_track then 'carry_guard'::public.application_type
     when 'special_carry_guard'::public.license_track then 'special_carry_guard'::public.application_type
     else application_type
   end
 where license_track in (
   'carry_guard'::public.license_track,
   'special_carry_guard'::public.license_track
 );

-- Legacy audience tracks with one legal meaning are also deterministic.
update public.cases c
   set application_type = case cl.track
     when 'retired_leo'::public.client_track then 'retired_leo'::public.application_type
     when 'premises_business'::public.client_track then 'premise_business'::public.application_type
     when 'non_resident'::public.client_track then 'special_carry'::public.application_type
     else c.application_type
   end
  from public.clients cl
 where cl.id = c.client_id
   and c.application_type is null
   and cl.track in (
     'retired_leo'::public.client_track,
     'premises_business'::public.client_track,
     'non_resident'::public.client_track
   );

-- Completed intake answers are sworn applicant facts. Historical `premises`
-- meant Premise Business; never reinterpret it as a home licence.
update public.cases c
   set application_type = case
     when s.answers ->> 'licenseType' = 'premises'
       then 'premise_business'::public.application_type
     when s.answers ->> 'licenseType' = 'carry'
          and coalesce(s.answers ->> 'residence', 'nyc') = 'non_resident'
       then 'special_carry'::public.application_type
     when s.answers ->> 'licenseType' = 'carry'
       then 'concealed_carry'::public.application_type
     else c.application_type
   end
  from public.intake_sessions s
 where s.case_id = c.id
   and s.completed_at is not null
   and c.application_type is null
   and s.answers ->> 'licenseType' in ('carry', 'premises');

-- Intentionally leave ambiguous legacy cases null. The product asks for an
-- explicit choice instead of guessing a legal category from a default value.
