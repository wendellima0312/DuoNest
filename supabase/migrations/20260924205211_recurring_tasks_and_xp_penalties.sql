create extension if not exists pg_cron with schema pg_catalog;

alter table public.tasks
add column if not exists last_penalized_due_at timestamptz;

alter table public.task_completions
add column if not exists cycle_due_at timestamptz;

update public.task_completions as completion
set cycle_due_at = coalesce(task.due_at, task.created_at)
from public.tasks as task
where task.id = completion.task_id
  and completion.cycle_due_at is null;

alter table public.task_completions
alter column cycle_due_at set not null;

drop index if exists public.task_completions_task_id_uidx;

create unique index if not exists task_completions_task_cycle_uidx
on public.task_completions (task_id, cycle_due_at);

alter table public.xp_transactions
add column if not exists cycle_due_at timestamptz;

create unique index if not exists xp_transactions_missed_task_cycle_uidx
on public.xp_transactions (source_id, user_id, cycle_due_at)
where source_type = 'task_missed';

create or replace function private.next_task_due_at(
  current_due_at timestamptz,
  recurrence public.recurrence_type,
  reference_at timestamptz default now()
)
returns timestamptz
language plpgsql
immutable
set search_path = ''
as $$
declare
  next_due_at timestamptz;
  step interval;
begin
  step := case recurrence
    when 'daily' then interval '1 day'
    when 'weekly' then interval '1 week'
    when 'biweekly' then interval '2 weeks'
    when 'monthly' then interval '1 month'
    else null
  end;

  if step is null then
    return current_due_at;
  end if;

  next_due_at := coalesce(current_due_at, reference_at) + step;
  while next_due_at <= reference_at loop
    next_due_at := next_due_at + step;
  end loop;

  return next_due_at;
end;
$$;

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
  new.cycle_due_at := coalesce(task_row.due_at, task_row.created_at);
  return new;
end;
$$;

create or replace function private.capture_task_resolution()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status is distinct from 'resolved' and new.status = 'resolved' and (select auth.uid()) is not null then
    insert into public.task_completions (task_id, home_id, completed_by, xp_awarded, cycle_due_at)
    values (new.id, new.home_id, (select auth.uid()), new.xp, coalesce(new.due_at, new.created_at))
    on conflict (task_id, cycle_due_at) do nothing;

    if new.recurrence <> 'none' and new.recurrence <> 'custom' then
      update public.tasks
      set status = 'open',
          due_at = private.next_task_due_at(new.due_at, new.recurrence, now()),
          last_penalized_due_at = null
      where id = new.id;
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.process_overdue_tasks()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  task_row public.tasks%rowtype;
  responsible_id uuid;
  current_profile_xp integer;
  current_home_xp integer;
  user_penalty integer;
  home_penalty integer;
  processed_count integer := 0;
begin
  for task_row in
    select task.*
    from public.tasks as task
    where task.status <> 'resolved'
      and task.due_at is not null
      and task.due_at < now()
      and task.last_penalized_due_at is distinct from task.due_at
    order by task.due_at
    for update skip locked
  loop
    for responsible_id in
      select member.user_id
      from public.home_members as member
      where member.home_id = task_row.home_id
        and (
          (task_row.assigned_to is not null and member.user_id = task_row.assigned_to)
          or (
            task_row.assigned_to is null
            and (
              (task_row.assignment = 'self' and member.user_id = task_row.created_by)
              or (task_row.assignment in ('both', 'home'))
              or (
                task_row.assignment = 'partner'
                and member.user_id = (
                  select partner.user_id
                  from public.home_members as partner
                  where partner.home_id = task_row.home_id
                    and partner.user_id <> task_row.created_by
                  order by partner.joined_at
                  limit 1
                )
              )
            )
          )
        )
    loop
      select profile.xp into current_profile_xp
      from public.profiles as profile
      where profile.id = responsible_id
      for update;

      user_penalty := least(coalesce(current_profile_xp, 0), task_row.xp);

      update public.profiles as profile
      set xp = greatest(0, profile.xp - task_row.xp),
          tasks_late = profile.tasks_late + 1,
          level = coalesce(
            (
              select max(level.level)
              from public.levels as level
              where level.xp_required <= greatest(0, profile.xp - task_row.xp)
            ),
            1
          ),
          updated_at = now()
      where profile.id = responsible_id;

      if user_penalty > 0 then
        insert into public.xp_transactions (
          home_id, user_id, amount, source_type, source_id, reason, cycle_due_at
        )
        values (
          task_row.home_id, responsible_id, -user_penalty, 'task_missed', task_row.id,
          'Tarefa nao concluida no prazo', task_row.due_at
        )
        on conflict (source_id, user_id, cycle_due_at)
        where source_type = 'task_missed'
        do nothing;
      end if;

      insert into public.notifications (home_id, user_id, type, title, body)
      values (
        task_row.home_id,
        responsible_id,
        'xp',
        'Tarefa atrasada',
        case when user_penalty > 0
          then format('Voce perdeu %s XP por nao concluir "%s" no prazo.', user_penalty, task_row.title)
          else format('A tarefa "%s" nao foi concluida no prazo.', task_row.title)
        end
      );
    end loop;

    select home.xp into current_home_xp
    from public.homes as home
    where home.id = task_row.home_id
    for update;

    home_penalty := least(coalesce(current_home_xp, 0), task_row.xp);

    update public.homes as home
    set xp = greatest(0, home.xp - task_row.xp),
        level = coalesce(
          (
            select max(level.level)
            from public.levels as level
            where level.xp_required <= greatest(0, home.xp - task_row.xp)
          ),
          1
        ),
        updated_at = now()
    where home.id = task_row.home_id;

    insert into public.activity_log (home_id, actor_id, action, entity_type, entity_id, metadata)
    values (
      task_row.home_id,
      null,
      'nao concluiu uma tarefa no prazo',
      'task',
      task_row.id,
      jsonb_build_object('xp_lost', home_penalty, 'cycle_due_at', task_row.due_at)
    );

    update public.tasks
    set last_penalized_due_at = task_row.due_at,
        due_at = case
          when task_row.recurrence not in ('none', 'custom')
            then private.next_task_due_at(task_row.due_at, task_row.recurrence, now())
          else task_row.due_at
        end,
        status = 'open'
    where id = task_row.id;

    processed_count := processed_count + 1;
  end loop;

  return processed_count;
end;
$$;

revoke all on function private.next_task_due_at(timestamptz, public.recurrence_type, timestamptz) from public, anon, authenticated;
revoke all on function private.process_overdue_tasks() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('duonest-process-overdue-tasks');
exception
  when others then null;
end;
$$;

select cron.schedule(
  'duonest-process-overdue-tasks',
  '*/15 * * * *',
  'select private.process_overdue_tasks();'
);

select private.process_overdue_tasks();
