-- 역할 규칙(2026-11-23 결정 — 단순화). `pnpm db:test`.
--   · «전체 관리» 만: 그룹 만들기 · 그룹 고치기(이름 · 설명 · 권한 표 · 끄기 · 켜기) · 누구든 어느 그룹에든 넣고 빼기.
--   · 그 밖의 사용자 관리자: 자기가 속한 그룹에만 사람을 넣고 뺀다(«전체 관리» 그룹은 빼고). 다른 사람의 계정 관리
--     (비밀번호 초기화 · 사용자 정보 고치기 · 끄기 · 켜기 · 부서)는 대상이 속한 그룹이 모두 내 그룹일 때만(can_manage_user). 부서 범위 규칙은 그대로(department_scope.test.sql).
-- 로그인은 request.jwt.claims 의 sub 로 흉내 낸다. 모든 변경은 끝에서 되돌린다.
begin;
select * from no_plan();

-- 준비(postgres = 사람 없는 변경)
-- 계정: a 전체 관리 · m 사용자 · 그룹 관리(전체 관리 아님 — G · J · K 구성원) ·
--       t1 그룹 없음 · t2 G · t3 H(m 이 속하지 않은 그룹) · t4 G + H · t5 그룹 없음(막 만든 계정)
-- 그룹: G 사용자 조회 · 등록 · 수정 + 그룹 조회 · 등록 · 수정 · 삭제 · J 앨범 조회 · K 주보 조회(꺼짐) · H 앨범 조회
insert into auth.users (id, email) values
  ('00000000-0000-7000-8000-00000000c001', 'oa@test.local'),
  ('00000000-0000-7000-8000-00000000c002', 'om@test.local'),
  ('00000000-0000-7000-8000-00000000c011', 'o1@test.local'),
  ('00000000-0000-7000-8000-00000000c012', 'o2@test.local'),
  ('00000000-0000-7000-8000-00000000c013', 'o3@test.local'),
  ('00000000-0000-7000-8000-00000000c014', 'o4@test.local'),
  ('00000000-0000-7000-8000-00000000c015', 'o5@test.local');
update public.profiles set is_active = false where email not like 'o_@test.local';

insert into public.groups (id, name, is_active) values
  ('00000000-0000-7000-8000-00000000d001', 'own-g', true),
  ('00000000-0000-7000-8000-00000000d002', 'own-k', false),
  ('00000000-0000-7000-8000-00000000d003', 'own-h', true),
  ('00000000-0000-7000-8000-00000000d004', 'own-j', true);
insert into public.group_permissions (group_id, menu_id, action)
select g, m.id, a::public.permission_action
  from (values
    ('00000000-0000-7000-8000-00000000d001'::uuid, 'users', 'READ'),
    ('00000000-0000-7000-8000-00000000d001'::uuid, 'users', 'CREATE'),
    ('00000000-0000-7000-8000-00000000d001'::uuid, 'users', 'UPDATE'),
    ('00000000-0000-7000-8000-00000000d001'::uuid, 'groups', 'READ'),
    ('00000000-0000-7000-8000-00000000d001'::uuid, 'groups', 'CREATE'),
    ('00000000-0000-7000-8000-00000000d001'::uuid, 'groups', 'UPDATE'),
    ('00000000-0000-7000-8000-00000000d001'::uuid, 'groups', 'DELETE'),
    ('00000000-0000-7000-8000-00000000d002'::uuid, 'bulletin', 'READ'),
    ('00000000-0000-7000-8000-00000000d004'::uuid, 'album', 'READ'),
    ('00000000-0000-7000-8000-00000000d003'::uuid, 'album', 'READ')
  ) as v (g, k, a)
  join public.menus m on m.area = 'ADMIN' and m.key = v.k;
