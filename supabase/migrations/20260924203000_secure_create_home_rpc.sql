create or replace function public.create_home(
  home_name text,
  display_name text,
  routine_names text[] default '{}'::text[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_home_id uuid := gen_random_uuid();
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if length(trim(home_name)) < 2 or length(trim(home_name)) > 120 then
    raise exception 'Invalid home name' using errcode = '22023';
  end if;

  if length(trim(display_name)) < 2 or length(trim(display_name)) > 120 then
    raise exception 'Invalid display name' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.home_members as member
    where member.user_id = current_user_id
  ) then
    raise exception 'User already belongs to a home' using errcode = '23505';
  end if;

  insert into public.profiles (id, display_name, email)
  values (
    current_user_id,
    trim(display_name),
    nullif(auth.jwt() ->> 'email', '')
  )
  on conflict (id) do update
  set display_name = excluded.display_name,
      email = coalesce(excluded.email, public.profiles.email);

  insert into public.homes (id, name, created_by)
  values (new_home_id, trim(home_name), current_user_id);

  insert into public.shopping_lists (home_id, name, created_by)
  values (new_home_id, 'Lista principal', current_user_id);

  insert into public.tasks (
    home_id,
    title,
    category,
    assignment,
    recurrence,
    xp,
    created_by
  )
  select
    new_home_id,
    trim(routine_name),
    trim(routine_name),
    'both'::public.assignment_scope,
    'weekly'::public.recurrence_type,
    20,
    current_user_id
  from unnest(coalesce(routine_names, '{}'::text[])) as routine_name
  where length(trim(routine_name)) between 2 and 120
  limit 20;

  return new_home_id;
end;
$$;

revoke all on function public.create_home(text, text, text[]) from public, anon;
grant execute on function public.create_home(text, text, text[]) to authenticated;
