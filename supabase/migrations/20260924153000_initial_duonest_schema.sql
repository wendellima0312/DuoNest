create extension if not exists pgcrypto;

create schema if not exists private;

create type public.member_role as enum ('owner', 'member');
create type public.invite_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type public.priority_level as enum ('low', 'normal', 'high', 'urgent');
create type public.assignment_scope as enum ('self', 'partner', 'both', 'home');
create type public.item_status as enum ('open', 'in_progress', 'resolved');
create type public.recurrence_type as enum ('none', 'daily', 'weekly', 'biweekly', 'monthly', 'custom');
create type public.mission_type as enum ('daily', 'weekly', 'special', 'custom');
create type public.notification_type as enum ('task', 'mission', 'shopping', 'xp', 'invite', 'system');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  avatar_url text,
  level integer not null default 1 check (level > 0),
  xp integer not null default 0 check (xp >= 0),
  tasks_completed integer not null default 0 check (tasks_completed >= 0),
  tasks_late integer not null default 0 check (tasks_late >= 0),
  missions_completed integer not null default 0 check (missions_completed >= 0),
  streak_days integer not null default 0 check (streak_days >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.homes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  level integer not null default 1 check (level > 0),
  xp integer not null default 0 check (xp >= 0),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.home_members (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (home_id, user_id)
);

create or replace function private.create_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.home_members (home_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (home_id, user_id) do nothing;

  return new;
end;
$$;

create trigger homes_create_owner_membership
after insert on public.homes
for each row execute function private.create_owner_membership();

create table public.home_invites (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  code text not null unique,
  email text,
  status public.invite_status not null default 'pending',
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'Outros',
  assigned_to uuid references public.profiles(id) on delete set null,
  assignment public.assignment_scope not null default 'both',
  priority public.priority_level not null default 'normal',
  starts_at timestamptz,
  due_at timestamptz,
  recurrence public.recurrence_type not null default 'none',
  recurrence_rule jsonb not null default '{}'::jsonb,
  xp integer not null default 10 check (xp >= 0),
  status public.item_status not null default 'open',
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  home_id uuid not null references public.homes(id) on delete cascade,
  completed_by uuid not null references public.profiles(id) on delete restrict,
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  completed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null,
  content_type text,
  created_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  title text not null,
  description text,
  remind_at timestamptz not null,
  recurrence public.recurrence_type not null default 'none',
  assigned_to uuid references public.profiles(id) on delete set null,
  priority public.priority_level not null default 'normal',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  name text not null,
  description text,
  mission_type public.mission_type not null default 'custom',
  assigned_to uuid references public.profiles(id) on delete set null,
  assignment public.assignment_scope not null default 'home',
  frequency public.recurrence_type not null default 'none',
  starts_at timestamptz,
  due_at timestamptz,
  xp integer not null default 50 check (xp >= 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mission_completions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  home_id uuid not null references public.homes(id) on delete cascade,
  completed_by uuid not null references public.profiles(id) on delete restrict,
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  amount integer not null check (amount <> 0),
  source_type text not null,
  source_id uuid,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.levels (
  level integer primary key check (level > 0),
  xp_required integer not null check (xp_required >= 0),
  label text not null
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  threshold integer,
  icon text,
  created_at timestamptz not null default now()
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  home_id uuid not null references public.homes(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, home_id, achievement_id)
);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  name text not null,
  category text,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  estimated_total numeric(12,2),
  actual_total numeric(12,2),
  store_name text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  home_id uuid not null references public.homes(id) on delete cascade,
  product text not null,
  quantity text,
  category text,
  notes text,
  responsible_id uuid references public.profiles(id) on delete set null,
  bought boolean not null default false,
  bought_by uuid references public.profiles(id) on delete set null,
  bought_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attention_points (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'Outros',
  created_by uuid not null references public.profiles(id) on delete restrict,
  assigned_to uuid references public.profiles(id) on delete set null,
  priority public.priority_level not null default 'normal',
  status public.item_status not null default 'open',
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attention_point_attachments (
  id uuid primary key default gen_random_uuid(),
  attention_point_id uuid not null references public.attention_points(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null,
  content_type text,
  created_at timestamptz not null default now()
);

create table public.home_records (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'Registro',
  record_date date not null default current_date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.record_attachments (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.home_records(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null,
  content_type text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null default 'system',
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  home_id uuid not null references public.homes(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);
create index homes_created_by_idx on public.homes (created_by);
create index home_members_home_id_idx on public.home_members (home_id);
create index home_members_user_id_idx on public.home_members (user_id);
create index home_invites_home_id_idx on public.home_invites (home_id);
create index tasks_home_id_due_at_idx on public.tasks (home_id, due_at);
create index tasks_assigned_to_idx on public.tasks (assigned_to);
create index task_completions_home_id_idx on public.task_completions (home_id);
create index task_completions_task_id_idx on public.task_completions (task_id);
create index task_attachments_task_id_idx on public.task_attachments (task_id);
create index reminders_home_id_remind_at_idx on public.reminders (home_id, remind_at);
create index missions_home_id_due_at_idx on public.missions (home_id, due_at);
create index mission_completions_home_id_idx on public.mission_completions (home_id);
create index xp_transactions_home_user_idx on public.xp_transactions (home_id, user_id);
create index user_achievements_home_user_idx on public.user_achievements (home_id, user_id);
create index shopping_lists_home_id_idx on public.shopping_lists (home_id);
create index shopping_items_list_id_idx on public.shopping_items (list_id);
create index shopping_items_home_id_idx on public.shopping_items (home_id);
create index attention_points_home_id_status_idx on public.attention_points (home_id, status);
create index attention_point_attachments_point_id_idx on public.attention_point_attachments (attention_point_id);
create index home_records_home_id_date_idx on public.home_records (home_id, record_date desc);
create index record_attachments_record_id_idx on public.record_attachments (record_id);
create index notifications_user_unread_idx on public.notifications (user_id, read_at) where read_at is null;
create index activity_log_home_created_idx on public.activity_log (home_id, created_at desc);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger homes_set_updated_at before update on public.homes for each row execute function public.set_updated_at();
create trigger home_invites_set_updated_at before update on public.home_invites for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger reminders_set_updated_at before update on public.reminders for each row execute function public.set_updated_at();
create trigger missions_set_updated_at before update on public.missions for each row execute function public.set_updated_at();
create trigger shopping_lists_set_updated_at before update on public.shopping_lists for each row execute function public.set_updated_at();
create trigger shopping_items_set_updated_at before update on public.shopping_items for each row execute function public.set_updated_at();
create trigger attention_points_set_updated_at before update on public.attention_points for each row execute function public.set_updated_at();
create trigger home_records_set_updated_at before update on public.home_records for each row execute function public.set_updated_at();

create or replace function private.is_home_member(check_home_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.home_members hm
    where hm.home_id = check_home_id
      and hm.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_home_owner(check_home_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.home_members hm
    where hm.home_id = check_home_id
      and hm.user_id = (select auth.uid())
      and hm.role = 'owner'
  );
$$;

create or replace function private.profile_visible(check_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select check_user_id = (select auth.uid())
    or exists (
      select 1
      from public.home_members mine
      join public.home_members theirs on theirs.home_id = mine.home_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id = check_user_id
    );
$$;

create or replace function private.can_access_task(check_task_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.tasks t
    join public.home_members hm on hm.home_id = t.home_id
    where t.id = check_task_id
      and hm.user_id = (select auth.uid())
  );
$$;

create or replace function private.can_access_attention_point(check_attention_point_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.attention_points p
    join public.home_members hm on hm.home_id = p.home_id
    where p.id = check_attention_point_id
      and hm.user_id = (select auth.uid())
  );
$$;

create or replace function private.can_access_record(check_record_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.home_records r
    join public.home_members hm on hm.home_id = r.home_id
    where r.id = check_record_id
      and hm.user_id = (select auth.uid())
  );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

alter table public.profiles enable row level security;
alter table public.homes enable row level security;
alter table public.home_members enable row level security;
alter table public.home_invites enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.task_attachments enable row level security;
alter table public.reminders enable row level security;
alter table public.missions enable row level security;
alter table public.mission_completions enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.levels enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;
alter table public.attention_points enable row level security;
alter table public.attention_point_attachments enable row level security;
alter table public.home_records enable row level security;
alter table public.record_attachments enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_log enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.homes, public.home_members, public.home_invites, public.tasks, public.task_completions, public.task_attachments, public.reminders, public.missions, public.mission_completions, public.xp_transactions, public.user_achievements, public.shopping_lists, public.shopping_items, public.attention_points, public.attention_point_attachments, public.home_records, public.record_attachments, public.notifications, public.activity_log to authenticated;
grant select on public.levels, public.achievements to authenticated;

create policy "profiles_select_visible" on public.profiles for select to authenticated using ((select private.profile_visible(id)));
create policy "profiles_insert_self" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "homes_select_members" on public.homes for select to authenticated using ((select private.is_home_member(id)));
create policy "homes_insert_creator" on public.homes for insert to authenticated with check (created_by = (select auth.uid()));
create policy "homes_update_owner" on public.homes for update to authenticated using ((select private.is_home_owner(id))) with check ((select private.is_home_owner(id)));
create policy "homes_delete_owner" on public.homes for delete to authenticated using ((select private.is_home_owner(id)));

create policy "home_members_select_home" on public.home_members for select to authenticated using ((select private.is_home_member(home_id)));
create policy "home_members_insert_owner" on public.home_members for insert to authenticated with check ((select private.is_home_owner(home_id)));
create policy "home_members_update_owner" on public.home_members for update to authenticated using ((select private.is_home_owner(home_id))) with check ((select private.is_home_owner(home_id)));
create policy "home_members_delete_owner" on public.home_members for delete to authenticated using ((select private.is_home_owner(home_id)));

create policy "home_invites_select_members" on public.home_invites for select to authenticated using ((select private.is_home_member(home_id)));
create policy "home_invites_insert_owner" on public.home_invites for insert to authenticated with check ((select private.is_home_owner(home_id)) and invited_by = (select auth.uid()));
create policy "home_invites_update_owner_or_acceptor" on public.home_invites for update to authenticated using ((select private.is_home_owner(home_id)) or accepted_by = (select auth.uid())) with check ((select private.is_home_owner(home_id)) or accepted_by = (select auth.uid()));
create policy "home_invites_delete_owner" on public.home_invites for delete to authenticated using ((select private.is_home_owner(home_id)));

create policy "levels_select_all" on public.levels for select to authenticated using (true);
create policy "achievements_select_all" on public.achievements for select to authenticated using (true);

create policy "tasks_select_members" on public.tasks for select to authenticated using ((select private.is_home_member(home_id)));
create policy "tasks_insert_members" on public.tasks for insert to authenticated with check ((select private.is_home_member(home_id)) and created_by = (select auth.uid()));
create policy "tasks_update_members" on public.tasks for update to authenticated using ((select private.is_home_member(home_id))) with check ((select private.is_home_member(home_id)));
create policy "tasks_delete_members" on public.tasks for delete to authenticated using ((select private.is_home_member(home_id)));

create policy "task_completions_select_members" on public.task_completions for select to authenticated using ((select private.is_home_member(home_id)));
create policy "task_completions_insert_members" on public.task_completions for insert to authenticated with check ((select private.is_home_member(home_id)) and completed_by = (select auth.uid()));
create policy "task_completions_update_members" on public.task_completions for update to authenticated using ((select private.is_home_member(home_id))) with check ((select private.is_home_member(home_id)));
create policy "task_completions_delete_owner" on public.task_completions for delete to authenticated using ((select private.is_home_owner(home_id)));

create policy "task_attachments_select_members" on public.task_attachments for select to authenticated using ((select private.can_access_task(task_id)));
create policy "task_attachments_insert_members" on public.task_attachments for insert to authenticated with check ((select private.can_access_task(task_id)) and uploaded_by = (select auth.uid()));
create policy "task_attachments_delete_uploader" on public.task_attachments for delete to authenticated using (uploaded_by = (select auth.uid()));

create policy "reminders_select_members" on public.reminders for select to authenticated using ((select private.is_home_member(home_id)));
create policy "reminders_insert_members" on public.reminders for insert to authenticated with check ((select private.is_home_member(home_id)) and created_by = (select auth.uid()));
create policy "reminders_update_members" on public.reminders for update to authenticated using ((select private.is_home_member(home_id))) with check ((select private.is_home_member(home_id)));
create policy "reminders_delete_members" on public.reminders for delete to authenticated using ((select private.is_home_member(home_id)));

create policy "missions_select_members" on public.missions for select to authenticated using ((select private.is_home_member(home_id)));
create policy "missions_insert_members" on public.missions for insert to authenticated with check ((select private.is_home_member(home_id)) and created_by = (select auth.uid()));
create policy "missions_update_members" on public.missions for update to authenticated using ((select private.is_home_member(home_id))) with check ((select private.is_home_member(home_id)));
create policy "missions_delete_members" on public.missions for delete to authenticated using ((select private.is_home_member(home_id)));

create policy "mission_completions_select_members" on public.mission_completions for select to authenticated using ((select private.is_home_member(home_id)));
create policy "mission_completions_insert_members" on public.mission_completions for insert to authenticated with check ((select private.is_home_member(home_id)) and completed_by = (select auth.uid()));

create policy "xp_transactions_select_members" on public.xp_transactions for select to authenticated using ((select private.is_home_member(home_id)));
create policy "xp_transactions_insert_members" on public.xp_transactions for insert to authenticated with check ((select private.is_home_member(home_id)));

create policy "user_achievements_select_members" on public.user_achievements for select to authenticated using ((select private.is_home_member(home_id)));
create policy "user_achievements_insert_members" on public.user_achievements for insert to authenticated with check ((select private.is_home_member(home_id)) and user_id = (select auth.uid()));

create policy "shopping_lists_select_members" on public.shopping_lists for select to authenticated using ((select private.is_home_member(home_id)));
create policy "shopping_lists_insert_members" on public.shopping_lists for insert to authenticated with check ((select private.is_home_member(home_id)) and created_by = (select auth.uid()));
create policy "shopping_lists_update_members" on public.shopping_lists for update to authenticated using ((select private.is_home_member(home_id))) with check ((select private.is_home_member(home_id)));
create policy "shopping_lists_delete_members" on public.shopping_lists for delete to authenticated using ((select private.is_home_member(home_id)));

create policy "shopping_items_select_members" on public.shopping_items for select to authenticated using ((select private.is_home_member(home_id)));
create policy "shopping_items_insert_members" on public.shopping_items for insert to authenticated with check ((select private.is_home_member(home_id)) and created_by = (select auth.uid()));
create policy "shopping_items_update_members" on public.shopping_items for update to authenticated using ((select private.is_home_member(home_id))) with check ((select private.is_home_member(home_id)));
create policy "shopping_items_delete_members" on public.shopping_items for delete to authenticated using ((select private.is_home_member(home_id)));

create policy "attention_points_select_members" on public.attention_points for select to authenticated using ((select private.is_home_member(home_id)));
create policy "attention_points_insert_members" on public.attention_points for insert to authenticated with check ((select private.is_home_member(home_id)) and created_by = (select auth.uid()));
create policy "attention_points_update_members" on public.attention_points for update to authenticated using ((select private.is_home_member(home_id))) with check ((select private.is_home_member(home_id)));
create policy "attention_points_delete_members" on public.attention_points for delete to authenticated using ((select private.is_home_member(home_id)));

create policy "attention_attachments_select_members" on public.attention_point_attachments for select to authenticated using ((select private.can_access_attention_point(attention_point_id)));
create policy "attention_attachments_insert_members" on public.attention_point_attachments for insert to authenticated with check ((select private.can_access_attention_point(attention_point_id)) and uploaded_by = (select auth.uid()));
create policy "attention_attachments_delete_uploader" on public.attention_point_attachments for delete to authenticated using (uploaded_by = (select auth.uid()));

create policy "home_records_select_members" on public.home_records for select to authenticated using ((select private.is_home_member(home_id)));
create policy "home_records_insert_members" on public.home_records for insert to authenticated with check ((select private.is_home_member(home_id)) and created_by = (select auth.uid()));
create policy "home_records_update_members" on public.home_records for update to authenticated using ((select private.is_home_member(home_id))) with check ((select private.is_home_member(home_id)));
create policy "home_records_delete_members" on public.home_records for delete to authenticated using ((select private.is_home_member(home_id)));

create policy "record_attachments_select_members" on public.record_attachments for select to authenticated using ((select private.can_access_record(record_id)));
create policy "record_attachments_insert_members" on public.record_attachments for insert to authenticated with check ((select private.can_access_record(record_id)) and uploaded_by = (select auth.uid()));
create policy "record_attachments_delete_uploader" on public.record_attachments for delete to authenticated using (uploaded_by = (select auth.uid()));

create policy "notifications_select_recipient" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications_insert_home_members" on public.notifications for insert to authenticated with check ((select private.is_home_member(home_id)));
create policy "notifications_update_recipient" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications_delete_recipient" on public.notifications for delete to authenticated using (user_id = (select auth.uid()));

create policy "activity_log_select_members" on public.activity_log for select to authenticated using ((select private.is_home_member(home_id)));
create policy "activity_log_insert_members" on public.activity_log for insert to authenticated with check ((select private.is_home_member(home_id)) and (actor_id is null or actor_id = (select auth.uid())));

insert into public.levels (level, xp_required, label)
values
  (1, 0, 'Comeco leve'),
  (2, 200, 'Ritmo criando'),
  (3, 500, 'Casa em movimento'),
  (4, 900, 'Rotina afinada'),
  (5, 1400, 'Dupla organizada'),
  (6, 2000, 'Casa fluindo'),
  (7, 2700, 'Nivel colaborativo'),
  (8, 3500, 'Cantinho em ordem'),
  (9, 4400, 'Equipe da casa'),
  (10, 5400, 'Mestres da rotina')
on conflict (level) do nothing;

insert into public.achievements (code, name, description, threshold)
values
  ('first_mission', 'Primeira Missao', 'Conclua a primeira missao da casa.', 1),
  ('home_in_order_50', 'Casa em Ordem', 'Conclua 50 tarefas em conjunto.', 50),
  ('organization_master_100', 'Mestre da Organizacao', 'Conclua 100 tarefas.', 100),
  ('perfect_week', 'Semana Perfeita', 'Passe 7 dias sem tarefas atrasadas.', 7),
  ('market_on_track', 'Mercado em Dia', 'Conclua 10 listas de compras.', 10),
  ('streak_30', 'Sequencia de 30 dias', 'Mantenha 30 dias de rotina ativa.', 30)
on conflict (code) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('task-attachments', 'task-attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('home-records', 'home-records', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('attention-points', 'attention-points', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects for select to anon, authenticated
using (bucket_id = 'avatars');

create policy "avatars_user_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars_user_update" on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "home_files_select_members" on storage.objects for select to authenticated
using (
  bucket_id in ('task-attachments', 'home-records', 'attention-points')
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (select private.is_home_member(((storage.foldername(name))[1])::uuid))
);

create policy "home_files_insert_members" on storage.objects for insert to authenticated
with check (
  bucket_id in ('task-attachments', 'home-records', 'attention-points')
  and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and (select private.is_home_member(((storage.foldername(name))[1])::uuid))
);

create policy "home_files_update_owner_folder" on storage.objects for update to authenticated
using (
  bucket_id in ('task-attachments', 'home-records', 'attention-points')
  and (storage.foldername(name))[2] = (select auth.uid())::text
)
with check (
  bucket_id in ('task-attachments', 'home-records', 'attention-points')
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

create policy "home_files_delete_owner_folder" on storage.objects for delete to authenticated
using (
  bucket_id in ('task-attachments', 'home-records', 'attention-points')
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

do $$
begin
  alter publication supabase_realtime add table public.shopping_items;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