insert into public.user_groups (user_id, group_id) values
  ('00000000-0000-7000-8000-00000000c001', (select id from public.groups where key = 'admin')),
  ('00000000-0000-7000-8000-00000000c002', '00000000-0000-7000-8000-00000000d001'),
  ('00000000-0000-7000-8000-00000000c002', '00000000-0000-7000-8000-00000000d002'),
  ('00000000-0000-7000-8000-00000000c002', '00000000-0000-7000-8000-00000000d004'),
  ('00000000-0000-7000-8000-00000000c012', '00000000-0000-7000-8000-00000000d001'),
  ('00000000-0000-7000-8000-00000000c013', '00000000-0000-7000-8000-00000000d003'),
  ('00000000-0000-7000-8000-00000000c014', '00000000-0000-7000-8000-00000000d001'),
  ('00000000-0000-7000-8000-00000000c014', '00000000-0000-7000-8000-00000000d003');

-- ----------------------------------------------------------------------------
-- «전체 관리» 가 아닌 관리자(m) — 그룹 소속: 내 그룹에만 넣고 뺀다
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000c002","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000c011', '00000000-0000-7000-8000-00000000d004')$$,
  '내가 속한 그룹(J)에는 넣는다'
);
select lives_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000c011', '00000000-0000-7000-8000-00000000d002')$$,
  '꺼진 내 그룹(K)에도 넣는다(켜지면 나도 같은 권한을 받는다)'
);
select lives_ok(
  $$delete from public.user_groups
     where user_id = '00000000-0000-7000-8000-00000000c011' and group_id = '00000000-0000-7000-8000-00000000d002'$$,
  '내 그룹에서 뺀다'
);
select throws_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000c011', '00000000-0000-7000-8000-00000000d003')$$,
  '42501', '내가 속한 그룹에만 넣고 뺄 수 있습니다',
  '내가 속하지 않은 그룹(H)에는 넣지 못한다 — 권한이 내 권한 안이어도'
);
select throws_ok(
  $$delete from public.user_groups
     where user_id = '00000000-0000-7000-8000-00000000c013' and group_id = '00000000-0000-7000-8000-00000000d003'$$,
  '42501', '내가 속한 그룹에만 넣고 뺄 수 있습니다',
  '내가 속하지 않은 그룹(H)에서 빼지도 못한다'
);
select throws_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000c011', (select id from public.groups where key = 'admin'))$$,
  '42501', '«전체 관리» 소속은 화면에서 바꿀 수 없습니다',
  '«전체 관리» 그룹에는 넣지 못한다'
);
select throws_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000c002', '00000000-0000-7000-8000-00000000d003')$$,
  '42501', '자기 그룹은 바꿀 수 없습니다',
  '자기 그룹 소속은 바꾸지 못한다'
);

-- 내 그룹이라도 관리할 수 없는 사람(남의 그룹에도 속함 — can_manage_user 거짓)의 소속은 넣고 빼지 못한다(권한 올리기 방지 ②).
-- 판정은 바꾸기 전 소속으로 한다 — 관리할 수 있는 사람은 넣고 빼도 그대로 관리할 수 있다.
select throws_ok(
  $$delete from public.user_groups
     where user_id = '00000000-0000-7000-8000-00000000c014' and group_id = '00000000-0000-7000-8000-00000000d001'$$,
  '42501', '내가 속하지 않은 그룹의 사용자는 «전체 관리» 만 바꿉니다',
  '내 그룹(G)이라도 남의 그룹(H)에도 속한 사람에게서는 빼지 못한다 — 권한을 깎는다'
);
select throws_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000c014', '00000000-0000-7000-8000-00000000d004')$$,
  '42501', '내가 속하지 않은 그룹의 사용자는 «전체 관리» 만 바꿉니다',
  '내 그룹(J)이라도 남의 그룹(H)에도 속한 사람에게는 넣지 못한다'
);
select is(
  (select count(*)::int from public.user_groups where user_id = '00000000-0000-7000-8000-00000000c014'), 2,
  '관리할 수 없는 사람의 소속은 그대로다(G + H)'
);
select lives_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000c012', '00000000-0000-7000-8000-00000000d004')$$,
  '관리할 수 있는 사람(G 만)에게는 내 그룹(J)을 넣는다'
);
select lives_ok(
  $$delete from public.user_groups
     where user_id = '00000000-0000-7000-8000-00000000c012' and group_id = '00000000-0000-7000-8000-00000000d004'$$,
  '관리할 수 있는 사람(G + J)에게서 내 그룹(J)을 뺀다'
);
select lives_ok(
  $$insert into public.user_groups (user_id, group_id) values
      ('00000000-0000-7000-8000-00000000c015', '00000000-0000-7000-8000-00000000d001'),
      ('00000000-0000-7000-8000-00000000c015', '00000000-0000-7000-8000-00000000d004')$$,
  '막 만든 계정(그룹 없음)에 내 그룹 여럿을 한 번에 넣는다(createUser)'
);
select is(
  (select count(*)::int from public.user_groups where user_id = '00000000-0000-7000-8000-00000000c015'), 2,
  '막 만든 계정에 두 그룹이 다 들어갔다'
);

