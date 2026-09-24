begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '77777777-7777-7777-7777-777777777777',
  'recurring-owner@example.com',
  '{"display_name":"Recurring Owner"}'::jsonb
);

insert into public.homes (id, name, created_by)
values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'Recurring Home',
  '77777777-7777-7777-7777-777777777777'
);

set local role authenticated;
set local request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
set local request.jwt.claim.email = 'recurring-owner@example.com';

insert into public.tasks (
  id, home_id, title, assigned_to, recurrence, due_at, xp, created_by
)
values (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'Daily task',
  '77777777-7777-7777-7777-777777777777',
  'daily',
  now() + interval '1 hour',
  20,
  '77777777-7777-7777-7777-777777777777'
);

update public.tasks
set status = 'resolved'
where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

select results_eq(
  $$select status::text from public.tasks where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'$$,
  array['open'],
  'a completed daily task reopens for its next cycle'
);

select ok(
  (select due_at > now() + interval '24 hours' from public.tasks where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'),
  'a completed daily task advances its deadline by one day'
);

select results_eq(
  $$select count(*)::integer from public.task_completions where task_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'$$,
  array[1],
  'the first daily cycle records a completion'
);

update public.tasks
set status = 'resolved'
where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

select results_eq(
  $$select count(*)::integer from public.task_completions where task_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'$$,
  array[2],
  'a later daily cycle can record another completion'
);

select results_eq(
  $$select xp from public.profiles where id = '77777777-7777-7777-7777-777777777777'$$,
  array[40],
  'each completed cycle awards xp'
);

insert into public.tasks (
  id, home_id, title, assigned_to, recurrence, due_at, xp, created_by
)
values (
  'aaaaaaaa-1111-1111-1111-111111111111',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'Overdue daily task',
  '77777777-7777-7777-7777-777777777777',
  'daily',
  now() - interval '1 hour',
  15,
  '77777777-7777-7777-7777-777777777777'
);

reset role;

select results_eq(
  $$select private.process_overdue_tasks()$$,
  array[1],
  'the overdue processor handles the missed task'
);

select results_eq(
  $$select xp from public.profiles where id = '77777777-7777-7777-7777-777777777777'$$,
  array[25],
  'a missed task deducts xp from the responsible person'
);

select results_eq(
  $$select tasks_late from public.profiles where id = '77777777-7777-7777-7777-777777777777'$$,
  array[1],
  'a missed task increments the late counter'
);

select results_eq(
  $$select xp from public.homes where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'$$,
  array[25],
  'a missed task deducts xp from the home'
);

select results_eq(
  $$select amount from public.xp_transactions where source_id = 'aaaaaaaa-1111-1111-1111-111111111111'$$,
  array[-15],
  'the xp deduction is audited'
);

select ok(
  (select due_at > now() from public.tasks where id = 'aaaaaaaa-1111-1111-1111-111111111111'),
  'a missed daily task advances to a future cycle'
);

select results_eq(
  $$select private.process_overdue_tasks()$$,
  array[0],
  'the same cycle cannot be penalized twice'
);

select results_eq(
  $$select count(*)::integer from public.notifications where user_id = '77777777-7777-7777-7777-777777777777' and title = 'Tarefa atrasada'$$,
  array[1],
  'the responsible person receives an overdue notification'
);

select * from finish();
rollback;
