-- 부서 범위 — «전체 관리» 가 아닌 사람은 자기보다 넓은 부서 범위를 (자기가 쥘 수 있는 다른 계정에) 줄 수 없다
-- (2026-11-23 결정). 다른 계정은 계정 만들기 · 비밀번호 초기화로 쥘 수 있다.
--   · 담당 부서가 정해진 사람은 다른 사람의 부서를 자기 부서로만 정하고(비우면 모든 부서), 자기 부서의 사용자만 관리한다.
--   · 관리(비밀번호 초기화 등): 대상이 속한 그룹이 모두 내 그룹이고(own_group.test.sql) 내 부서 범위 안일 때만.
--   · 새 계정의 부서는 계정이 생길 때(user_metadata.department) 정해진다 — 그 뒤의 metadata 는 보지 않는다.
--     범위 밖 계정(부서가 빈 방금 만든 계정도)을 내 부서로 끌어오는 예외는 없다.
-- `pnpm db:test`. 로그인은 request.jwt.claims 의 sub 로 흉내 낸다. 모든 변경은 끝에서 되돌린다.
begin;
select * from no_plan();

-- 준비(postgres = 사람 없는 변경)
-- 계정: a 전체 관리 · u 사용자 관리(영아부 범위 — U · P 구성원) · w 사용자 관리(범위 없음 — U · P 구성원) · m 그룹 관리 ·
--       t1 영아부(P) · t2 중등부(P) · t3 부서 없음(P) · t4 영아부(X — u 가 속하지 않은 그룹) ·
--       t5 영아부(PD — u 가 속하지 않은 그룹) · t6 부서 · 그룹 없음(방금 만든 계정) ·
--       t8 부서 · 그룹 없음(하루 전에 생김) · t9 부서 · 그룹 없음(꺼짐 — 물러난 관리자의 계정 등) ·
--       n1 ~ n3 계정을 만들 때 user_metadata 로 부서를 넘긴 계정(아래에서 만든다)
-- 그룹: U 사용자 조회 · 등록 · 수정 + 앨범 조회 · M 그룹 조회 · 수정 + 앨범 조회 · P 앨범 조회 · X 앨범 수정 ·
--       OP 앨범 조회(꺼짐) · OX 앨범 조회 · 수정(꺼짐) ·
--       OD 앨범 조회 + 주보 조회(꺼짐) · ODX 앨범 수정 + 주보 조회(꺼짐) · PD 앨범 조회 + 주보 조회 — 주보 메뉴는 꺼 둔다(잠자는 칸 — 메뉴가 켜지면 깨어난다)
insert into auth.users (id, email) values
  ('00000000-0000-7000-8000-00000000e001', 'pa@test.local'),
  ('00000000-0000-7000-8000-00000000e002', 'pu@test.local'),
  ('00000000-0000-7000-8000-00000000e003', 'pw@test.local'),
  ('00000000-0000-7000-8000-00000000e004', 'pm@test.local'),
  ('00000000-0000-7000-8000-00000000e011', 'p1@test.local'),
  ('00000000-0000-7000-8000-00000000e012', 'p2@test.local'),
  ('00000000-0000-7000-8000-00000000e013', 'p3@test.local'),
  ('00000000-0000-7000-8000-00000000e014', 'p4@test.local'),
  ('00000000-0000-7000-8000-00000000e015', 'p5@test.local'),
  ('00000000-0000-7000-8000-00000000e016', 'p6@test.local'),
  ('00000000-0000-7000-8000-00000000e018', 'p8@test.local'),
  ('00000000-0000-7000-8000-00000000e019', 'p9@test.local');
-- 등록 시각은 stamp 가 지켜서 잠깐 끄고 옮긴다(끝에서 모두 되돌린다). 표를 바꾸는 alter 라 지연 검사가 쌓이기 전(사용 여부를 바꾸기 전)에.
alter table public.profiles disable trigger stamp;
update public.profiles set created_at = now() - interval '1 day' where id = '00000000-0000-7000-8000-00000000e018';
alter table public.profiles enable trigger stamp;
update public.profiles set is_active = false where email not like 'p_@test.local';
update public.profiles set is_active = false where id = '00000000-0000-7000-8000-00000000e019';

