-- Public package ownership. Existing legacy GLN self-guided cases remain fully
-- supported; this only controls which brand may sell a new package.
update public.service_packages set sold_by = '{fl}' where key = 'self_guided';
update public.service_packages set sold_by = '{gln}' where key = 'full_concierge';

-- Marketing consent is brand-specific. The same person may independently opt
-- into each brand without either brand silently inheriting the other consent.
alter table public.marketing_contacts
  drop constraint if exists marketing_contacts_email_key;
create unique index if not exists marketing_contacts_email_brand_key
  on public.marketing_contacts (email, brand);
