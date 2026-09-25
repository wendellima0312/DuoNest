alter table public.missions
add column if not exists is_system_generated boolean not null default false,
add column if not exists goal_type text,
add column if not exists goal_category text,
add column if not exists target_count integer,
add column if not exists progress_count integer not null default 0,
add column if not exists period_start timestamptz,
add column if not exists source_key text;

alter table public.missions
drop constraint if exists missions_target_count_check,
add constraint missions_target_count_check check (target_count is null or target_count > 0),
drop constraint if exists missions_progress_count_check,
add constraint missions_progress_count_check check (progress_count >= 0);

create unique index if not exists missions_source_key_uidx
on public.missions (source_key)
where source_key is not null;

create index if not exists missions_assigned_due_idx
on public.missions (assigned_to, due_at)
where is_system_generated;

drop policy if exists "missions_insert_members" on public.missions;
drop policy if exists "missions_update_members" on public.missions;
drop policy if exists "missions_delete_members" on public.missions;
drop policy if exists "mission_completions_insert_members" on public.mission_completions;

revoke insert, update, delete on public.missions from authenticated;
revoke insert, update, delete on public.mission_completions from authenticated;

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
  select * into mission_row
  from public.missions
  where id = new.mission_id;

  if mission_row.id is null then
    raise exception 'Mission not found';
  end if;

  if mission_row.is_system_generated then
    actor_id := mission_row.assigned_to;
  end if;

  if actor_id is null then
    raise exception 'Mission has no responsible user';
  end if;

  new.home_id := mission_row.home_id;
  new.completed_by := actor_id;
  new.xp_awarded := mission_row.xp;
  return new;
end;
$$;

