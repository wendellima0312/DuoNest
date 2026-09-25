begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '88888888-8888-8888-8888-888888888888',
  'smart-missions@example.com',
  '{"display_name":"Smart User"}'::jsonb
);

insert into public.homes (id, name, created_by)
values (
  '99999999-9999-9999-9999-999999999999',
  'Smart Home',
  '88888888-8888-8888-8888-888888888888'
);

select results_eq(
  $$select count(*)::integer from public.missions where home_id = '99999999-9999-9999-9999-999999999999' and goal_type = 'task_count'$$,
  array[1],
  'joining a home creates a daily smart mission'
);

select results_eq(
  $$select target_count from public.missions where home_id = '99999999-9999-9999-9999-999999999999' and goal_type = 'task_count'$$,
  array[1],
  'the first daily target starts at an attainable level'
);

set local role authenticated;
set local request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';
set local request.jwt.claim.email = 'smart-missions@example.com';

select throws_ok(
  $$insert into public.missions (home_id, name, created_by) values ('99999999-9999-9999-9999-999999999999', 'Manual mission', '88888888-8888-8888-8888-888888888888')$$,
  '42501',
  null,
  'members cannot create missions manually'
);

insert into public.tasks (id, home_id, title, category, assigned_to, xp, created_by)
values (
  '12121212-1212-1212-1212-121212121212',
  '99999999-9999-9999-9999-999999999999',
  'Clean kitchen',
  'Limpeza',
  '88888888-8888-8888-8888-888888888888',
  10,
  '88888888-8888-8888-8888-888888888888'
);

update public.tasks set status = 'resolved'
where id = '12121212-1212-1212-1212-121212121212';

select results_eq(
  $$select progress_count from public.missions where home_id = '99999999-9999-9999-9999-999999999999' and goal_type = 'task_count'$$,
  array[1],
  'task completion updates mission progress automatically'
);

select results_eq(
  $$select count(*)::integer from public.mission_completions as completion join public.missions as mission on mission.id = completion.mission_id where mission.home_id = '99999999-9999-9999-9999-999999999999' and mission.goal_type = 'task_count'$$,
  array[1],
  'reaching the target completes the mission automatically'
);

select results_eq(
  $$select xp from public.profiles where id = '88888888-8888-8888-8888-888888888888'$$,
  array[30],
  'task and smart mission rewards are both awarded'
);

select results_eq(
  $$select progress_count from public.missions where home_id = '99999999-9999-9999-9999-999999999999' and goal_type = 'category_tasks' and goal_category = 'Limpeza'$$,
  array[1],
  'the preferred category creates a focused mission'
);

insert into public.shopping_lists (id, home_id, name, created_by)
values (
  '13131313-1313-1313-1313-131313131313',
  '99999999-9999-9999-9999-999999999999',
  'Weekly shopping',
  '88888888-8888-8888-8888-888888888888'
);

insert into public.shopping_items (id, list_id, home_id, product, created_by)
values
  ('14141414-1414-1414-1414-141414141414', '13131313-1313-1313-1313-131313131313', '99999999-9999-9999-9999-999999999999', 'Rice', '88888888-8888-8888-8888-888888888888'),
  ('15151515-1515-1515-1515-151515151515', '13131313-1313-1313-1313-131313131313', '99999999-9999-9999-9999-999999999999', 'Beans', '88888888-8888-8888-8888-888888888888');

update public.shopping_items
set bought = true,
    bought_by = '88888888-8888-8888-8888-888888888888',
    bought_at = now()
where id = '14141414-1414-1414-1414-141414141414';

select results_eq(
  $$select progress_count from public.missions where home_id = '99999999-9999-9999-9999-999999999999' and goal_type = 'shopping_items'$$,
  array[1],
  'shopping actions update a market mission'
);

insert into public.attention_points (id, home_id, title, assigned_to, created_by)
values (
  '16161616-1616-1616-1616-161616161616',
  '99999999-9999-9999-9999-999999999999',
  'Fix the tap',
  '88888888-8888-8888-8888-888888888888',
  '88888888-8888-8888-8888-888888888888'
);

update public.attention_points
set status = 'resolved',
    resolved_by = '88888888-8888-8888-8888-888888888888',
    resolved_at = now()
where id = '16161616-1616-1616-1616-161616161616';

select results_eq(
  $$select progress_count from public.missions where home_id = '99999999-9999-9999-9999-999999999999' and goal_type = 'attention_points'$$,
  array[1],
  'resolving an attention point creates progress'
);

select results_eq(
  $$select count(*)::integer from public.mission_completions as completion join public.missions as mission on mission.id = completion.mission_id where mission.home_id = '99999999-9999-9999-9999-999999999999' and mission.goal_type = 'attention_points'$$,
  array[1],
  'an attention mission completes automatically'
);

select throws_ok(
  $$insert into public.mission_completions (mission_id, home_id, completed_by) select id, home_id, '88888888-8888-8888-8888-888888888888' from public.missions where home_id = '99999999-9999-9999-9999-999999999999' limit 1$$,
  '42501',
  null,
  'members cannot complete missions manually'
);

reset role;

select results_eq(
  $$select count(*)::integer - count(distinct source_key)::integer from public.missions where home_id = '99999999-9999-9999-9999-999999999999'$$,
  array[0],
  'smart mission generation is idempotent'
);

select * from finish();
rollback;
