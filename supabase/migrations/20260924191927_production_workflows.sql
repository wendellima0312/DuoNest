create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Morador'),
    new.email
  )
  on conflict (id) do update
  set email = excluded.email,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists auth_user_create_profile on auth.users;
create trigger auth_user_create_profile
after insert or update of email on auth.users
for each row execute function private.handle_new_user();

insert into public.profiles (id, display_name, email)
select
  id,
  coalesce(nullif(trim(raw_user_meta_data ->> 'display_name'), ''), split_part(email, '@', 1), 'Morador'),
  email
from auth.users
on conflict (id) do update
set email = excluded.email,
    updated_at = now();

create unique index if not exists task_completions_task_id_uidx
on public.task_completions (task_id);

create unique index if not exists mission_completions_mission_id_uidx
on public.mission_completions (mission_id);

create or replace function private.prepare_task_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  task_row public.tasks%rowtype;
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  select * into task_row
  from public.tasks
  where id = new.task_id;

  if task_row.id is null or task_row.status <> 'resolved' then
    raise exception 'Task must be resolved before completion';
  end if;

  new.home_id := task_row.home_id;
  new.completed_by := actor_id;
  new.xp_awarded := task_row.xp;
  return new;
end;
$$;

create trigger task_completions_prepare
before insert on public.task_completions
for each row execute function private.prepare_task_completion();

create or replace function private.award_task_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles as profile
  set xp = profile.xp + new.xp_awarded,
      tasks_completed = profile.tasks_completed + 1,
      level = coalesce(
        (select max(level.level) from public.levels as level where level.xp_required <= profile.xp + new.xp_awarded),
        profile.level
      ),
      updated_at = now()
  where profile.id = new.completed_by;

  update public.homes as home
  set xp = home.xp + new.xp_awarded,
      level = coalesce(
        (select max(level.level) from public.levels as level where level.xp_required <= home.xp + new.xp_awarded),
        home.level
      ),
      updated_at = now()
  where home.id = new.home_id;

  insert into public.xp_transactions (home_id, user_id, amount, source_type, source_id, reason)
  values (new.home_id, new.completed_by, new.xp_awarded, 'task', new.task_id, 'Tarefa concluida');

  insert into public.activity_log (home_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    new.home_id,
    new.completed_by,
    'concluiu uma tarefa',
    'task',
    new.task_id,
    jsonb_build_object('xp', new.xp_awarded)
  );

  insert into public.user_achievements (user_id, home_id, achievement_id)
  select new.completed_by, new.home_id, achievement.id
  from public.achievements as achievement
  join public.profiles as profile on profile.id = new.completed_by
  where achievement.code in ('home_in_order_50', 'organization_master_100')
    and achievement.threshold <= profile.tasks_completed
  on conflict (user_id, home_id, achievement_id) do nothing;

  return new;
end;
$$;

create trigger task_completions_award
after insert on public.task_completions
for each row execute function private.award_task_completion();

create or replace function private.capture_task_resolution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from 'resolved' and new.status = 'resolved' and (select auth.uid()) is not null then
    insert into public.task_completions (task_id, home_id, completed_by, xp_awarded)
    values (new.id, new.home_id, (select auth.uid()), new.xp)
    on conflict (task_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger tasks_capture_resolution
after update of status on public.tasks
for each row execute function private.capture_task_resolution();

create or replace function private.prepare_mission_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mission_row public.missions%rowtype;
  actor_id uuid := (select auth.uid());
begin
  if actor_id is null then
    raise exception 'Authentication required';
  end if;

  select * into mission_row
  from public.missions
  where id = new.mission_id;

  if mission_row.id is null then
    raise exception 'Mission not found';
  end if;

  new.home_id := mission_row.home_id;
  new.completed_by := actor_id;
  new.xp_awarded := mission_row.xp;
  return new;
end;
$$;

create trigger mission_completions_prepare
before insert on public.mission_completions
for each row execute function private.prepare_mission_completion();

create or replace function private.award_mission_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles as profile
  set xp = profile.xp + new.xp_awarded,
      missions_completed = profile.missions_completed + 1,
      level = coalesce(
        (select max(level.level) from public.levels as level where level.xp_required <= profile.xp + new.xp_awarded),
        profile.level
      ),
      updated_at = now()
  where profile.id = new.completed_by;

  update public.homes as home
  set xp = home.xp + new.xp_awarded,
      level = coalesce(
        (select max(level.level) from public.levels as level where level.xp_required <= home.xp + new.xp_awarded),
        home.level
      ),
      updated_at = now()
  where home.id = new.home_id;

  insert into public.xp_transactions (home_id, user_id, amount, source_type, source_id, reason)
  values (new.home_id, new.completed_by, new.xp_awarded, 'mission', new.mission_id, 'Missao concluida');

  insert into public.activity_log (home_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    new.home_id,
    new.completed_by,
    'concluiu uma missao',
    'mission',
    new.mission_id,
    jsonb_build_object('xp', new.xp_awarded)
  );

  insert into public.user_achievements (user_id, home_id, achievement_id)
  select new.completed_by, new.home_id, achievement.id
  from public.achievements as achievement
  where achievement.code = 'first_mission'
  on conflict (user_id, home_id, achievement_id) do nothing;

  return new;
end;
$$;

create trigger mission_completions_award
after insert on public.mission_completions
for each row execute function private.award_mission_completion();

revoke insert, update, delete on public.task_completions from authenticated;
revoke update, delete on public.mission_completions from authenticated;
revoke insert, update, delete on public.xp_transactions, public.activity_log, public.user_achievements from authenticated;

create policy "home_invites_select_recipient"
on public.home_invites for select to authenticated
using (
  status = 'pending'
  and expires_at > now()
  and email is not null
  and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
);

create policy "home_invites_update_recipient"
on public.home_invites for update to authenticated
using (
  status = 'pending'
  and expires_at > now()
  and email is not null
  and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
)
with check (
  accepted_by = (select auth.uid())
  and status = 'accepted'
);

create policy "home_members_insert_invited"
on public.home_members for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.home_invites as invite
    where invite.home_id = home_members.home_id
      and invite.status = 'pending'
      and invite.expires_at > now()
      and invite.email is not null
      and lower(invite.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
);

do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.missions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.attention_points;
exception when duplicate_object then null;
end $$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;
revoke execute on function private.prepare_task_completion() from public, anon, authenticated;
revoke execute on function private.award_task_completion() from public, anon, authenticated;
revoke execute on function private.capture_task_resolution() from public, anon, authenticated;
revoke execute on function private.prepare_mission_completion() from public, anon, authenticated;
revoke execute on function private.award_mission_completion() from public, anon, authenticated;