create or replace function private.save_smart_mission(
  mission_home_id uuid,
  mission_user_id uuid,
  mission_name text,
  mission_description text,
  mission_kind public.mission_type,
  mission_goal_type text,
  mission_goal_category text,
  mission_target integer,
  mission_progress integer,
  mission_period_start timestamptz,
  mission_due_at timestamptz,
  mission_xp integer,
  mission_source_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_mission_id uuid;
  saved_target_count integer;
begin
  insert into public.missions (
    home_id,
    name,
    description,
    mission_type,
    assigned_to,
    assignment,
    frequency,
    due_at,
    xp,
    created_by,
    is_system_generated,
    goal_type,
    goal_category,
    target_count,
    progress_count,
    period_start,
    source_key
  )
  values (
    mission_home_id,
    mission_name,
    mission_description,
    mission_kind,
    mission_user_id,
    'self',
    'none',
    mission_due_at,
    mission_xp,
    mission_user_id,
    true,
    mission_goal_type,
    mission_goal_category,
    greatest(1, mission_target),
    greatest(0, mission_progress),
    mission_period_start,
    mission_source_key
  )
  on conflict (source_key) where source_key is not null
  do update set
    progress_count = excluded.progress_count,
    due_at = excluded.due_at,
    updated_at = now()
  returning id, target_count into saved_mission_id, saved_target_count;

  if mission_progress >= saved_target_count then
    insert into public.mission_completions (mission_id, home_id, completed_by, xp_awarded)
    values (saved_mission_id, mission_home_id, mission_user_id, mission_xp)
    on conflict (mission_id) do nothing;
  end if;

  return saved_mission_id;
end;
$$;

create or replace function private.refresh_smart_missions(
  target_home_id uuid,
  target_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_today date := (now() at time zone 'America/Bahia')::date;
  daily_start timestamptz;
  daily_end timestamptz;
  weekly_start timestamptz;
  weekly_end timestamptz;
  recent_count integer;
  progress integer;
  target integer;
  favorite_category text;
  pending_count integer;
  generated_count integer := 0;
begin
  if not exists (
    select 1 from public.home_members
    where home_id = target_home_id and user_id = target_user_id
  ) then
    return 0;
  end if;

  daily_start := local_today::timestamp at time zone 'America/Bahia';
  daily_end := (local_today + 1)::timestamp at time zone 'America/Bahia';
  weekly_start := date_trunc('week', now() at time zone 'America/Bahia') at time zone 'America/Bahia';
  weekly_end := weekly_start + interval '7 days';

  select count(*)::integer into recent_count
  from public.task_completions
  where home_id = target_home_id
    and completed_by = target_user_id
    and completed_at >= daily_start - interval '7 days';

  select count(*)::integer into progress
  from public.task_completions
  where home_id = target_home_id
    and completed_by = target_user_id
    and completed_at >= daily_start
    and completed_at < daily_end;

  target := greatest(1, least(5, ceil(recent_count / 7.0)::integer + 1));

  perform private.save_smart_mission(
    target_home_id,
    target_user_id,
    'Ritmo do dia',
    format('Conclua %s tarefa%s hoje. A meta acompanha o seu ritmo recente.', target, case when target = 1 then '' else 's' end),
    'daily',
    'task_count',
    null,
    target,
    progress,
    daily_start,
    daily_end - interval '1 second',
    15 + target * 5,
    format('%s:daily-tasks:%s', target_user_id, local_today)
  );
  generated_count := generated_count + 1;

  select task.category into favorite_category
  from public.task_completions as completion
  join public.tasks as task on task.id = completion.task_id
  where completion.home_id = target_home_id
    and completion.completed_by = target_user_id
    and completion.completed_at >= weekly_start - interval '28 days'
  group by task.category
  order by count(*) desc, task.category
  limit 1;

  if favorite_category is null then
    select task.category into favorite_category
    from public.tasks as task
    where task.home_id = target_home_id
      and task.status <> 'resolved'
      and (task.assigned_to is null or task.assigned_to = target_user_id)
    group by task.category
    order by count(*) desc, task.category
    limit 1;
  end if;

  if favorite_category is not null then
    select count(*)::integer into recent_count
    from public.task_completions as completion
    join public.tasks as task on task.id = completion.task_id
    where completion.home_id = target_home_id
      and completion.completed_by = target_user_id
      and completion.completed_at >= weekly_start - interval '28 days'
      and task.category = favorite_category;

    select count(*)::integer into progress
    from public.task_completions as completion
    join public.tasks as task on task.id = completion.task_id
    where completion.home_id = target_home_id
      and completion.completed_by = target_user_id
      and completion.completed_at >= weekly_start
      and task.category = favorite_category;

    target := greatest(2, least(6, ceil(recent_count / 4.0)::integer + 1));

    perform private.save_smart_mission(
      target_home_id,
      target_user_id,
      format('Foco em %s', favorite_category),
      format('Conclua %s tarefas de %s nesta semana.', target, favorite_category),
      'weekly',
      'category_tasks',
      favorite_category,
      target,
      progress,
      weekly_start,
      weekly_end - interval '1 second',
      25 + target * 5,
      format('%s:category:%s:%s', target_user_id, lower(favorite_category), to_char(weekly_start, 'IYYY-IW'))
    );
    generated_count := generated_count + 1;
  end if;

  select count(*)::integer into pending_count
  from public.shopping_items
  where home_id = target_home_id and bought = false;

  select count(*)::integer into recent_count
  from public.shopping_items
  where home_id = target_home_id
    and bought_by = target_user_id
    and bought_at >= weekly_start - interval '28 days';

  select count(*)::integer into progress
  from public.shopping_items
  where home_id = target_home_id
    and bought_by = target_user_id
    and bought_at >= weekly_start;

  if pending_count + progress > 0 then

    target := least(pending_count + progress, greatest(2, least(8, ceil(recent_count / 4.0)::integer + 1)));

    perform private.save_smart_mission(
      target_home_id,
      target_user_id,
      'Mercado em movimento',
      format('Marque %s itens da lista como comprados nesta semana.', target),
      'weekly',
      'shopping_items',
      null,
      target,
      progress,
      weekly_start,
      weekly_end - interval '1 second',
      20 + target * 4,
      format('%s:shopping:%s', target_user_id, to_char(weekly_start, 'IYYY-IW'))
    );
    generated_count := generated_count + 1;
  end if;

  select count(*)::integer into pending_count
  from public.attention_points
  where home_id = target_home_id
    and status <> 'resolved'
    and (assigned_to is null or assigned_to = target_user_id);

  select count(*)::integer into progress
  from public.attention_points
  where home_id = target_home_id
    and resolved_by = target_user_id
    and resolved_at >= weekly_start;

  if pending_count + progress > 0 then

    target := least(pending_count + progress, greatest(1, least(4, pending_count)));

    perform private.save_smart_mission(
      target_home_id,
      target_user_id,
      'Cuidado com a casa',
      format('Resolva %s ponto%s de atencao nesta semana.', target, case when target = 1 then '' else 's' end),
      'weekly',
      'attention_points',
      null,
      target,
      progress,
      weekly_start,
      weekly_end - interval '1 second',
      25 + target * 10,
      format('%s:attention:%s', target_user_id, to_char(weekly_start, 'IYYY-IW'))
    );
    generated_count := generated_count + 1;
  end if;

  return generated_count;
end;
$$;

create or replace function private.refresh_all_smart_missions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_row record;
  refreshed_count integer := 0;
begin
  for member_row in select home_id, user_id from public.home_members loop
    perform private.refresh_smart_missions(member_row.home_id, member_row.user_id);
    refreshed_count := refreshed_count + 1;
  end loop;
  return refreshed_count;
end;
$$;

create or replace function private.refresh_missions_after_task_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_smart_missions(new.home_id, new.completed_by);
  return new;
end;
$$;

create or replace function private.refresh_missions_after_shopping()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.bought = false and new.bought = true and new.bought_by is not null then
    perform private.refresh_smart_missions(new.home_id, new.bought_by);
  end if;
  return new;
end;
$$;

create or replace function private.refresh_missions_after_attention()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from 'resolved' and new.status = 'resolved' and new.resolved_by is not null then
    perform private.refresh_smart_missions(new.home_id, new.resolved_by);
  end if;
  return new;
end;
$$;

create or replace function private.refresh_missions_after_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_smart_missions(new.home_id, new.user_id);
  return new;
end;
$$;

create or replace function private.notify_smart_mission_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mission_row public.missions%rowtype;
begin
  select * into mission_row from public.missions where id = new.mission_id;
  if mission_row.is_system_generated then
    insert into public.notifications (home_id, user_id, type, title, body)
    values (
      new.home_id,
      new.completed_by,
      'mission',
      'Missao inteligente concluida',
      format('Voce concluiu "%s" e ganhou %s XP.', mission_row.name, new.xp_awarded)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists task_completions_refresh_smart_missions on public.task_completions;
create trigger task_completions_refresh_smart_missions
after insert on public.task_completions
for each row execute function private.refresh_missions_after_task_completion();

drop trigger if exists shopping_items_refresh_smart_missions on public.shopping_items;
create trigger shopping_items_refresh_smart_missions
after update of bought on public.shopping_items
for each row execute function private.refresh_missions_after_shopping();

drop trigger if exists attention_points_refresh_smart_missions on public.attention_points;
create trigger attention_points_refresh_smart_missions
after update of status on public.attention_points
for each row execute function private.refresh_missions_after_attention();

drop trigger if exists home_members_refresh_smart_missions on public.home_members;
create trigger home_members_refresh_smart_missions
after insert on public.home_members
for each row execute function private.refresh_missions_after_member();

drop trigger if exists mission_completions_notify_smart on public.mission_completions;
create trigger mission_completions_notify_smart
after insert on public.mission_completions
for each row execute function private.notify_smart_mission_completion();

revoke all on function private.save_smart_mission(uuid, uuid, text, text, public.mission_type, text, text, integer, integer, timestamptz, timestamptz, integer, text) from public, anon, authenticated;
revoke all on function private.refresh_smart_missions(uuid, uuid) from public, anon, authenticated;
revoke all on function private.refresh_all_smart_missions() from public, anon, authenticated;
revoke all on function private.refresh_missions_after_task_completion() from public, anon, authenticated;
revoke all on function private.refresh_missions_after_shopping() from public, anon, authenticated;
revoke all on function private.refresh_missions_after_attention() from public, anon, authenticated;
revoke all on function private.refresh_missions_after_member() from public, anon, authenticated;
revoke all on function private.notify_smart_mission_completion() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('duonest-refresh-smart-missions');
exception
  when others then null;
end;
$$;

select cron.schedule(
  'duonest-refresh-smart-missions',
  '*/30 * * * *',
  'select private.refresh_all_smart_missions();'
);

select private.refresh_all_smart_missions();
