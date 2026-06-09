-- CarryPath — private "documents" Storage bucket + policies.
-- Path convention: clients/<client_id>/<document_id>/<filename>
-- Access is gated by public.client_visible(<client_id>) so a client only ever
-- touches their own files; assigned staff and admin see the rest.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Safely extract the <client_id> segment from an object path (null if not ours).
create or replace function public.storage_doc_client_id(path text)
returns uuid
language sql immutable
as $$
  select case
    when (storage.foldername(path))[1] = 'clients'
      and coalesce(array_length(storage.foldername(path), 1), 0) >= 2
      and (storage.foldername(path))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then ((storage.foldername(path))[2])::uuid
    else null
  end
$$;

create policy documents_storage_select on storage.objects for select
  using (
    bucket_id = 'documents'
    and public.client_visible(public.storage_doc_client_id(name))
  );

create policy documents_storage_insert on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and public.client_visible(public.storage_doc_client_id(name))
  );

create policy documents_storage_update on storage.objects for update
  using (
    bucket_id = 'documents'
    and public.client_visible(public.storage_doc_client_id(name))
  )
  with check (
    bucket_id = 'documents'
    and public.client_visible(public.storage_doc_client_id(name))
  );

create policy documents_storage_delete on storage.objects for delete
  using (
    bucket_id = 'documents'
    and public.client_visible(public.storage_doc_client_id(name))
  );