insert into public.groups (id, name, is_active) values
  ('00000000-0000-7000-8000-00000000e101', 'scope-u', true),
  ('00000000-0000-7000-8000-00000000e102', 'scope-m', true),
  ('00000000-0000-7000-8000-00000000e103', 'scope-p', true),
  ('00000000-0000-7000-8000-00000000e104', 'scope-x', true),
  ('00000000-0000-7000-8000-00000000e105', 'scope-op', false),
  ('00000000-0000-7000-8000-00000000e106', 'scope-ox', false),
  ('00000000-0000-7000-8000-00000000e107', 'scope-od', false),
  ('00000000-0000-7000-8000-00000000e108', 'scope-odx', false),
  ('00000000-0000-7000-8000-00000000e109', 'scope-pd', true);
insert into public.group_permissions (group_id, menu_id, action)
select g, m.id, a::public.permission_action
  from (values
    ('00000000-0000-7000-8000-00000000e101'::uuid, 'users', 'READ'),
    ('00000000-0000-7000-8000-00000000e101'::uuid, 'users', 'CREATE'),
    ('00000000-0000-7000-8000-00000000e101'::uuid, 'users', 'UPDATE'),
    ('00000000-0000-7000-8000-00000000e101'::uuid, 'album', 'READ'),
    ('00000000-0000-7000-8000-00000000e102'::uuid, 'groups', 'READ'),
    ('00000000-0000-7000-8000-00000000e102'::uuid, 'groups', 'UPDATE'),
    ('00000000-0000-7000-8000-00000000e102'::uuid, 'album', 'READ'),
    ('00000000-0000-7000-8000-00000000e103'::uuid, 'album', 'READ'),
    ('00000000-0000-7000-8000-00000000e104'::uuid, 'album', 'UPDATE'),
    ('00000000-0000-7000-8000-00000000e105'::uuid, 'album', 'READ'),
    ('00000000-0000-7000-8000-00000000e106'::uuid, 'album', 'READ'),
    ('00000000-0000-7000-8000-00000000e106'::uuid, 'album', 'UPDATE'),
    ('00000000-0000-7000-8000-00000000e107'::uuid, 'album', 'READ'),
    ('00000000-0000-7000-8000-00000000e107'::uuid, 'bulletin', 'READ'),
    ('00000000-0000-7000-8000-00000000e108'::uuid, 'album', 'UPDATE'),
    ('00000000-0000-7000-8000-00000000e108'::uuid, 'bulletin', 'READ'),
    ('00000000-0000-7000-8000-00000000e109'::uuid, 'album', 'READ'),
    ('00000000-0000-7000-8000-00000000e109'::uuid, 'bulletin', 'READ')
  ) as v (g, k, a)
  join public.menus m on m.area = 'ADMIN' and m.key = v.k;
-- 주보 메뉴를 끈다 — 그 칸은 누구에게도 권한을 주지 않는다(메뉴 켜기는 «전체 관리» 만)
update public.menus set is_active = false where area = 'ADMIN' and key = 'bulletin';
insert into public.user_groups (user_id, group_id) values
  ('00000000-0000-7000-8000-00000000e001', (select id from public.groups where key = 'admin')),
  ('00000000-0000-7000-8000-00000000e002', '00000000-0000-7000-8000-00000000e101'),
  ('00000000-0000-7000-8000-00000000e003', '00000000-0000-7000-8000-00000000e101'),
  ('00000000-0000-7000-8000-00000000e002', '00000000-0000-7000-8000-00000000e103'),
  ('00000000-0000-7000-8000-00000000e003', '00000000-0000-7000-8000-00000000e103'),
  ('00000000-0000-7000-8000-00000000e004', '00000000-0000-7000-8000-00000000e102'),
  ('00000000-0000-7000-8000-00000000e011', '00000000-0000-7000-8000-00000000e103'),
  ('00000000-0000-7000-8000-00000000e012', '00000000-0000-7000-8000-00000000e103'),
  ('00000000-0000-7000-8000-00000000e013', '00000000-0000-7000-8000-00000000e103'),
  ('00000000-0000-7000-8000-00000000e014', '00000000-0000-7000-8000-00000000e104'),
  ('00000000-0000-7000-8000-00000000e015', '00000000-0000-7000-8000-00000000e109');
update public.profiles set department = 'INFANT'
 where id in ('00000000-0000-7000-8000-00000000e002', '00000000-0000-7000-8000-00000000e011',
              '00000000-0000-7000-8000-00000000e014', '00000000-0000-7000-8000-00000000e015');
update public.profiles set department = 'MIDDLE' where id = '00000000-0000-7000-8000-00000000e012';

