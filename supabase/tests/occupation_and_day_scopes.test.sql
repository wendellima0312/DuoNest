begin;
create extension if not exists pgtap with schema extensions;
select plan(12);
create temporary table test_results (result text);
grant insert, select on test_results to authenticated;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('13131313-1313-1313-1313-131313131313', 'occupation-owner@example.com', '{"display_name":"Owner"}'::jsonb),
  ('14141414-1414-1414-1414-141414141414', 'occupation-partner@example.com', '{"display_name":"Partner"}'::jsonb);

insert into public.homes (id, name, created_by)
values ('15151515-1515-1515-1515-151515151515', 'Occupation Home', '13131313-1313-1313-1313-131313131313');

insert into public.home_members (home_id, user_id, role)
values ('15151515-1515-1515-1515-151515151515', '14141414-1414-1414-1414-141414141414', 'member');

set local role authenticated;
set local request.jwt.claim.sub = '13131313-1313-1313-1313-131313131313';
set local request.jwt.claim.email = 'occupation-owner@example.com';

update public.profiles
set avatar_config = '{"presentation":"feminine","skin":"medium","hair":"curly","hairColor":"brown","shirtColor":"emerald"}'::jsonb
where id = '13131313-1313-1313-1313-131313131313';

insert into test_results select results_eq(
  $$select avatar_config ->> 'hair' from public.profiles where id = '13131313-1313-1313-1313-131313131313'$$,
  array['curly'],
  'a member can save a customizable avatar'
);

insert into public.schedule_items (id, home_id, title, day_scope, start_time, duration_minutes, room, responsible_id, created_by)
values ('16161616-1616-1616-1616-161616161616', '15151515-1515-1515-1515-151515151515', 'Organizar a semana', 'business_days', '19:30', 45, 'Sala', '14141414-1414-1414-1414-141414141414', '13131313-1313-1313-1313-131313131313');

insert into test_results select results_eq(
  $$select title from public.schedule_items where id = '16161616-1616-1616-1616-161616161616'$$,
  array['Organizar a semana'],
  'a member can create a shared schedule item'
);

insert into public.home_presence (home_id, user_id, room)
values ('15151515-1515-1515-1515-151515151515', '13131313-1313-1313-1313-131313131313', 'Cozinha');

insert into test_results select results_eq(
  $$select room from public.home_presence where user_id = '13131313-1313-1313-1313-131313131313'$$,
  array['Cozinha'],
  'a member can move their own avatar'
);

set local request.jwt.claim.sub = '14141414-1414-1414-1414-141414141414';
set local request.jwt.claim.email = 'occupation-partner@example.com';

insert into test_results select results_eq(
  $$select count(*)::integer from public.schedule_items where home_id = '15151515-1515-1515-1515-151515151515'$$,
  array[1],
  'the partner can view the shared schedule'
);

insert into test_results select throws_ok(
  $$insert into public.home_presence (home_id, user_id, room) values ('15151515-1515-1515-1515-151515151515', '13131313-1313-1313-1313-131313131313', 'Quarto') on conflict (home_id,user_id) do update set room = excluded.room$$,
  '42501',
  null,
  'a partner cannot move another members avatar'
);

insert into public.home_presence (home_id, user_id, room)
values ('15151515-1515-1515-1515-151515151515', '14141414-1414-1414-1414-141414141414', 'Escritorio');

reset role;

insert into test_results select results_eq(
  $$select count(*)::integer from public.home_presence where home_id = '15151515-1515-1515-1515-151515151515'$$,
  array[2],
  'both partners can occupy rooms independently'
);

insert into test_results select results_eq(
  $$select count(*)::integer from public.activity_log where home_id = '15151515-1515-1515-1515-151515151515' and entity_type in ('schedule','presence','profile')$$,
  array[4],
  'avatar, schedule, and room changes are audited'
);

insert into test_results select results_eq(
  $$select count(*)::integer from public.notifications where home_id = '15151515-1515-1515-1515-151515151515' and title = 'Agenda do casal atualizada'$$,
  array[2],
  'both partners receive a schedule notification'
);

insert into test_results select is(
  private.next_task_due_at('2026-09-25 12:00-03'::timestamptz, 'business_days', '2026-09-25 12:00-03'::timestamptz),
  '2026-09-28 12:00-03'::timestamptz,
  'business-day recurrence skips a weekend'
);

insert into test_results select is(
  private.next_task_due_at('2026-09-25 12:00-03'::timestamptz, 'weekends', '2026-09-25 12:00-03'::timestamptz),
  '2026-09-26 12:00-03'::timestamptz,
  'weekend recurrence advances Friday to Saturday'
);

insert into test_results select is(
  private.next_task_due_at('2026-09-27 12:00-03'::timestamptz, 'weekends', '2026-09-27 12:00-03'::timestamptz),
  '2026-10-03 12:00-03'::timestamptz,
  'weekend recurrence skips weekdays after Sunday'
);

insert into test_results select is(
  private.next_task_due_at('2026-09-26 12:00-03'::timestamptz, 'business_days', '2026-09-26 12:00-03'::timestamptz),
  '2026-09-28 12:00-03'::timestamptz,
  'business-day recurrence advances Saturday to Monday'
);

insert into test_results select * from finish();
select * from test_results;
rollback;
