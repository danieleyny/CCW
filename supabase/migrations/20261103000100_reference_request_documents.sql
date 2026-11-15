-- Multi-file character-reference uploads.
--
-- A reference may upload a two-page scan as two images, several PDFs, or a
-- mixture of both. Keep every file tied to the token-scoped request while it is
-- being assembled; reference_requests.document_id remains the primary document
-- used by older consumers after the set is finalized.

create table public.reference_request_documents (
  id                   uuid primary key default gen_random_uuid(),
  reference_request_id uuid not null references public.reference_requests(id) on delete cascade,
  document_id          uuid not null unique references public.documents(id) on delete cascade,
  position             integer not null check (position > 0),
  created_at           timestamptz not null default now(),
  unique (reference_request_id, position)
);

create index idx_reference_request_documents_request
  on public.reference_request_documents (reference_request_id, position);

grant select, insert, update, delete on public.reference_request_documents to authenticated;

alter table public.reference_request_documents enable row level security;

create policy reference_request_documents_select
  on public.reference_request_documents for select
  using (
    exists (
      select 1
      from public.reference_requests rr
      where rr.id = reference_request_id
        and public.case_visible(rr.case_id)
    )
  );

create policy reference_request_documents_write
  on public.reference_request_documents for all
  using (
    exists (
      select 1
      from public.reference_requests rr
      where rr.id = reference_request_id
        and public.case_visible(rr.case_id)
    )
  )
  with check (
    exists (
      select 1
      from public.reference_requests rr
      where rr.id = reference_request_id
        and public.case_visible(rr.case_id)
    )
  );

-- Preserve the relationship for references completed before this migration.
insert into public.reference_request_documents (reference_request_id, document_id, position)
select id, document_id, 1
from public.reference_requests
where document_id is not null
on conflict (document_id) do nothing;

comment on table public.reference_request_documents is
  'Ordered files uploaded by a character reference. The public token flow writes through service-role actions.';