-- ----------------------------------------------------------------------------
-- 계정을 만들 때 넘긴 부서(user_metadata.department — createUser 가 만능 키로 넘긴다)
-- ----------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-7000-8000-00000000e021', 'n1@test.local', '{"name":"새 교사","department":"INFANT"}'),
  ('00000000-0000-7000-8000-00000000e022', 'n2@test.local', '{"name":"새 교사 2"}'),
  ('00000000-0000-7000-8000-00000000e023', 'n3@test.local', '{"department":""}');
select is(
  (select department from public.profiles where id = '00000000-0000-7000-8000-00000000e021'),
  'INFANT'::public.department_slug,
  '계정이 생길 때 user_metadata 의 부서로 사용자 정보를 만든다'
);
select is(
  (select name from public.profiles where id = '00000000-0000-7000-8000-00000000e021'),
  '새 교사', '이름도 user_metadata 에서'
);
select is(
  (select department from public.profiles where id = '00000000-0000-7000-8000-00000000e022'),
  null, '부서를 넘기지 않으면 모든 부서(null)'
);
select is(
  (select department from public.profiles where id = '00000000-0000-7000-8000-00000000e023'),
  null, '빈 부서도 모든 부서(null)'
);
select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data)
    values ('00000000-0000-7000-8000-00000000e024', 'n4@test.local', '{"department":"NOPE"}')$$,
  '22023', '없는 부서입니다: NOPE',
  '부서 목록에 없는 값이면 계정을 만들지 않는다(조용히 모든 부서가 되지 않게)'
);
-- 로그인한 사람은 자기 user_metadata 를 바꿀 수 있다(auth.updateUser({ data })) — 그것으로 부서가 바뀌면 안 된다
update auth.users set raw_user_meta_data = '{"department":"MIDDLE"}'
 where id = '00000000-0000-7000-8000-00000000e021';
update auth.users set raw_user_meta_data = '{"department":"HIGH"}', email = 'n1-new@test.local'
 where id = '00000000-0000-7000-8000-00000000e021';
update auth.users set raw_user_meta_data = '{"department":"INFANT"}', email = 'n2-new@test.local'
 where id = '00000000-0000-7000-8000-00000000e022';
select is(
  (select department from public.profiles where id = '00000000-0000-7000-8000-00000000e021'),
  'INFANT'::public.department_slug,
  '나중에 바꾼 user_metadata 의 부서는 보지 않는다(이메일과 함께 바뀌어도)'
);
select is(
  (select department from public.profiles where id = '00000000-0000-7000-8000-00000000e022'),
  null, '부서가 빈 계정도 나중의 user_metadata 로 부서가 정해지지 않는다'
);
select is(
  (select email from public.profiles where id = '00000000-0000-7000-8000-00000000e021'),
  'n1-new@test.local', '이메일은 그대로 맞춘다'
);

-- ----------------------------------------------------------------------------
-- 부서 범위가 있는 사용자 관리(u, 영아부)
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000e002","role":"authenticated"}', true);

select is(public.my_department_limit(), 'INFANT'::public.department_slug, '부서 범위: 내 담당 부서');

select ok(public.can_manage_user('00000000-0000-7000-8000-00000000e011'), '같은 부서 · 내 그룹에만 속한 사람은 관리한다');
select ok(not public.can_manage_user('00000000-0000-7000-8000-00000000e012'), '다른 부서의 사람은 관리하지 못한다');
select ok(not public.can_manage_user('00000000-0000-7000-8000-00000000e013'), '모든 부서(부서 없음)인 사람은 관리하지 못한다');
select ok(not public.can_manage_user('00000000-0000-7000-8000-00000000e014'),
  '같은 부서라도 내가 속하지 않은 그룹의 사람은 관리하지 못한다(비밀번호를 초기화하면 그 권한을 받는다)');

