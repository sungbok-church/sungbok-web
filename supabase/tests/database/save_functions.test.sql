-- 한 번에 저장하는 함수(save_user · save_group · create_group) — 여러 표를 함께 바꾸고, 하나라도 막히면 전부 되돌리며,
-- 화면을 연 뒤 다른 사람이 바꿨으면 저장하지 않는다(null). 로그인한 사람의 권한으로 돈다(행 권한 · 지키는 규칙 그대로).
-- `pnpm db:test`. 로그인은 request.jwt.claims 의 sub 로 흉내 낸다. 모든 변경은 끝에서 되돌린다.
begin;
select * from no_plan();

-- 준비(postgres = 사람 없는 변경)
-- 계정: u 사용자 관리(조회 · 수정) · g 그룹 관리(조회 · 등록 · 수정 + 앨범 조회) · t 고칠 대상 · a 전체 관리
insert into auth.users (id, email) values
  ('00000000-0000-7000-8000-00000000a001', 'sa@test.local'),
  ('00000000-0000-7000-8000-00000000a002', 'su@test.local'),
  ('00000000-0000-7000-8000-00000000a003', 'sg@test.local'),
  ('00000000-0000-7000-8000-00000000a004', 'st@test.local');
update public.profiles set is_active = false where email not like 's_@test.local';

insert into public.groups (id, name) values
  ('00000000-0000-7000-8000-00000000b001', 'save-users'),
  ('00000000-0000-7000-8000-00000000b002', 'save-granter'),
  ('00000000-0000-7000-8000-00000000b003', 'save-plain'),
  ('00000000-0000-7000-8000-00000000b004', 'save-album');
insert into public.group_permissions (group_id, menu_id, action)
select g, m.id, a::public.permission_action
  from (values
    ('00000000-0000-7000-8000-00000000b001'::uuid, 'users', 'READ'),
    ('00000000-0000-7000-8000-00000000b001'::uuid, 'users', 'UPDATE'),
    ('00000000-0000-7000-8000-00000000b002'::uuid, 'groups', 'READ'),
    ('00000000-0000-7000-8000-00000000b002'::uuid, 'groups', 'CREATE'),
    ('00000000-0000-7000-8000-00000000b002'::uuid, 'groups', 'UPDATE'),
    ('00000000-0000-7000-8000-00000000b002'::uuid, 'album', 'READ'),
    ('00000000-0000-7000-8000-00000000b004'::uuid, 'album', 'READ')
  ) as v (g, k, a)
  join public.menus m on m.area = 'ADMIN' and m.key = v.k;
insert into public.user_groups (user_id, group_id) values
  ('00000000-0000-7000-8000-00000000a001', (select id from public.groups where key = 'admin')),
  ('00000000-0000-7000-8000-00000000a002', '00000000-0000-7000-8000-00000000b001'),
  ('00000000-0000-7000-8000-00000000a003', '00000000-0000-7000-8000-00000000b002');

-- ----------------------------------------------------------------------------
-- save_user — 사용자 정보와 그룹 소속을 한 번에
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000a002","role":"authenticated"}', true);

select is(
  public.save_user(
    '00000000-0000-7000-8000-00000000a004',
    '2000-01-01T00:00:00Z', '옛 판으로 고침', null, true,
    '{}', '{}'
  ),
  null,
  'save_user: 화면을 연 뒤 다른 사람이 고쳤으면(updated_at 다름) 저장하지 않는다'
);
select is(
  public.save_user(
    '00000000-0000-7000-8000-00000000a004',
    (select updated_at from public.profiles where id = '00000000-0000-7000-8000-00000000a004'),
    '그룹이 바뀐 줄 모름', null, true,
    '{}', '{00000000-0000-7000-8000-00000000b003}'
  ),
  null,
  'save_user: 화면을 연 뒤 그룹 소속이 바뀌었으면 저장하지 않는다(남의 변경을 덮지 않게)'
);
select isnt(
  public.save_user(
    '00000000-0000-7000-8000-00000000a004',
    (select updated_at from public.profiles where id = '00000000-0000-7000-8000-00000000a004'),
    '새 이름', 'INFANT', true,
    '{00000000-0000-7000-8000-00000000b003}', '{}'
  ),
  null,
  'save_user: 사용자 정보와 그룹을 함께 저장하고 새 updated_at 을 돌려준다'
);
select is(
  (select name || '/' || department from public.profiles where id = '00000000-0000-7000-8000-00000000a004'),
  '새 이름/INFANT',
  'save_user: 이름 · 부서가 저장됐다'
);
select ok(
  exists (select 1 from public.user_groups
           where user_id = '00000000-0000-7000-8000-00000000a004' and group_id = '00000000-0000-7000-8000-00000000b003'),
  'save_user: 그룹 소속이 저장됐다'
);
select throws_ok(
  $$select public.save_user(
      '00000000-0000-7000-8000-00000000a004',
      (select updated_at from public.profiles where id = '00000000-0000-7000-8000-00000000a004'),
      '반쯤 저장되면 안 됨', 'INFANT', true,
      '{00000000-0000-7000-8000-00000000b003,00000000-0000-7000-8000-00000000b004}',
      '{00000000-0000-7000-8000-00000000b003}'
    )$$,
  '42501', null,
  'save_user: 자기에게 없는 권한을 가진 그룹은 넣을 수 없다'
);
select is(
  (select name from public.profiles where id = '00000000-0000-7000-8000-00000000a004'),
  '새 이름',
  'save_user: 그룹이 막히면 이름도 저장되지 않는다(전부 되돌림)'
);
select isnt(
  public.save_user(
    '00000000-0000-7000-8000-00000000a004',
    (select updated_at from public.profiles where id = '00000000-0000-7000-8000-00000000a004'),
    '새 이름', 'INFANT', true,
    '{}', '{00000000-0000-7000-8000-00000000b003}'
  ),
  null,
  'save_user: 그룹을 빼는 것도 함께 저장한다'
);
select ok(
  not exists (select 1 from public.user_groups where user_id = '00000000-0000-7000-8000-00000000a004'),
  'save_user: 뺀 그룹이 지워졌다'
);
reset role;

