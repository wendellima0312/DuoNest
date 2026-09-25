alter table public.profiles
add column if not exists avatar_config jsonb;

alter table public.profiles
add constraint profiles_avatar_config_object_check
check (avatar_config is null or jsonb_typeof(avatar_config) = 'object');

create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  day_scope text not null default 'anyday' check (day_scope in ('anyday', 'business_days', 'weekends', 'specific')),
  scheduled_date date,
  start_time time not null,
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 720),
  room text not null default 'Sala' check (room in ('Sala', 'Cozinha', 'Quarto', 'Banheiro', 'Escritorio', 'Area externa')),
  responsible_id uuid references public.profiles(id) on delete set null,
  status text not null default 'planned' check (status in ('planned', 'completed', 'cancelled')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((day_scope = 'specific' and scheduled_date is not null) or day_scope <> 'specific')
);

create table public.home_presence (
  home_id uuid not null references public.homes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  room text not null default 'Sala' check (room in ('Sala', 'Cozinha', 'Quarto', 'Banheiro', 'Escritorio', 'Area externa')),
  updated_at timestamptz not null default now(),
  primary key (home_id, user_id)
);

create index schedule_items_home_scope_time_idx
on public.schedule_items (home_id, day_scope, start_time);

create index schedule_items_home_date_idx
on public.schedule_items (home_id, scheduled_date)
where scheduled_date is not null;

create trigger schedule_items_set_updated_at
before update on public.schedule_items
for each row execute function public.set_updated_at();

alter table public.schedule_items enable row level security;
alter table public.home_presence enable row level security;

grant select, insert, update, delete on public.schedule_items, public.home_presence to authenticated;

create policy "schedule_items_select_members" on public.schedule_items
for select to authenticated using ((select private.is_home_member(home_id)));
create policy "schedule_items_insert_members" on public.schedule_items
for insert to authenticated with check ((select private.is_home_member(home_id)) and created_by = (select auth.uid()));
create policy "schedule_items_update_members" on public.schedule_items
for update to authenticated using ((select private.is_home_member(home_id))) with check ((select private.is_home_member(home_id)));
create policy "schedule_items_delete_members" on public.schedule_items
for delete to authenticated using ((select private.is_home_member(home_id)));

create policy "home_presence_select_members" on public.home_presence
for select to authenticated using ((select private.is_home_member(home_id)));
create policy "home_presence_insert_self" on public.home_presence
for insert to authenticated with check ((select private.is_home_member(home_id)) and user_id = (select auth.uid()));
create policy "home_presence_update_self" on public.home_presence
for update to authenticated using (user_id = (select auth.uid()))
with check ((select private.is_home_member(home_id)) and user_id = (select auth.uid()));
create policy "home_presence_delete_self" on public.home_presence
for delete to authenticated using (user_id = (select auth.uid()));

create or replace function private.next_task_due_at(
  current_due_at timestamptz,
  recurrence public.recurrence_type,
  reference_at timestamptz default now()
)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  next_due_at timestamptz;
  step interval;
  local_weekday integer;
begin
  step := case recurrence
    when 'daily' then interval '1 day'
    when 'business_days' then interval '1 day'
    when 'weekends' then interval '1 day'
    when 'weekly' then interval '1 week'
    when 'biweekly' then interval '2 weeks'
    when 'monthly' then interval '1 month'
    else null
  end;

  if step is null then return current_due_at; end if;
  next_due_at := coalesce(current_due_at, reference_at) + step;

  loop
    local_weekday := extract(isodow from next_due_at at time zone 'America/Bahia');
    exit when next_due_at > reference_at
      and (recurrence <> 'business_days' or local_weekday between 1 and 5)
      and (recurrence <> 'weekends' or local_weekday in (6, 7));
    next_due_at := next_due_at + step;
  end loop;

  return next_due_at;
end;
$$;

create or replace function private.audit_occupation_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  action_label text;
  item_label text;
begin
  if actor_id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_table_name = 'home_presence' then
    action_label := 'mudou de ambiente na casa';
    item_label := row_data ->> 'room';
  else
    item_label := row_data ->> 'title';
    action_label := case
      when tg_op = 'INSERT' then 'adicionou uma atividade a agenda'
      when tg_op = 'DELETE' then 'removeu uma atividade da agenda'
      when old.status is distinct from new.status and new.status = 'completed' then 'concluiu uma atividade da agenda'
      else 'atualizou uma atividade da agenda'
    end;
  end if;

  insert into public.activity_log (home_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    (row_data ->> 'home_id')::uuid,
    actor_id,
    action_label,
    case when tg_table_name = 'home_presence' then 'presence' else 'schedule' end,
    case when tg_table_name = 'home_presence' then null else (row_data ->> 'id')::uuid end,
    jsonb_build_object('title', item_label, 'status', row_data ->> 'status')
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists schedule_items_audit_household on public.schedule_items;
create trigger schedule_items_audit_household
after insert or update or delete on public.schedule_items
for each row execute function private.audit_occupation_change();

drop trigger if exists home_presence_audit_household on public.home_presence;
create trigger home_presence_audit_household
after insert or update on public.home_presence
for each row execute function private.audit_occupation_change();

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
     or (
       old.display_name is not distinct from new.display_name
       and old.avatar_url is not distinct from new.avatar_url
       and old.avatar_config is not distinct from new.avatar_config
     ) then return new;
  end if;

  for membership in select member.home_id from public.home_members as member where member.user_id = new.id loop
    insert into public.activity_log (home_id, actor_id, action, entity_type, entity_id, metadata)
    values (membership.home_id, actor_id, 'atualizou o perfil', 'profile', new.id, jsonb_build_object('title', new.display_name));
  end loop;
  return new;
end;
$$;

do $$ begin
  alter publication supabase_realtime add table public.schedule_items;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.home_presence;
exception when duplicate_object then null; end $$;

revoke all on function private.next_task_due_at(timestamptz, public.recurrence_type, timestamptz) from public, anon, authenticated;
revoke all on function private.audit_occupation_change() from public, anon, authenticated;
revoke all on function private.audit_profile_change() from public, anon, authenticated;
