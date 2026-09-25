create table public.household_expenses (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  description text not null check (length(trim(description)) > 0),
  category text not null default 'Outros',
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_plans (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  plan_type text not null default 'other' check (plan_type in ('purchase', 'improvement', 'maintenance', 'other')),
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  target_date date,
  estimated_cost numeric(12,2) check (estimated_cost is null or estimated_cost >= 0),
  responsible_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index household_expenses_home_date_idx
on public.household_expenses (home_id, expense_date desc);

create index household_plans_home_status_date_idx
on public.household_plans (home_id, status, target_date);

create trigger household_expenses_set_updated_at
before update on public.household_expenses
for each row execute function public.set_updated_at();

create trigger household_plans_set_updated_at
before update on public.household_plans
for each row execute function public.set_updated_at();

alter table public.household_expenses enable row level security;
alter table public.household_plans enable row level security;

grant select, insert, update, delete on public.household_expenses, public.household_plans to authenticated;

create policy "household_expenses_select_members"
on public.household_expenses for select to authenticated
using ((select private.is_home_member(home_id)));

create policy "household_expenses_insert_members"
on public.household_expenses for insert to authenticated
with check ((select private.is_home_member(home_id)) and created_by = (select auth.uid()));

create policy "household_expenses_update_members"
on public.household_expenses for update to authenticated
using ((select private.is_home_member(home_id)))
with check ((select private.is_home_member(home_id)));

create policy "household_expenses_delete_members"
on public.household_expenses for delete to authenticated
using ((select private.is_home_member(home_id)));

create policy "household_plans_select_members"
on public.household_plans for select to authenticated
using ((select private.is_home_member(home_id)));

create policy "household_plans_insert_members"
on public.household_plans for insert to authenticated
with check ((select private.is_home_member(home_id)) and created_by = (select auth.uid()));

create policy "household_plans_update_members"
on public.household_plans for update to authenticated
using ((select private.is_home_member(home_id)))
with check ((select private.is_home_member(home_id)));

create policy "household_plans_delete_members"
on public.household_plans for delete to authenticated
using ((select private.is_home_member(home_id)));

create or replace function private.enforce_task_deadline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if old.status is distinct from 'resolved'
     and new.status = 'resolved'
     and old.due_at is not null
     and old.due_at < now() then
    raise exception using
      errcode = 'P0001',
      message = 'TASK_OVERDUE_EXTEND_REQUIRED';
  end if;

  if actor_id is not null
     and old.due_at is not null
     and old.due_at < now()
     and new.due_at is distinct from old.due_at then
    if actor_id <> old.created_by then
      raise exception using
        errcode = 'P0001',
        message = 'ONLY_TASK_CREATOR_CAN_EXTEND';
    end if;

    if new.due_at is null or new.due_at <= now() then
      raise exception using
        errcode = 'P0001',
        message = 'TASK_EXTENSION_MUST_BE_FUTURE';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_enforce_deadline on public.tasks;
create trigger tasks_enforce_deadline
before update on public.tasks
for each row execute function private.enforce_task_deadline();

create or replace function private.audit_household_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  old_data jsonb;
  target_home_id uuid;
  target_id uuid;
  actor_id uuid := (select auth.uid());
  entity_name text := tg_argv[0];
  label_key text := tg_argv[1];
  item_label text;
  action_label text;
begin
  if actor_id is null then
    return coalesce(new, old);
  end if;

  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  old_data := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  target_home_id := (row_data ->> 'home_id')::uuid;
  target_id := (row_data ->> 'id')::uuid;
  item_label := coalesce(row_data ->> label_key, entity_name);

  if tg_op = 'INSERT' then
    action_label := case entity_name
      when 'task' then 'criou a tarefa'
      when 'shopping' then 'adicionou o item de mercado'
      when 'attention' then 'criou um ponto de atencao'
      when 'record' then 'criou um registro da casa'
      when 'expense' then 'registrou um gasto'
      when 'plan' then 'criou um planejamento'
      else 'criou um item'
    end;
  elsif tg_op = 'DELETE' then
    action_label := case entity_name
      when 'task' then 'removeu a tarefa'
      when 'shopping' then 'removeu o item de mercado'
      when 'attention' then 'removeu um ponto de atencao'
      when 'record' then 'removeu um registro da casa'
      when 'expense' then 'removeu um gasto'
      when 'plan' then 'removeu um planejamento'
      else 'removeu um item'
    end;
  elsif entity_name = 'task' and old_data ->> 'status' is distinct from row_data ->> 'status' then
    if row_data ->> 'status' = 'resolved' then
      return new;
    elsif old_data ->> 'status' = 'resolved' then
      action_label := 'reabriu a tarefa';
    else
      action_label := 'alterou o andamento da tarefa';
    end if;
  elsif entity_name = 'shopping' and old_data ->> 'bought' is distinct from row_data ->> 'bought' then
    action_label := case when (row_data ->> 'bought')::boolean then 'marcou como comprado' else 'devolveu para a lista' end;
  elsif entity_name = 'attention' and old_data ->> 'status' is distinct from row_data ->> 'status' then
    action_label := case when row_data ->> 'status' = 'resolved' then 'resolveu um ponto de atencao' else 'reabriu um ponto de atencao' end;
  elsif entity_name = 'expense' and old_data ->> 'status' is distinct from row_data ->> 'status' then
    action_label := case when row_data ->> 'status' = 'paid' then 'marcou um gasto como pago' else 'marcou um gasto como pendente' end;
  elsif entity_name = 'plan' and old_data ->> 'status' is distinct from row_data ->> 'status' then
    action_label := 'alterou o andamento do planejamento';
  else
    action_label := case entity_name
      when 'task' then 'atualizou a tarefa'
      when 'shopping' then 'atualizou o item de mercado'
      when 'attention' then 'atualizou um ponto de atencao'
      when 'record' then 'atualizou um registro da casa'
      when 'expense' then 'atualizou um gasto'
      when 'plan' then 'atualizou um planejamento'
      else 'atualizou um item'
    end;
  end if;

  insert into public.activity_log (home_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    target_home_id,
    actor_id,
    action_label,
    entity_name,
    target_id,
    jsonb_build_object('title', item_label, 'status', row_data ->> 'status')
  );

  return coalesce(new, old);
end;
$$;

create or replace function private.notify_household_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  item_label text := new.metadata ->> 'title';
  notification_kind public.notification_type := 'system';
  notification_title text := 'Atualizacao da casa';
  notification_body text;
begin
  select profile.display_name into actor_name
  from public.profiles as profile
  where profile.id = new.actor_id;

  actor_name := coalesce(actor_name, 'DuoNest');
  notification_kind := case new.entity_type
    when 'task' then 'task'::public.notification_type
    when 'mission' then 'mission'::public.notification_type
    when 'shopping' then 'shopping'::public.notification_type
    else 'system'::public.notification_type
  end;
  notification_title := case new.entity_type
    when 'task' then 'Atualizacao de tarefa'
    when 'mission' then 'Missao atualizada'
    when 'shopping' then 'Lista de mercado atualizada'
    when 'expense' then 'Financeiro atualizado'
    when 'plan' then 'Planejamento atualizado'
    else 'Atualizacao da casa'
  end;
  notification_body := actor_name || ' ' || new.action ||
    case when item_label is not null then ': "' || item_label || '".' else '.' end;

  insert into public.notifications (home_id, user_id, type, title, body)
  select new.home_id, member.user_id, notification_kind, notification_title, notification_body
  from public.home_members as member
  where member.home_id = new.home_id
    and not exists (
      select 1
      from public.notifications as recent
      where new.action = 'nao concluiu uma tarefa no prazo'
        and recent.home_id = new.home_id
        and recent.user_id = member.user_id
        and recent.title = 'Tarefa atrasada'
        and recent.created_at >= now() - interval '1 minute'
    );

  return new;
end;
$$;

drop trigger if exists mission_completions_notify_smart on public.mission_completions;

drop trigger if exists activity_log_notify_household on public.activity_log;
create trigger activity_log_notify_household
after insert on public.activity_log
for each row execute function private.notify_household_activity();

drop trigger if exists tasks_audit_household on public.tasks;
create trigger tasks_audit_household after insert or update or delete on public.tasks
for each row execute function private.audit_household_change('task', 'title');

drop trigger if exists shopping_items_audit_household on public.shopping_items;
create trigger shopping_items_audit_household after insert or update or delete on public.shopping_items
for each row execute function private.audit_household_change('shopping', 'product');

drop trigger if exists attention_points_audit_household on public.attention_points;
create trigger attention_points_audit_household after insert or update or delete on public.attention_points
for each row execute function private.audit_household_change('attention', 'title');

drop trigger if exists home_records_audit_household on public.home_records;
create trigger home_records_audit_household after insert or update or delete on public.home_records
for each row execute function private.audit_household_change('record', 'title');

create trigger household_expenses_audit_household after insert or update or delete on public.household_expenses
for each row execute function private.audit_household_change('expense', 'description');

create trigger household_plans_audit_household after insert or update or delete on public.household_plans
for each row execute function private.audit_household_change('plan', 'title');

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.household_expenses;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.household_plans;
exception when duplicate_object then null;
end $$;

revoke all on function private.enforce_task_deadline() from public, anon, authenticated;
revoke all on function private.audit_household_change() from public, anon, authenticated;
revoke all on function private.notify_household_activity() from public, anon, authenticated;
