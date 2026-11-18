-- Client profile photos: a curated animal key or a private uploaded crop.
-- Upload paths are always <auth-user-id>/<timestamp>.jpg so Storage RLS can
-- enforce ownership without consulting another table.

alter table public.profiles
  add column avatar_kind text,
  add column avatar_key text,
  add column avatar_path text;

alter table public.profiles
  add constraint profiles_avatar_shape_check
  check (
    (avatar_kind is null and avatar_key is null and avatar_path is null)
    or (
      avatar_kind = 'animal'
      and avatar_key in ('fox', 'panda', 'bear', 'cat', 'dog', 'bunny', 'owl', 'penguin', 'koala', 'lion', 'frog', 'tiger')
      and avatar_path is null
    )
    or (
      avatar_kind = 'upload'
      and avatar_key is null
      and avatar_path is not null
      and avatar_path like id::text || '/%'
    )
  );

comment on column public.profiles.avatar_kind is
  'Client-facing avatar source: a curated animal or a private uploaded crop.';
comment on column public.profiles.avatar_key is
  'Curated animal key. Null unless avatar_kind=animal.';
comment on column public.profiles.avatar_path is
  'Private avatars bucket path. Must begin with this profile/user UUID.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg']::text[])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy avatars_storage_select on storage.objects for select
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_staff_or_admin()
    )
  );

create policy avatars_storage_insert on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_storage_delete on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