select throws_ok(
  $$update public.profiles set department = null where id = '00000000-0000-7000-8000-00000000e011'$$,
  '42501', '부서는 내 담당 부서로만 정할 수 있습니다',
  '다른 사람의 부서를 비울 수 없다(모든 부서 = 내 범위보다 넓다)'
);
select throws_ok(
  $$update public.profiles set department = 'MIDDLE' where id = '00000000-0000-7000-8000-00000000e011'$$,
  '42501', '부서는 내 담당 부서로만 정할 수 있습니다',
  '다른 사람의 부서를 다른 부서로 바꿀 수 없다'
);
select lives_ok(
  $$update public.profiles set name = '영아부 교사' where id = '00000000-0000-7000-8000-00000000e011'$$,
  '같은 부서 사람의 이름은 고친다'
);
select throws_ok(
  $$update public.profiles set name = '중등부 교사' where id = '00000000-0000-7000-8000-00000000e012'$$,
  '42501', '내 담당 부서의 사용자만 바꿀 수 있습니다',
  '다른 부서 사람은 고치지 못한다'
);
select throws_ok(
  $$update public.profiles set is_active = false where id = '00000000-0000-7000-8000-00000000e013'$$,
  '42501', '내 담당 부서의 사용자만 바꿀 수 있습니다',
  '모든 부서인 사람은 끄지 못한다'
);
select throws_ok(
  $$update public.profiles set department = 'INFANT' where id = '00000000-0000-7000-8000-00000000e013'$$,
  '42501', '내 담당 부서의 사용자만 바꿀 수 있습니다',
  '그룹이 있는 모든 부서인 사람을 내 부서로 끌어오지 못한다'
);
select throws_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000e012', '00000000-0000-7000-8000-00000000e103')$$,
  '42501', '내 담당 부서의 사용자만 바꿀 수 있습니다',
  '다른 부서 사람을 그룹에 넣지 못한다'
);
select throws_ok(
  $$delete from public.user_groups where user_id = '00000000-0000-7000-8000-00000000e013'$$,
  '42501', '내 담당 부서의 사용자만 바꿀 수 있습니다',
  '모든 부서인 사람을 그룹에서 빼지 못한다'
);

-- save_user(사용자 수정 화면의 저장)
select throws_ok(
  $$select public.save_user(
      '00000000-0000-7000-8000-00000000e011',
      (select updated_at from public.profiles where id = '00000000-0000-7000-8000-00000000e011'),
      '영아부 교사', null, true,
      '{00000000-0000-7000-8000-00000000e103}', '{00000000-0000-7000-8000-00000000e103}'
    )$$,
  '42501', '부서는 내 담당 부서로만 정할 수 있습니다',
  'save_user: 부서를 «모든 부서» 로 저장할 수 없다'
);
select throws_ok(
  $$select public.save_user(
      '00000000-0000-7000-8000-00000000e012',
      (select updated_at from public.profiles where id = '00000000-0000-7000-8000-00000000e012'),
      '중등부 교사', 'INFANT', true,
      '{00000000-0000-7000-8000-00000000e103}', '{00000000-0000-7000-8000-00000000e103}'
    )$$,
  '42501', '내 담당 부서의 사용자만 바꿀 수 있습니다',
  'save_user: 다른 부서 사람은 저장할 수 없다'
);

-- 계정 만들기(createUser) — 새 계정은 만들 때 부서가 정해진다(n1 = 영아부). 바로 내 그룹에 넣는다.
select lives_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000e021', '00000000-0000-7000-8000-00000000e103')$$,
  '만들 때 내 부서로 정해진 새 계정은 내 그룹에 넣는다'
);
select throws_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000e022', '00000000-0000-7000-8000-00000000e103')$$,
  '42501', '내 담당 부서의 사용자만 바꿀 수 있습니다',
  '부서 없이(모든 부서) 만든 새 계정은 그룹에 넣지 못한다'
);
-- 방금 만든 빈 계정을 내 부서로 끌어오는 예외는 없다 — 다른 관리자가 막 만든 계정을 가로채 비밀번호를 초기화하지 못하게
select throws_ok(
  $$update public.profiles set department = 'INFANT' where id = '00000000-0000-7000-8000-00000000e016'$$,
  '42501', '내 담당 부서의 사용자만 바꿀 수 있습니다',
  '방금 만든 빈 계정(켜짐 · 부서 · 그룹 없음)도 내 부서로 끌어오지 못한다'
);
select throws_ok(
  $$update public.profiles set department = 'INFANT' where id = '00000000-0000-7000-8000-00000000e022'$$,
  '42501', '내 담당 부서의 사용자만 바꿀 수 있습니다',
  '부서 없이 만든 새 계정도 내 부서로 끌어오지 못한다'
);
select ok(not public.can_manage_user('00000000-0000-7000-8000-00000000e016'),
  '방금 만든 빈 계정(모든 부서)은 관리하지 못한다(비밀번호 초기화 X)');
