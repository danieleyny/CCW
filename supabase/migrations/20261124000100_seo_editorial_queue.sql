-- Gun License NYC editorial planning desk.
--
-- This table deliberately stops at planning/review. Publication remains a
-- human-controlled repository change so an automated draft can never become
-- client-facing legal or licensing guidance on its own.

create table public.seo_content_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'applicant_question'
    check (kind in ('applicant_question', 'official_update', 'guide', 'article_refresh', 'news_analysis')),
  status text not null default 'idea'
    check (status in ('idea', 'drafting', 'review', 'approved', 'scheduled', 'published', 'archived')),
  title text not null check (char_length(title) between 5 and 180),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  target_query text,
  summary text,
  source_urls jsonb not null default '[]'::jsonb
    check (jsonb_typeof(source_urls) = 'array'),
  priority smallint not null default 2 check (priority between 1 and 4),
  due_on date,
  needs_legal_review boolean not null default true,
  published_url text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug)
);

create index seo_content_items_status_priority_idx
  on public.seo_content_items (status, priority, due_on nulls last, created_at desc);

create trigger trg_seo_content_items_updated_at
  before update on public.seo_content_items
  for each row execute function public.set_updated_at();

alter table public.seo_content_items enable row level security;

grant select, insert, update, delete on public.seo_content_items to authenticated;

create policy seo_content_items_admin_select
  on public.seo_content_items for select
  using (public.is_admin());

create policy seo_content_items_admin_insert
  on public.seo_content_items for insert
  with check (public.is_admin());

create policy seo_content_items_admin_update
  on public.seo_content_items for update
  using (public.is_admin())
  with check (public.is_admin());

create policy seo_content_items_admin_delete
  on public.seo_content_items for delete
  using (public.is_admin());

-- A small, evergreen starting backlog. These are prompts for original work,
-- not drafted claims, and every item starts behind human/legal review.
insert into public.seo_content_items
  (kind, title, slug, target_query, summary, priority, needs_legal_review)
values
  (
    'applicant_question',
    'Premise Residence vs. Concealed Carry in NYC',
    'premise-residence-vs-concealed-carry-nyc',
    'premise residence vs concealed carry nyc',
    'Explain the practical differences using current primary sources, including training, references, permitted use and the applicant-controlled filing process.',
    1,
    true
  ),
  (
    'applicant_question',
    'How to Show Proof of Residence for an NYC Handgun License',
    'proof-of-residence-nyc-handgun-license',
    'nyc gun license proof of residence',
    'Create a clear evidence guide based on current official instructions. Keep case-specific residency questions behind the attorney-referral seam.',
    1,
    true
  ),
  (
    'guide',
    'What to Prepare Before Starting the NYPD Online Application',
    'prepare-before-nypd-handgun-application',
    'nyc handgun application documents checklist',
    'Build an original preparation guide that helps applicants organize their own filing without requesting or handling their NYPD portal credentials.',
    2,
    true
  );