-- save_user(사용자 수정 화면의 저장) — 관리할 수 있는 사람(그룹이 모두 내 그룹)은 고치고, 남의 그룹 사람은 손대지 못한다
select isnt(
  public.save_user(
    '00000000-0000-7000-8000-00000000c012',
    (select updated_at from public.profiles where id = '00000000-0000-7000-8000-00000000c012'),
    '내 그룹 사람', null, true,
    '{00000000-0000-7000-8000-00000000d001,00000000-0000-7000-8000-00000000d004}',
    '{00000000-0000-7000-8000-00000000d001}'
  ),
  null,
  'save_user: 내 그룹(G)에만 속한 사람의 이름을 고치고 내 그룹(J)을 더한다'
);
select throws_ok(
  $$select public.save_user(
      '00000000-0000-7000-8000-00000000c013',
      (select updated_at from public.profiles where id = '00000000-0000-7000-8000-00000000c013'),
      '이름만 고침', null, true,
      '{00000000-0000-7000-8000-00000000d003}',
      '{00000000-0000-7000-8000-00000000d003}'
    )$$,
  '42501', '내가 속하지 않은 그룹의 사용자는 «전체 관리» 만 바꿉니다',
  'save_user: 남의 그룹(H)에 속한 사람은 그룹을 그대로 두어도 고치지 못한다'
);
select throws_ok(
  $$select public.save_user(
      '00000000-0000-7000-8000-00000000c011',
      (select updated_at from public.profiles where id = '00000000-0000-7000-8000-00000000c011'),
      '반쯤 저장되면 안 됨', null, true,
      '{00000000-0000-7000-8000-00000000d004,00000000-0000-7000-8000-00000000d003}',
      '{00000000-0000-7000-8000-00000000d004}'
    )$$,
  '42501', '내가 속한 그룹에만 넣고 뺄 수 있습니다',
  'save_user: 남의 그룹(H)에 넣는 저장은 막힌다'
);
select isnt(
  (select name from public.profiles where id = '00000000-0000-7000-8000-00000000c011'),
  '반쯤 저장되면 안 됨',
  'save_user: 막히면 이름도 저장되지 않는다(전부 되돌림)'
);