select throws_ok(
  $$update public.profiles set department = 'INFANT' where id = '00000000-0000-7000-8000-00000000e018'$$,
  '42501', '내 담당 부서의 사용자만 바꿀 수 있습니다',
  '오래된 빈 계정(부서 · 그룹 없음)은 내 부서로 끌어오지 못한다'
);
select throws_ok(
  $$update public.profiles set department = 'INFANT' where id = '00000000-0000-7000-8000-00000000e019'$$,
  '42501', '내 담당 부서의 사용자만 바꿀 수 있습니다',
  '꺼진 빈 계정은 내 부서로 끌어오지 못한다(끌어와 켜고 비밀번호를 초기화하면 그 계정을 받는다)'
);
select ok(not public.can_manage_user('00000000-0000-7000-8000-00000000e019'), '꺼진 빈 계정은 관리하지 못한다');

-- 그룹에 넣기 — 같은 부서여도 내가 속하지 않은 그룹에는 못 넣는다
select throws_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000e011', '00000000-0000-7000-8000-00000000e109')$$,
  '42501', '내가 속한 그룹에만 넣고 뺄 수 있습니다',
  '같은 부서 사람이어도 내가 속하지 않은 그룹에는 넣지 못한다'
);
reset role;

-- ----------------------------------------------------------------------------
-- 부서 범위가 없는 사용자 관리(w) — 부서는 가리지 않는다(내 그룹에만 속하면 관리)
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000e003","role":"authenticated"}', true);
select is(public.my_department_limit(), null, '부서 범위가 없으면 null');
select ok(public.can_manage_user('00000000-0000-7000-8000-00000000e012'), '범위가 없으면 다른 부서 사람도 관리한다');
select ok(not public.can_manage_user('00000000-0000-7000-8000-00000000e014'), '범위가 없어도 내가 속하지 않은 그룹의 사람은 관리하지 못한다');
select lives_ok(
  $$update public.profiles set department = null where id = '00000000-0000-7000-8000-00000000e012'$$,
  '범위가 없으면 다른 사람을 모든 부서로 정한다'
);
reset role;

-- ----------------------------------------------------------------------------
-- 그룹 관리(m, 전체 관리 아님) — 그룹은 끄지도 켜지도 못한다(«전체 관리» 만, own_group.test.sql)
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000e004","role":"authenticated"}', true);
select throws_ok(
  $$update public.groups set is_active = true where id = '00000000-0000-7000-8000-00000000e105'$$,
  '42501', '그룹은 «전체 관리» 만 만들고 고칩니다',
  '권한을 모두 가진 꺼진 그룹도 켜지 못한다'
);
select throws_ok(
  $$update public.groups set is_active = false where id = '00000000-0000-7000-8000-00000000e104'$$,
  '42501', '그룹은 «전체 관리» 만 만들고 고칩니다',
  '그룹을 끄지도 못한다'
);
reset role;

-- ----------------------------------------------------------------------------
-- «전체 관리»(a) — 그대로
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000e001","role":"authenticated"}', true);
select is(public.my_department_limit(), null, '«전체 관리» 는 부서 범위가 없다');
select ok(public.can_manage_user('00000000-0000-7000-8000-00000000e013'), '«전체 관리» 는 모든 부서인 사람도 관리한다');
select ok(public.can_manage_user('00000000-0000-7000-8000-00000000e014'), '«전체 관리» 는 어떤 권한을 가진 사람도 관리한다');
select lives_ok(
  $$update public.profiles set department = 'HIGH' where id = '00000000-0000-7000-8000-00000000e011'$$,
  '«전체 관리» 는 어느 부서로든 정한다'
);
select lives_ok(
  $$update public.groups set is_active = true where id = '00000000-0000-7000-8000-00000000e106'$$,
  '«전체 관리» 는 어떤 그룹이든 켠다'
);
select lives_ok(
  $$update public.groups set is_active = true where id = '00000000-0000-7000-8000-00000000e107'$$,
  '«전체 관리» 는 꺼진 메뉴의 칸이 남은 그룹도 켠다'
);
select lives_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000e011', '00000000-0000-7000-8000-00000000e109')$$,
  '«전체 관리» 는 꺼진 메뉴의 칸이 남은 그룹에도 사람을 넣는다'
);
select ok(public.can_manage_user('00000000-0000-7000-8000-00000000e015'),
  '«전체 관리» 는 꺼진 메뉴의 칸이 남은 그룹의 구성원도 관리한다');
reset role;

select * from finish();
rollback;
