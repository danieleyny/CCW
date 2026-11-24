-- Record the human/legal review checkpoint separately from workflow status.
-- A review-required item cannot be marked published until this is recorded.

alter table public.seo_content_items
  add column legal_reviewed_at timestamptz,
  add column legal_reviewed_by uuid references public.profiles(id) on delete set null;

alter table public.seo_content_items
  add constraint seo_published_url_required
    check (status <> 'published' or published_url is not null),
  add constraint seo_legal_review_before_publish
    check (
      status <> 'published'
      or not needs_legal_review
      or legal_reviewed_at is not null
    );