-- 다른 사람의 사용자 정보(끄기 · 켜기 · 부서 · 이름)도 관리할 수 있는 사람일 때만 — 꺼진 남의 그룹 사람을 켜면 그 그룹의
-- 권한이 되살아난다(권한 올리기 방지 ②)
select lives_ok(
  $$update public.profiles set is_active = false where id = '00000000-0000-7000-8000-00000000c012'$$,
  '내 그룹에만 속한 사람은 끈다'
);
select lives_ok(
  $$update public.profiles set is_active = true, department = 'INFANT' where id = '00000000-0000-7000-8000-00000000c012'$$,
  '내 그룹에만 속한 사람은 켜고 부서를 바꾼다'
);
select throws_ok(
  $$update public.profiles set is_active = false where id = '00000000-0000-7000-8000-00000000c013'$$,
  '42501', '내가 속하지 않은 그룹의 사용자는 «전체 관리» 만 바꿉니다',
  '남의 그룹(H) 사람은 끄지 못한다'
);
select throws_ok(
  $$update public.profiles set department = 'INFANT' where id = '00000000-0000-7000-8000-00000000c014'$$,
  '42501', '내가 속하지 않은 그룹의 사용자는 «전체 관리» 만 바꿉니다',
  '내 그룹과 남의 그룹(G + H)에 함께 속한 사람의 부서를 바꾸지 못한다'
);
reset role;
select set_config('request.jwt.claims', '', true);
update public.profiles set is_active = false where id = '00000000-0000-7000-8000-00000000c013';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000c002","role":"authenticated"}', true);
select throws_ok(
  $$update public.profiles set is_active = true where id = '00000000-0000-7000-8000-00000000c013'$$,
  '42501', '내가 속하지 않은 그룹의 사용자는 «전체 관리» 만 바꿉니다',
  '꺼진 남의 그룹(H) 사람을 켜지 못한다 — 켜면 그 그룹의 권한이 되살아난다'
);
reset role;
select set_config('request.jwt.claims', '', true);
update public.profiles set is_active = true where id = '00000000-0000-7000-8000-00000000c013';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000c002","role":"authenticated"}', true);
select lives_ok(
  $$update public.profiles set name = '내 이름' where id = '00000000-0000-7000-8000-00000000c002'$$,
  '자기 이름은 고친다(자기 자신은 이 규칙 밖)'
);

-- 계정 관리(비밀번호 초기화) — 대상의 그룹이 모두 내 그룹일 때만
select ok(public.can_manage_user('00000000-0000-7000-8000-00000000c011'), '내 그룹에만 속한 사람은 관리한다');
select ok(public.can_manage_user('00000000-0000-7000-8000-00000000c012'), '내 그룹(G)에 속한 사람은 관리한다');
select ok(not public.can_manage_user('00000000-0000-7000-8000-00000000c013'),
  '남의 그룹(H · J)에 속한 사람은 관리하지 못한다 — 비밀번호를 초기화하면 그 그룹의 권한을 받는다');
select ok(not public.can_manage_user('00000000-0000-7000-8000-00000000c014'),
  '내 그룹과 남의 그룹(G + H)에 함께 속한 사람도 관리하지 못한다');
select ok(not public.can_manage_user('00000000-0000-7000-8000-00000000c001'), '«전체 관리» 구성원은 관리하지 못한다');

