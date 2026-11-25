-- Keep private editorial research off the public REST surface. Public readers
-- use a narrow projection; the base table remains admin-only under RLS.

drop policy if exists blog_posts_public_read on public.blog_posts;
revoke all on public.blog_posts from anon;

create view public.public_blog_posts
with (security_barrier = true, security_invoker = false)
as
select
  id,
  slug,
  title,
  description,
  tag,
  target_query,
  content_markdown,
  automation_assisted,
  published_at,
  updated_at
from public.blog_posts
where status = 'published';

revoke all on public.public_blog_posts from public;
grant select on public.public_blog_posts to anon, authenticated;

