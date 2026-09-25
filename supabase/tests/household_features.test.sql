begin;
create extension if not exists pgtap with schema extensions;
select plan(12);
create temporary table test_results (result text);
grant insert, select on test_results to authenticated;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner-features@example.com', '{"display_name":"Owner"}'::jsonb),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'partner-features@example.com', '{"display_name":"Partner"}'::jsonb);

insert into public.homes (id, name, created_by)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Feature Home', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

insert into public.home_members (home_id, user_id, role)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'member');

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local request.jwt.claim.email = 'owner-features@example.com';

insert into public.household_expenses (home_id, description, amount, expense_date, created_by)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Conta de energia', 189.90, current_date, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

insert into test_results select results_eq(
  $$select count(*)::integer from public.household_expenses where home_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  array[1],
  'members can register household expenses'
);

insert into public.household_plans (home_id, title, plan_type, estimated_cost, created_by)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Pintar a sala', 'improvement', 850, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

insert into test_results select results_eq(
  $$select count(*)::integer from public.household_plans where home_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  array[1],
  'members can create household plans'
);

insert into test_results select results_eq(
  $$select count(*)::integer from public.activity_log where home_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and entity_type in ('expense', 'plan')$$,
  array[2],
  'finance and planning actions are audited'
);

reset role;

insert into test_results select results_eq(
  $$select count(*)::integer from public.notifications where home_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and title in ('Financeiro atualizado', 'Planejamento atualizado')$$,
  array[4],
  'both partners receive finance and planning notifications'
);

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local request.jwt.claim.email = 'owner-features@example.com';

insert into public.tasks (id, home_id, title, due_at, assigned_to, created_by)
values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'Tarefa vencida',
  now() - interval '1 day',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
set local request.jwt.claim.email = 'partner-features@example.com';

insert into test_results select throws_ok(
  $$update public.tasks set status = 'resolved' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  'P0001',
  'TASK_OVERDUE_EXTEND_REQUIRED',
  'an overdue task cannot be completed'
);

insert into test_results select throws_ok(
  $$update public.tasks set due_at = now() + interval '1 day' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  'P0001',
  'ONLY_TASK_CREATOR_CAN_EXTEND',
  'a partner cannot extend another creators overdue task'
);

set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
set local request.jwt.claim.email = 'owner-features@example.com';

insert into test_results select throws_ok(
  $$update public.tasks set due_at = now() - interval '1 hour' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  'P0001',
  'TASK_EXTENSION_MUST_BE_FUTURE',
  'the creator must choose a future deadline'
);

update public.tasks
set due_at = now() + interval '1 day'
where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

insert into test_results select results_eq(
  $$select (due_at > now()) from public.tasks where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  array[true],
  'the creator can extend an overdue task'
);

set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
set local request.jwt.claim.email = 'partner-features@example.com';

update public.tasks set status = 'resolved'
where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

insert into test_results select results_eq(
  $$select status::text from public.tasks where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  array['resolved'],
  'the responsible partner can complete the task after extension'
);

insert into test_results select results_eq(
  $$select count(*)::integer from public.task_completions where task_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  array[1],
  'the valid completion is recorded'
);

reset role;

insert into test_results select results_eq(
  $$select count(*)::integer from public.notifications where home_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and title = 'Atualizacao de tarefa'$$,
  array[6],
  'task creation extension and completion notify both partners'
);

insert into test_results select results_eq(
  $$select count(*)::integer from public.activity_log where home_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and entity_type = 'task'$$,
  array[3],
  'task lifecycle remains visible in shared history'
);

insert into test_results select * from finish();
select * from test_results;
rollback;