-- ----------------------------------------------------------------------------
-- «전체 관리» 가 아닌 관리자(m) — 그룹은 만들지도 고치지도 못한다(그룹 권한이 있어도, 내 그룹이든 아니든)
-- ----------------------------------------------------------------------------
select throws_ok(
  $$insert into public.groups (name) values ('새 그룹')$$,
  '42501', '그룹은 «전체 관리» 만 만들고 고칩니다',
  '그룹을 만들지 못한다'
);
select throws_ok(
  $$select public.create_group('새 그룹', null, '{}')$$,
  '42501', '그룹은 «전체 관리» 만 만들고 고칩니다',
  'create_group: 그룹을 만들지 못한다'
);
select throws_ok(
  $$update public.groups set name = '이름 바꿈' where id = '00000000-0000-7000-8000-00000000d003'$$,
  '42501', '그룹은 «전체 관리» 만 만들고 고칩니다',
  '남의 그룹 이름을 바꾸지 못한다'
);
select throws_ok(
  $$update public.groups set description = '설명' where id = '00000000-0000-7000-8000-00000000d001'$$,
  '42501', '그룹은 «전체 관리» 만 만들고 고칩니다',
  '내 그룹 설명도 바꾸지 못한다'
);
select throws_ok(
  $$update public.groups set is_active = false where id = '00000000-0000-7000-8000-00000000d003'$$,
  '42501', '그룹은 «전체 관리» 만 만들고 고칩니다',
  '그룹을 끄지 못한다'
);
select throws_ok(
  $$update public.groups set is_active = true where id = '00000000-0000-7000-8000-00000000d002'$$,
  '42501', '그룹은 «전체 관리» 만 만들고 고칩니다',
  '꺼진 그룹을 켜지 못한다'
);
select throws_ok(
  $$insert into public.group_permissions (group_id, menu_id, action)
    select '00000000-0000-7000-8000-00000000d003', id, 'READ' from public.menus where area = 'ADMIN' and key = 'users'$$,
  '42501', '그룹 권한은 «전체 관리» 만 바꿉니다',
  '남의 그룹에 (내가 가진) 권한을 넣지 못한다'
);
select throws_ok(
  $$delete from public.group_permissions gp using public.menus m
     where gp.group_id = '00000000-0000-7000-8000-00000000d001' and m.id = gp.menu_id
       and m.key = 'groups' and gp.action = 'DELETE'$$,
  '42501', '그룹 권한은 «전체 관리» 만 바꿉니다',
  '내 그룹의 권한을 빼지 못한다'
);
select throws_ok(
  $$select public.save_group(
      '00000000-0000-7000-8000-00000000d003',
      (select updated_at from public.groups where id = '00000000-0000-7000-8000-00000000d003'),
      'own-h', null, true, '{album:READ}', '{album:READ}'
    )$$,
  '42501', '그룹은 «전체 관리» 만 만들고 고칩니다',
  'save_group: 아무것도 바꾸지 않는 저장도 막힌다'
);
reset role;

select is(
  (select count(*)::int from public.groups where name in ('새 그룹', '이름 바꿈')), 0,
  '그룹이 만들어지거나 바뀌지 않았다'
);

-- ----------------------------------------------------------------------------
-- «전체 관리»(a) — 무엇이든
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000c001","role":"authenticated"}', true);
select lives_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000c011', '00000000-0000-7000-8000-00000000d003')$$,
  '«전체 관리» 는 속하지 않은 그룹에도 넣는다'
);
select lives_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000c014', '00000000-0000-7000-8000-00000000d004')$$,
  '«전체 관리» 는 다른 관리자가 관리하지 못하는 사람(G + H)에게도 넣는다'
);
select lives_ok(
  $$delete from public.user_groups
     where user_id = '00000000-0000-7000-8000-00000000c014' and group_id = '00000000-0000-7000-8000-00000000d001'$$,
  '«전체 관리» 는 어느 그룹에서든 뺀다'
);
-- «전체 관리» 소속은 화면(로그인한 세션)에서 아무도 바꾸지 못한다 — «전체 관리» 계정을 빼앗겨도 새 «전체 관리» 를 만들지 못하게.
-- 소속은 운영자가 대시보드 SQL 편집기(사람 없는 변경)로만 바꾼다(deploy-and-env.md).
select throws_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000c012', (select id from public.groups where key = 'admin'))$$,
  '42501', '«전체 관리» 소속은 화면에서 바꿀 수 없습니다',
  '«전체 관리» 도 «전체 관리» 그룹에 넣지 못한다'
);
select ok(public.can_manage_user('00000000-0000-7000-8000-00000000c013'), '«전체 관리» 는 어느 그룹의 사람이든 관리한다');
select lives_ok(
  $$update public.profiles set is_active = false, department = 'HIGH' where id = '00000000-0000-7000-8000-00000000c013'$$,
  '«전체 관리» 는 어느 그룹의 사람이든 끄고 부서를 바꾼다'
);
select isnt(
  public.save_user(
    '00000000-0000-7000-8000-00000000c013',
    (select updated_at from public.profiles where id = '00000000-0000-7000-8000-00000000c013'),
    '전체 관리가 고침', null, true,
    '{00000000-0000-7000-8000-00000000d003,00000000-0000-7000-8000-00000000d001}',
    '{00000000-0000-7000-8000-00000000d003}'
  ),
  null,
  '«전체 관리» 의 save_user 는 어느 그룹의 사람이든 고친다'
);
reset role;
select set_config('request.jwt.claims', '', true);
select lives_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000c012', (select id from public.groups where key = 'admin'))$$,
  '사람 없는 변경(만능 키 · SQL 편집기)으로는 «전체 관리» 그룹에 넣는다'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000c001","role":"authenticated"}', true);