-- ----------------------------------------------------------------------------
-- save_group — 그룹 이름 · 설명 · 사용 여부와 권한 표를 한 번에
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000a003","role":"authenticated"}', true);

select is(
  public.save_group(
    '00000000-0000-7000-8000-00000000b003', '2000-01-01T00:00:00Z', '옛 판', null, true, null, null
  ),
  null,
  'save_group: 화면을 연 뒤 다른 사람이 고쳤으면(updated_at 다름) 저장하지 않는다'
);
select is(
  public.save_group(
    '00000000-0000-7000-8000-00000000b003',
    (select updated_at from public.groups where id = '00000000-0000-7000-8000-00000000b003'),
    '권한이 바뀐 줄 모름', null, true,
    '{album:READ}', '{album:READ}'
  ),
  null,
  'save_group: 화면을 연 뒤 권한 표가 바뀌었으면 저장하지 않는다'
);
select isnt(
  public.save_group(
    '00000000-0000-7000-8000-00000000b003',
    (select updated_at from public.groups where id = '00000000-0000-7000-8000-00000000b003'),
    '보통 그룹', '설명', true,
    '{album:READ}', '{}'
  ),
  null,
  'save_group: 이름 · 설명과 권한을 함께 저장한다'
);
select is(
  (select name || '/' || (select count(*) from public.group_permissions where group_id = g.id)
     from public.groups g where g.id = '00000000-0000-7000-8000-00000000b003'),
  '보통 그룹/1',
  'save_group: 이름과 권한이 저장됐다'
);
select throws_ok(
  $$select public.save_group(
      '00000000-0000-7000-8000-00000000b003',
      (select updated_at from public.groups where id = '00000000-0000-7000-8000-00000000b003'),
      '반쯤 저장되면 안 됨', null, true,
      '{album:READ,album:UPDATE}', '{album:READ}'
    )$$,
  '42501', null,
  'save_group: 자기에게 없는 권한은 줄 수 없다'
);
select is(
  (select name from public.groups where id = '00000000-0000-7000-8000-00000000b003'),
  '보통 그룹',
  'save_group: 권한이 막히면 이름도 저장되지 않는다(전부 되돌림)'
);
select isnt(
  public.save_group(
    '00000000-0000-7000-8000-00000000b003',
    (select updated_at from public.groups where id = '00000000-0000-7000-8000-00000000b003'),
    '보통 그룹', '설명', true,
    '{}', '{album:READ}'
  ),
  null,
  'save_group: 권한을 빼는 것도 함께 저장한다'
);
select is(
  (select count(*)::int from public.group_permissions where group_id = '00000000-0000-7000-8000-00000000b003'),
  0,
  'save_group: 뺀 권한이 지워졌다'
);

-- ----------------------------------------------------------------------------
-- create_group — 그룹과 처음 권한을 한 번에
-- ----------------------------------------------------------------------------
select isnt(
  public.create_group('새 묶음', null, '{album:READ}'),
  null,
  'create_group: 그룹을 만들고 id 를 돌려준다'
);
select is(
  (select count(*)::int from public.group_permissions gp join public.groups g on g.id = gp.group_id
    where g.name = '새 묶음'),
  1,
  'create_group: 처음 권한이 함께 들어갔다'
);
select throws_ok(
  $$select public.create_group('막힐 묶음', null, '{album:READ,album:UPDATE}')$$,
  '42501', null,
  'create_group: 자기에게 없는 권한은 줄 수 없다'
);
reset role;
select ok(
  not exists (select 1 from public.groups where name = '막힐 묶음'),
  'create_group: 권한이 막히면 그룹도 만들어지지 않는다(전부 되돌림)'
);

-- 방문자(anon)는 부를 수 없다
set local role anon;
select throws_ok(
  $$select public.save_user('00000000-0000-7000-8000-00000000a004', now(), 'x', null, true, '{}', '{}')$$,
  '42501', null, '방문자는 save_user 를 부를 수 없다'
);
select throws_ok(
  $$select public.create_group('x', null, '{}')$$,
  '42501', null, '방문자는 create_group 을 부를 수 없다'
);
reset role;

select * from finish();
rollback;
