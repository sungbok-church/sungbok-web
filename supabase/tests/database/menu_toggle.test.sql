-- 메뉴 켜기 · 끄기는 «전체 관리» 만 한다(2026-11-23 결정). 권한은 메뉴가 켜져 있을 때만 살아 있으므로
-- 메뉴를 켜면 잠자던 권한이 깨어나고(내 권한 올리기) 끄면 모두의 권한이 빠진다 — «내 권한은 «전체 관리» 만 바꾼다» 를
-- 메뉴 쪽으로 돌아가지 못하게. 이름 · 순서는 메뉴 수정 권한으로 바꾼다. `pnpm db:test`.
-- 로그인은 request.jwt.claims 의 sub 로 흉내 낸다. 모든 변경은 끝에서 되돌린다.
begin;
select * from no_plan();

-- 준비(postgres = 사람 없는 변경)
-- 계정: a 전체 관리 · m 메뉴 조회 · 수정(전체 관리 아님)
-- 메뉴: bulletin 은 꺼 두고(m 의 그룹은 주보 조회 권한이 잠자는 상태), album 은 켜 둔다
insert into auth.users (id, email) values
  ('00000000-0000-7000-8000-00000000f001', 'ta@test.local'),
  ('00000000-0000-7000-8000-00000000f002', 'tm@test.local');
update public.profiles set is_active = false where email not like 't_@test.local';

insert into public.groups (id, name) values ('00000000-0000-7000-8000-00000000f101', 'toggle-menus');
insert into public.group_permissions (group_id, menu_id, action)
select g, m.id, a::public.permission_action
  from (values
    ('00000000-0000-7000-8000-00000000f101'::uuid, 'menus', 'READ'),
    ('00000000-0000-7000-8000-00000000f101'::uuid, 'menus', 'UPDATE'),
    ('00000000-0000-7000-8000-00000000f101'::uuid, 'bulletin', 'READ')
  ) as v (g, k, a)
  join public.menus m on m.area = 'ADMIN' and m.key = v.k;
insert into public.user_groups (user_id, group_id) values
  ('00000000-0000-7000-8000-00000000f001', (select id from public.groups where key = 'admin')),
  ('00000000-0000-7000-8000-00000000f002', '00000000-0000-7000-8000-00000000f101');
update public.menus set is_active = false where area = 'ADMIN' and key = 'bulletin';
update public.menus set is_active = true where area = 'ADMIN' and key = 'album';

-- 시험할 메뉴 무리: «시스템» 아래 메뉴(지금 순서대로)
create temp table sys_menus on commit drop as
select m.id, row_number() over (order by m.sort, m.created_at) as n
  from public.menus m
  join public.menus p on p.id = m.parent_id
 where m.area = 'ADMIN' and p.key = 'system';
grant select on sys_menus to authenticated;
select cmp_ok((select count(*)::integer from sys_menus), '>=', 2, '준비: «시스템» 아래 메뉴가 두 개 이상');

-- ----------------------------------------------------------------------------
-- «전체 관리» 가 아닌 메뉴 담당(m) — 켜고 끄지 못하고, 이름 · 순서는 바꾼다
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000f002","role":"authenticated"}', true);

select ok(not private.has_permission('bulletin', 'READ'), '준비: 꺼진 메뉴의 권한은 잠자고 있다');
select throws_ok(
  $$update public.menus set is_active = true where area = 'ADMIN' and key = 'bulletin'$$,
  '42501', '메뉴 켜기 · 끄기는 «전체 관리» 만 합니다',
  '꺼진 메뉴를 켜서 자기 권한을 깨울 수 없다'
);
select ok(not private.has_permission('bulletin', 'READ'), '막힌 뒤에도 권한은 잠자고 있다');
select throws_ok(
  $$update public.menus set is_active = false where area = 'ADMIN' and key = 'album'$$,
  '42501', '메뉴 켜기 · 끄기는 «전체 관리» 만 합니다',
  '켜진 메뉴를 끄지 못한다(모두의 권한을 빼는 것)'
);
select throws_ok(
  $$update public.menus set is_active = false, label = '앨범 끄기' where area = 'ADMIN' and key = 'album'$$,
  '42501', '메뉴 켜기 · 끄기는 «전체 관리» 만 합니다',
  '이름과 함께 바꿔도 켜기 · 끄기는 막힌다'
);
select lives_ok(
  $$update public.menus set label = '앨범 모음' where area = 'ADMIN' and key = 'album'$$,
  '이름은 바꾼다'
);
select lives_ok(
  $$update public.menus set is_active = true, label = '앨범 모음 2' where area = 'ADMIN' and key = 'album'$$,
  '사용 여부를 그대로 보내면(바뀌지 않으면) 이름은 저장된다'
);
select lives_ok(
  $$select public.reorder_rows('menus', (select array_agg(id order by n desc) from sys_menus))$$,
  '순서는 바꾼다(reorder_rows)'
);
reset role;

select is(
  (select is_active from public.menus where area = 'ADMIN' and key = 'bulletin'), false,
  '꺼진 메뉴는 그대로 꺼져 있다'
);
select is(
  (select label from public.menus where area = 'ADMIN' and key = 'album'), '앨범 모음 2',
  '이름은 저장되었다'
);
select is(
  (select array_agg(m.id order by m.sort) from public.menus m where m.id in (select id from sys_menus)),
  (select array_agg(id order by n desc) from sys_menus),
  '순서가 저장되었다'
);

-- ----------------------------------------------------------------------------
-- «전체 관리»(a) — 켜고 끈다(잠긴 메뉴는 여전히 끌 수 없다)
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000f001","role":"authenticated"}', true);
select lives_ok(
  $$update public.menus set is_active = true where area = 'ADMIN' and key = 'bulletin'$$,
  '«전체 관리» 는 메뉴를 켠다'
);
select lives_ok(
  $$update public.menus set is_active = false where area = 'ADMIN' and key = 'album'$$,
  '«전체 관리» 는 메뉴를 끈다'
);
select throws_ok(
  $$update public.menus set is_active = false where area = 'ADMIN' and key = 'users'$$,
  '23514', null,
  '잠긴 메뉴는 «전체 관리» 도 끌 수 없다'
);
reset role;

select * from finish();
rollback;
