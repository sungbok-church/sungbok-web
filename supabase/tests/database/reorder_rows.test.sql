-- 끌어서 옮긴 순서를 한 번에 저장(reorder_rows) — 한 무리의 모든 줄을 새 순서대로 받아 10, 20, 30 … 으로 다시 매긴다.
-- 로그인한 사람의 권한으로 돈다(행 권한 · 지키는 규칙 · 변경 이력 그대로). 무리가 맞지 않으면 아무것도 바꾸지 않는다.
-- `pnpm db:test`. 로그인은 request.jwt.claims 의 sub 로 흉내 낸다. 모든 변경은 끝에서 되돌린다.
begin;
select * from no_plan();

-- 준비(postgres = 사람 없는 변경)
-- 계정: e1 메뉴 · 분류 · 코드 수정 · e2 메뉴 조회만
insert into auth.users (id, email) values
  ('00000000-0000-7000-8000-00000000e001', 're1@test.local'),
  ('00000000-0000-7000-8000-00000000e002', 're2@test.local');
update public.profiles set is_active = true where email like 're_@test.local';

insert into public.groups (id, name) values
  ('00000000-0000-7000-8000-00000000e101', 'reorder-editor'),
  ('00000000-0000-7000-8000-00000000e102', 'reorder-reader');
insert into public.group_permissions (group_id, menu_id, action)
select g, m.id, a::public.permission_action
  from (values
    ('00000000-0000-7000-8000-00000000e101'::uuid, 'menus', 'READ'),
    ('00000000-0000-7000-8000-00000000e101'::uuid, 'menus', 'UPDATE'),
    ('00000000-0000-7000-8000-00000000e101'::uuid, 'categories', 'UPDATE'),
    ('00000000-0000-7000-8000-00000000e101'::uuid, 'codes', 'UPDATE'),
    ('00000000-0000-7000-8000-00000000e102'::uuid, 'menus', 'READ')
  ) as v (g, k, a)
  join public.menus m on m.area = 'ADMIN' and m.key = v.k;
insert into public.user_groups (user_id, group_id) values
  ('00000000-0000-7000-8000-00000000e001', '00000000-0000-7000-8000-00000000e101'),
  ('00000000-0000-7000-8000-00000000e002', '00000000-0000-7000-8000-00000000e102');

-- 분류 묶음 하나(세 줄 — 순서 값이 모두 같게) · 잠긴 코드 묶음 하나(두 줄)
insert into public.category_groups (key, name) values ('REORDER_TEST', '순서 시험');
insert into public.categories (id, group_key, slug, label, sort) values
  ('00000000-0000-7000-8000-00000000ec01', 'REORDER_TEST', 'a', '가', 0),
  ('00000000-0000-7000-8000-00000000ec02', 'REORDER_TEST', 'b', '나', 0),
  ('00000000-0000-7000-8000-00000000ec03', 'REORDER_TEST', 'c', '다', 0);
insert into public.code_groups (key, name, is_locked) values ('REORDER_LOCKED', '잠긴 순서 시험', true);
insert into public.codes (id, group_key, code, label, sort) values
  ('00000000-0000-7000-8000-00000000ed01', 'REORDER_LOCKED', 'A', '가', 10),
  ('00000000-0000-7000-8000-00000000ed02', 'REORDER_LOCKED', 'B', '나', 20);

-- 시험할 메뉴 무리: «시스템» 아래 메뉴(지금 순서대로)
create temp table sys_menus on commit drop as
select m.id, m.sort, row_number() over (order by m.sort, m.created_at) as n
  from public.menus m
  join public.menus p on p.id = m.parent_id
 where m.area = 'ADMIN' and p.key = 'system';
grant select on sys_menus to authenticated;
select cmp_ok((select count(*)::integer from sys_menus), '>=', 3, '준비: «시스템» 아래 메뉴가 세 개 이상(빈 무리로 아래 검사가 저절로 통과하지 않게)');

select ok(not has_function_privilege('anon', 'public.reorder_rows(text, uuid[])', 'execute'),
  'reorder_rows: 방문자는 부를 수 없다');
select ok(has_function_privilege('authenticated', 'public.reorder_rows(text, uuid[])', 'execute'),
  'reorder_rows: 로그인한 사람은 부른다(권한은 함수 안 · 행 권한이 본다)');

-- ----------------------------------------------------------------------------
-- 권한 — 메뉴 수정 권한이 없으면 막힌다
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000e002","role":"authenticated"}', true);

select throws_ok(
  $$select public.reorder_rows('menus', (select array_agg(id order by n desc) from sys_menus))$$,
  '42501', '수정 권한이 없습니다',
  'reorder_rows: 메뉴 수정 권한이 없으면 순서를 바꿀 수 없다'
);

-- ----------------------------------------------------------------------------
-- 맞지 않는 목록 — 아무것도 바꾸지 않고 오류
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000e001","role":"authenticated"}', true);

