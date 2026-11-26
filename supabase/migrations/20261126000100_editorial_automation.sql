-- Supervised editorial automation.
--
-- The scheduler may research approved primary sources and create private
-- drafts. It can never publish: blog_posts still requires human fact/legal
-- reviews and an explicit admin publish action.

create table public.editorial_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 160),
  organization text not null check (char_length(organization) between 2 and 120),
  url text not null unique check (url ~ '^https://'),
  source_type text not null default 'official_guidance'
    check (source_type in ('official_guidance', 'official_faq', 'official_news', 'official_rules')),
  active boolean not null default true,
  priority smallint not null default 2 check (priority between 1 and 4),
  last_fetched_at timestamptz,
  last_success_at timestamptz,
  last_http_status integer,
  content_hash text,
  content_excerpt text,
  last_error text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index editorial_sources_active_priority_idx
  on public.editorial_sources (active, priority, updated_at desc);

create trigger trg_editorial_sources_updated_at
  before update on public.editorial_sources
  for each row execute function public.set_updated_at();

alter table public.editorial_sources enable row level security;
grant select, insert, update, delete on public.editorial_sources to authenticated;

create policy editorial_sources_admin_select
  on public.editorial_sources for select to authenticated
  using (public.is_admin());
create policy editorial_sources_admin_insert
  on public.editorial_sources for insert to authenticated
  with check (public.is_admin());
create policy editorial_sources_admin_update
  on public.editorial_sources for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy editorial_sources_admin_delete
  on public.editorial_sources for delete to authenticated
  using (public.is_admin());

create table public.editorial_runs (
  id uuid primary key default gen_random_uuid(),
  trigger text not null check (trigger in ('scheduled', 'manual')),
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed', 'skipped')),
  model text not null,
  source_count integer not null default 0 check (source_count >= 0),
  draft_count integer not null default 0 check (draft_count >= 0),
  article_id uuid references public.blog_posts(id) on delete set null,
  skip_reason text,
  error_message text,
  created_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index editorial_runs_started_idx on public.editorial_runs (started_at desc);
create unique index editorial_runs_one_running_idx
  on public.editorial_runs ((status))
  where status = 'running';

alter table public.editorial_runs enable row level security;
grant select, insert, update on public.editorial_runs to authenticated;

create policy editorial_runs_admin_select
  on public.editorial_runs for select to authenticated
  using (public.is_admin());
create policy editorial_runs_admin_insert
  on public.editorial_runs for insert to authenticated
  with check (public.is_admin());
create policy editorial_runs_admin_update
  on public.editorial_runs for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.blog_posts
  add column automation_run_id uuid references public.editorial_runs(id) on delete set null,
  add column automation_context jsonb not null default '{}'::jsonb
    check (jsonb_typeof(automation_context) = 'object');

create index blog_posts_automation_run_idx
  on public.blog_posts (automation_run_id)
  where automation_run_id is not null;

-- Curated primary-source registry. These pages are fetched as untrusted data;
-- their contents never become instructions to the drafting model.
insert into public.editorial_sources
  (name, organization, url, source_type, priority)
values
  (
    'NYPD firearms licensing',
    'New York City Police Department',
    'https://www.nyc.gov/site/nypd/services/law-enforcement/permits-licenses-firearms.page',
    'official_guidance',
    1
  ),
  (
    'New York concealed carry FAQ',
    'New York State',
    'https://gunsafety.ny.gov/frequently-asked-questions-new-concealed-carry-law',
    'official_faq',
    1
  ),
  (
    'New York gun-law overview',
    'Office of the New York State Attorney General',
    'https://ag.ny.gov/new-york-gun-laws',
    'official_guidance',
    2
  ),
  (
    'NYC 311 gun permit guide',
    'City of New York',
    'https://portal.311.nyc.gov/article/?kanumber=KA-01683',
    'official_guidance',
    2
  )
on conflict (url) do nothing;
