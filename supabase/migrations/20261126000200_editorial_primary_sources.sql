-- Expand the editorial evidence boundary with current primary authorities.
-- The automation fetcher still allowlists each host and treats page text as
-- untrusted research data. These rows do not create or change registry rules.

insert into public.editorial_sources
  (name, organization, url, source_type, priority)
values
  (
    'NYPD new application instructions',
    'New York City Police Department License Division',
    'https://licensing.nypdonline.org/new-app-instruction/',
    'official_guidance',
    1
  ),
  (
    'NYC handgun license application rules',
    'City of New York',
    'https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCrules/0-0-0-135179',
    'official_rules',
    1
  ),
  (
    'NYC carry and special handgun license rules',
    'City of New York',
    'https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCrules/0-0-0-135544',
    'official_rules',
    1
  ),
  (
    'New York Penal Law section 400.00',
    'New York State Senate',
    'https://www.nysenate.gov/legislation/laws/PEN/400.00',
    'official_rules',
    2
  )
on conflict (url) do update set
  name = excluded.name,
  organization = excluded.organization,
  source_type = excluded.source_type,
  priority = excluded.priority,
  active = true;