select throws_ok(
  $$select public.reorder_rows('menus', '{}')$$,
  '23514', '순서를 바꿀 목록이 비었거나 같은 줄이 두 번 들어 있습니다',
  'reorder_rows: 빈 목록은 거절'
);
select throws_ok(
  $$select public.reorder_rows('menus', (select array_agg(id order by n) || (array_agg(id order by n))[1:1] from sys_menus))$$,
  '23514', '순서를 바꿀 목록이 비었거나 같은 줄이 두 번 들어 있습니다',
  'reorder_rows: 같은 줄이 두 번이면 거절'
);
select throws_ok(
  $$select public.reorder_rows('menus', (select array_agg(id order by n) from sys_menus where n > 1))$$,
  '23514', '목록이 그사이 바뀌었습니다. 새로고침한 뒤 다시 옮겨 주세요',
  'reorder_rows: 무리의 줄이 빠지면 거절'
);
select throws_ok(
  $$select public.reorder_rows('menus', (select array_agg(id order by n) from sys_menus)
      || (select id from public.menus where area = 'ADMIN' and key = 'bulletin'))$$,
  '23514', '목록이 그사이 바뀌었습니다. 새로고침한 뒤 다시 옮겨 주세요',
  'reorder_rows: 다른 무리(다른 상위 메뉴)의 줄이 섞이면 거절'
);
select throws_ok(
  $$select public.reorder_rows('menus', '{00000000-0000-7000-8000-00000000ec01,00000000-0000-7000-8000-00000000ec02,00000000-0000-7000-8000-00000000ec03}')$$,
  '23514', '목록이 그사이 바뀌었습니다. 새로고침한 뒤 다시 옮겨 주세요',
  'reorder_rows: 다른 표의 id 는 거절'
);
select throws_ok(
  $$select public.reorder_rows('profiles', '{00000000-0000-7000-8000-00000000e001}')$$,
  '22023', null,
  'reorder_rows: 메뉴 · 분류 · 코드가 아닌 표는 거절'
);
select is(
  (select array_agg(m.sort order by m.id) from public.menus m join sys_menus s on s.id = m.id),
  (select array_agg(sort order by id) from sys_menus),
  'reorder_rows: 거절된 뒤 순서는 그대로'
);

-- ----------------------------------------------------------------------------
-- 바르게 옮기기 — 10, 20, 30 … 으로 다시 매기고 바뀐 줄만 고친다
-- ----------------------------------------------------------------------------
select lives_ok(
  $$select public.reorder_rows('menus', (select array_agg(id order by n desc) from sys_menus))$$,
  'reorder_rows: 메뉴 무리를 거꾸로 옮긴다'
);
select is(
  (select array_agg(m.sort order by s.n desc) from public.menus m join sys_menus s on s.id = m.id),
  (select array_agg(n::integer * 10 order by n) from sys_menus),
  'reorder_rows: 새 순서대로 10, 20, 30 …'
);

select lives_ok(
  $$select public.reorder_rows('categories', '{00000000-0000-7000-8000-00000000ec03,00000000-0000-7000-8000-00000000ec01,00000000-0000-7000-8000-00000000ec02}')$$,
  'reorder_rows: 순서 값이 모두 같던 분류도 옮긴다'
);
select is(
  (select array_agg(slug order by sort) from public.categories where group_key = 'REORDER_TEST'),
  '{c,a,b}'::text[],
  'reorder_rows: 분류가 새 순서대로'
);
select lives_ok(
  $$select public.reorder_rows('codes', '{00000000-0000-7000-8000-00000000ed02,00000000-0000-7000-8000-00000000ed01}')$$,
  'reorder_rows: 잠긴 코드 묶음도 순서는 바꾼다'
);
select is(
  (select array_agg(code order by sort) from public.codes where group_key = 'REORDER_LOCKED'),
  '{B,A}'::text[],
  'reorder_rows: 코드가 새 순서대로'
);
select throws_ok(
  $$select public.reorder_rows('categories', '{00000000-0000-7000-8000-00000000ec01,00000000-0000-7000-8000-00000000ed01}')$$,
  '23514', '목록이 그사이 바뀌었습니다. 새로고침한 뒤 다시 옮겨 주세요',
  'reorder_rows: 분류 무리에 코드 id 가 섞이면 거절'
);
reset role;

-- 변경 이력: 바뀐 줄만, 옮긴 사람으로, 순서 칸만
select is(
  (select count(*)::integer from public.audit_log
    where table_name = 'menus' and actor_id = '00000000-0000-7000-8000-00000000e001'),
  (select count(*)::integer from sys_menus s
    where s.sort <> ((select count(*) from sys_menus) - s.n + 1) * 10),
  'reorder_rows: 순서 값이 바뀐 메뉴만 변경 이력이 남는다'
);
select ok(
  (select bool_and(changes ? 'sort' and (select count(*) from jsonb_object_keys(changes)) = 1)
     from public.audit_log
    where table_name = 'menus' and actor_id = '00000000-0000-7000-8000-00000000e001'),
  'reorder_rows: 변경 이력에는 순서 칸만'
);
select is(
  (select count(*)::integer from public.audit_log
    where table_name = 'categories' and action = 'UPDATE'
      and actor_id = '00000000-0000-7000-8000-00000000e001'),
  3,
  'reorder_rows: 분류 세 줄 모두 변경 이력이 남는다'
);
select ok(
  (select bool_and(updated_by = '00000000-0000-7000-8000-00000000e001') from public.codes where group_key = 'REORDER_LOCKED'),
  'reorder_rows: 고친 사람이 남는다(stamp)'
);

select * from finish();
rollback;
