begin;
select plan(7);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'member@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'stranger@example.com');

insert into public.profiles (id, display_name, email)
values
  ('11111111-1111-1111-1111-111111111111', 'Owner', 'owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'Member', 'member@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'Stranger', 'stranger@example.com');

insert into public.homes (id, name, created_by)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Casa A', '11111111-1111-1111-1111-111111111111');

insert into public.home_members (home_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member');

set local role anon;
select throws_ok($$select * from public.homes$$, '42501', null, 'anon cannot read homes');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq($$select name from public.homes$$, array['Casa A'], 'owner can read their home');
select results_eq($$update public.homes set name = 'Casa A editada' returning name$$, array['Casa A editada'], 'owner can update home');

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select results_eq($$select name from public.homes$$, array['Casa A editada'], 'member can read shared home');
select is_empty($$update public.homes set name = 'Member edit' returning name$$, 'member cannot update home settings');

set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select is_empty($$select name from public.homes$$, 'stranger cannot read another home');
select is_empty($$select title from public.tasks$$, 'stranger cannot read home tasks');

select * from finish();
rollback;
