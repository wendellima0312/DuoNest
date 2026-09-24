begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('44444444-4444-4444-4444-444444444444', 'workflow-owner@example.com', '{"display_name":"Workflow Owner"}'::jsonb),
  ('55555555-5555-5555-5555-555555555555', 'workflow-member@example.com', '{"display_name":"Workflow Member"}'::jsonb),
  ('66666666-6666-6666-6666-666666666666', 'new-owner@example.com', '{"display_name":"New Owner"}'::jsonb);

select results_eq(
  $$select display_name from public.profiles where id = '44444444-4444-4444-4444-444444444444'$$,
  array['Workflow Owner'],
  'auth user creates a profile'
);

insert into public.homes (id, name, created_by)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Workflow Home', '44444444-4444-4444-4444-444444444444');

select results_eq(
  $$select role::text from public.home_members where home_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  array['owner'],
  'home creates owner membership'
);

insert into public.tasks (id, home_id, title, xp, created_by)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Workflow task', 25, '44444444-4444-4444-4444-444444444444');

insert into public.missions (id, home_id, name, xp, created_by)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Workflow mission', 50, '44444444-4444-4444-4444-444444444444');

set local role authenticated;
set local request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
set local request.jwt.claim.email = 'new-owner@example.com';

select lives_ok(
  $$select public.create_home('New User Home', 'New Owner', array['Limpeza', 'Compras'])$$,
  'authenticated user creates a home through the RPC'
);

select results_eq(
  $$select role::text from public.home_members where user_id = '66666666-6666-6666-6666-666666666666'$$,
  array['owner'],
  'home RPC creates the owner membership'
);

select results_eq(
  $$select count(*)::integer from public.shopping_lists where created_by = '66666666-6666-6666-6666-666666666666'$$,
  array[1],
  'home RPC creates the default shopping list'
);

select results_eq(
  $$select count(*)::integer from public.tasks where created_by = '66666666-6666-6666-6666-666666666666'$$,
  array[2],
  'home RPC creates selected routines'
);

set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
set local request.jwt.claim.email = 'workflow-owner@example.com';

update public.tasks set status = 'resolved' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

select results_eq(
  $$select count(*)::integer from public.task_completions where task_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  array[1],
  'resolving a task creates one completion'
);

select results_eq(
  $$select xp from public.profiles where id = '44444444-4444-4444-4444-444444444444'$$,
  array[25],
  'task completion awards profile xp'
);

select results_eq(
  $$select xp from public.homes where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  array[25],
  'task completion awards home xp'
);

update public.tasks set status = 'open' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
update public.tasks set status = 'resolved' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

select results_eq(
  $$select xp from public.profiles where id = '44444444-4444-4444-4444-444444444444'$$,
  array[25],
  'reopening does not duplicate xp'
);

insert into public.mission_completions (mission_id, home_id, completed_by, xp_awarded)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 9999);

select results_eq(
  $$select xp_awarded from public.mission_completions where mission_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  array[50],
  'mission completion sanitizes xp amount'
);

select results_eq(
  $$select xp from public.profiles where id = '44444444-4444-4444-4444-444444444444'$$,
  array[75],
  'mission completion awards profile xp'
);

select results_eq(
  $$select count(*)::integer from public.xp_transactions where home_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  array[2],
  'xp transactions are audited'
);

select results_eq(
  $$select count(*)::integer from public.activity_log where home_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  array[2],
  'completion activity is audited'
);

select throws_ok(
  $$insert into public.mission_completions (mission_id, home_id, completed_by, xp_awarded) values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 50)$$,
  '23505',
  null,
  'a mission cannot award xp twice'
);

select * from finish();
rollback;
