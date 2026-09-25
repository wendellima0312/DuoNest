create or replace function private.audit_membership_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  actor_id uuid := (select auth.uid());
  member_name text;
begin
  if actor_id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  select profile.display_name into member_name
  from public.profiles as profile
  where profile.id = (row_data ->> 'user_id')::uuid;

  insert into public.activity_log (home_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    (row_data ->> 'home_id')::uuid,
    actor_id,
    case when tg_op = 'DELETE' then 'removeu uma pessoa da casa' else 'adicionou uma pessoa a casa' end,
    'member',
    (row_data ->> 'id')::uuid,
    jsonb_build_object('title', coalesce(member_name, 'Novo morador'))
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.audit_invite_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null then return new; end if;

  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.activity_log (home_id, actor_id, action, entity_type, entity_id, metadata)
    values (
      new.home_id,
      actor_id,
      case when tg_op = 'INSERT' then 'criou um convite' else 'aceitou um convite' end,
      'invite',
      new.id,
      jsonb_build_object('title', coalesce(new.email, new.code))
    );
  end if;
  return new;
end;
$$;

create or replace function private.audit_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership record;
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null
     or (old.display_name is not distinct from new.display_name and old.avatar_url is not distinct from new.avatar_url) then
    return new;
  end if;

  for membership in select member.home_id from public.home_members as member where member.user_id = new.id loop
    insert into public.activity_log (home_id, actor_id, action, entity_type, entity_id, metadata)
    values (membership.home_id, actor_id, 'atualizou o perfil', 'profile', new.id, jsonb_build_object('title', new.display_name));
  end loop;
  return new;
end;
$$;

create or replace function private.audit_home_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null
     or (old.name is not distinct from new.name and old.image_url is not distinct from new.image_url and old.settings is not distinct from new.settings) then
    return new;
  end if;

  insert into public.activity_log (home_id, actor_id, action, entity_type, entity_id, metadata)
  values (new.id, actor_id, 'atualizou as configuracoes da casa', 'home', new.id, jsonb_build_object('title', new.name));
  return new;
end;
$$;

drop trigger if exists home_members_audit_household on public.home_members;
create trigger home_members_audit_household
after insert or delete on public.home_members
for each row execute function private.audit_membership_change();

drop trigger if exists home_invites_audit_household on public.home_invites;
create trigger home_invites_audit_household
after insert or update on public.home_invites
for each row execute function private.audit_invite_change();

drop trigger if exists profiles_audit_household on public.profiles;
create trigger profiles_audit_household
after update on public.profiles
for each row execute function private.audit_profile_change();

drop trigger if exists homes_audit_household on public.homes;
create trigger homes_audit_household
after update on public.homes
for each row execute function private.audit_home_change();

revoke all on function private.audit_membership_change() from public, anon, authenticated;
revoke all on function private.audit_invite_change() from public, anon, authenticated;
revoke all on function private.audit_profile_change() from public, anon, authenticated;
revoke all on function private.audit_home_change() from public, anon, authenticated;
