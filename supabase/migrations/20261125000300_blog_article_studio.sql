-- Admin-authored blog articles with an explicit human publication gate.
--
-- The existing seo_content_items table remains the planning queue. This table
-- stores the actual editable article. Public readers can see only published
-- rows; drafts, source notes and review metadata stay admin-only through RLS.

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  seo_content_item_id uuid unique references public.seo_content_items(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'approved', 'published', 'archived')),
  title text not null check (char_length(title) between 5 and 180),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 180),
  tag text not null default 'Guide' check (char_length(tag) between 2 and 50),
  target_query text,
  content_markdown text not null default '',
  source_urls jsonb not null default '[]'::jsonb
    check (jsonb_typeof(source_urls) = 'array'),
  source_notes text,
  automation_assisted boolean not null default false,
  needs_legal_review boolean not null default true,
  fact_checked_at timestamptz,
  fact_checked_by uuid references public.profiles(id) on delete set null,
  legal_reviewed_at timestamptz,
  legal_reviewed_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_publish_content_required check (
    status <> 'published'
    or (
      char_length(description) between 50 and 180
      and char_length(content_markdown) >= 500
      and jsonb_array_length(source_urls) >= 1
      and fact_checked_at is not null
      and (not needs_legal_review or legal_reviewed_at is not null)
      and published_at is not null
    )
  )
);

create index blog_posts_publication_idx
  on public.blog_posts (status, published_at desc nulls last, updated_at desc);

create trigger trg_blog_posts_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

alter table public.blog_posts enable row level security;

grant select on public.blog_posts to anon;
grant select, insert, update, delete on public.blog_posts to authenticated;

-- Public visitors receive only the fields from rows that have cleared every
-- database publication constraint. Drafts and private research never leak.
create policy blog_posts_public_read
  on public.blog_posts for select
  to anon, authenticated
  using (status = 'published');

create policy blog_posts_admin_read_all
  on public.blog_posts for select
  to authenticated
  using (public.is_admin());

create policy blog_posts_admin_insert
  on public.blog_posts for insert
  to authenticated
  with check (public.is_admin());

create policy blog_posts_admin_update
  on public.blog_posts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy blog_posts_admin_delete
  on public.blog_posts for delete
  to authenticated
  using (public.is_admin());

