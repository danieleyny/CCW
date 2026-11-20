-- Let an authenticated client update only their own avatar fields without
-- granting general UPDATE access on profiles. Validation stays inside the
-- database as a second boundary behind the server action.

create or replace function public.update_own_profile_avatar(
  p_kind text,
  p_key text default null,
  p_path text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_old_path text;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_kind is null then
    if p_key is not null or p_path is not null then
      raise exception 'invalid empty avatar' using errcode = '22023';
    end if;
  elsif p_kind = 'animal' then
    if p_key is null
      or p_key not in ('fox', 'panda', 'bear', 'cat', 'dog', 'bunny', 'owl', 'penguin', 'koala', 'lion', 'frog', 'tiger')
      or p_path is not null then
      raise exception 'invalid animal avatar' using errcode = '22023';
    end if;
  elsif p_kind = 'upload' then
    if p_key is not null
      or p_path is null
      or p_path not like v_user_id::text || '/%' then
      raise exception 'invalid uploaded avatar' using errcode = '22023';
    end if;
  else
    raise exception 'invalid avatar kind' using errcode = '22023';
  end if;

  select avatar_path
  into v_old_path
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'profile not found' using errcode = 'P0002';
  end if;

  update public.profiles
  set avatar_kind = p_kind,
      avatar_key = p_key,
      avatar_path = p_path
  where id = v_user_id;

  return v_old_path;
end;
$$;

revoke all on function public.update_own_profile_avatar(text, text, text) from public;
grant execute on function public.update_own_profile_avatar(text, text, text) to authenticated;

comment on function public.update_own_profile_avatar(text, text, text) is
  'Authenticated, owner-scoped avatar update. Returns the replaced upload path for cleanup.';