select throws_ok(
  $$delete from public.user_groups
     where user_id = '00000000-0000-7000-8000-00000000c012'
       and group_id = (select id from public.groups where key = 'admin')$$,
  '42501', '«전체 관리» 소속은 화면에서 바꿀 수 없습니다',
  '«전체 관리» 도 «전체 관리» 그룹에서 빼지 못한다'
);
select isnt(
  public.save_user(
    '00000000-0000-7000-8000-00000000c012',
    (select updated_at from public.profiles where id = '00000000-0000-7000-8000-00000000c012'),
    '전체 관리 구성원', null, true,
    '{00000000-0000-7000-8000-00000000d001}',
    (select array_agg(group_id) from public.user_groups where user_id = '00000000-0000-7000-8000-00000000c012')
  ),
  null,
  '«전체 관리» 의 save_user 는 목록에 «전체 관리» 가 빠져도 그 소속을 지우지 않는다'
);
select ok(
  exists (select 1 from public.user_groups
           where user_id = '00000000-0000-7000-8000-00000000c012'
             and group_id = (select id from public.groups where key = 'admin')),
  'save_user 뒤에도 «전체 관리» 소속은 그대로다'
);
select throws_ok(
  $$select public.save_user(
      '00000000-0000-7000-8000-00000000c011',
      (select updated_at from public.profiles where id = '00000000-0000-7000-8000-00000000c011'),
      '올리면 안 됨', null, true,
      (select array_agg(group_id) || (select id from public.groups where key = 'admin')
         from public.user_groups where user_id = '00000000-0000-7000-8000-00000000c011'),
      (select array_agg(group_id) from public.user_groups where user_id = '00000000-0000-7000-8000-00000000c011')
    )$$,
  '42501', '«전체 관리» 소속은 화면에서 바꿀 수 없습니다',
  '«전체 관리» 의 save_user 도 «전체 관리» 그룹에 넣지 못한다'
);
select isnt(
  public.create_group('새 그룹', '설명', '{album:READ,users:READ}'),
  null,
  '«전체 관리» 는 그룹을 만든다'
);
select lives_ok(
  $$insert into public.group_permissions (group_id, menu_id, action)
    select '00000000-0000-7000-8000-00000000d003', id, 'PURGE' from public.menus where area = 'ADMIN' and key = 'album'$$,
  '«전체 관리» 는 어느 그룹에든 권한을 넣는다'
);
select lives_ok(
  $$update public.groups set name = '이름 바꿈', is_active = false where id = '00000000-0000-7000-8000-00000000d003'$$,
  '«전체 관리» 는 그룹 이름을 바꾸고 끈다'
);
select lives_ok(
  $$update public.groups set is_active = true where id = '00000000-0000-7000-8000-00000000d002'$$,
  '«전체 관리» 는 꺼진 그룹을 켠다'
);
select throws_ok(
  $$update public.groups set key = 'renamed' where id = '00000000-0000-7000-8000-00000000d003'$$,
  '42501', '그룹 key 와 시스템 여부는 변경 파일로만 정합니다',
  '«전체 관리» 도 그룹 key 는 바꾸지 못한다'
);
reset role;

select * from finish();
rollback;
