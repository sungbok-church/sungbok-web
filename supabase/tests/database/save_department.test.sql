-- 다음세대 부서 한 번에 저장(save_department) — 부서 칸 · 사진 묶음 · 담당자(넣기 · 고치기 · 빼기 · 순서)를 함께,
-- 하나라도 막히면 전부 되돌리고, 화면을 연 뒤 다른 사람이 바꿨으면 저장하지 않는다(null). 로그인한 사람의 권한으로 돈다 —
-- 담당 부서가 정해진 사람은 자기 부서만(RLS · can_edit_department). `pnpm db:test`. 모든 변경은 끝에서 되돌린다.
begin;
select * from no_plan();

-- 준비(postgres = 사람 없는 변경)
-- 계정: i 영아부 담당(부서 수정) · w 부서 범위 없음(부서 수정) · r 부서 조회만
insert into auth.users (id, email) values
  ('00000000-0000-7000-8000-00000000d001', 'di@test.local'),
  ('00000000-0000-7000-8000-00000000d002', 'dw@test.local'),
  ('00000000-0000-7000-8000-00000000d003', 'dr@test.local');
update public.profiles set department = 'INFANT' where id = '00000000-0000-7000-8000-00000000d001';

insert into public.groups (id, name) values
  ('00000000-0000-7000-8000-00000000d101', 'dept-edit'),
  ('00000000-0000-7000-8000-00000000d102', 'dept-read');
insert into public.group_permissions (group_id, menu_id, action)
select g, m.id, a::public.permission_action
  from (values
    ('00000000-0000-7000-8000-00000000d101'::uuid, 'READ'),
    ('00000000-0000-7000-8000-00000000d101'::uuid, 'UPDATE'),
    ('00000000-0000-7000-8000-00000000d102'::uuid, 'READ')
  ) as v (g, a)
  join public.menus m on m.area = 'ADMIN' and m.key = 'departments';
insert into public.user_groups (user_id, group_id) values
  ('00000000-0000-7000-8000-00000000d001', '00000000-0000-7000-8000-00000000d101'),
  ('00000000-0000-7000-8000-00000000d002', '00000000-0000-7000-8000-00000000d101'),
  ('00000000-0000-7000-8000-00000000d003', '00000000-0000-7000-8000-00000000d102');

-- 사진 묶음: f1 영아부 · f2 중등부 · f3 · f4 새 사진 묶음 · f5 · f6 담당자 사진
insert into public.file_lists (id, menu_id)
select v.id::uuid, m.id
  from (values
    ('00000000-0000-7000-8000-0000000df001'), ('00000000-0000-7000-8000-0000000df002'),
    ('00000000-0000-7000-8000-0000000df003'), ('00000000-0000-7000-8000-0000000df004'),
    ('00000000-0000-7000-8000-0000000df005'), ('00000000-0000-7000-8000-0000000df006')
  ) as v (id)
  join public.menus m on m.area = 'ADMIN' and m.key = 'departments';
insert into public.departments (id, slug, ages, tagline, intro, photos_list_id) values
  ('00000000-0000-7000-8000-0000000de101', 'INFANT', '1~4세', '한 줄', '소개', '00000000-0000-7000-8000-0000000df001'),
  ('00000000-0000-7000-8000-0000000de102', 'MIDDLE', '중1~3', '한 줄', '소개', '00000000-0000-7000-8000-0000000df002');

create temp table ids (k text primary key, v uuid);
insert into ids values
  ('pastor', (select id from public.codes where group_key = 'STAFF_ROLE' and code = 'PASTOR')),
  ('coord', (select id from public.codes where group_key = 'STAFF_ROLE' and code = 'COORDINATOR'));
grant select on ids to authenticated;
create temp table seen (k text primary key, v timestamptz);
grant select, insert, update on seen to authenticated;
insert into seen select 'infant', updated_at from public.departments where slug = 'INFANT';
insert into seen select 'middle', updated_at from public.departments where slug = 'MIDDLE';

-- ----------------------------------------------------------------------------
-- 영아부 담당
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000d001","role":"authenticated"}', true);

select isnt(
  public.save_department(
    'INFANT', (select v from seen where k = 'infant'), '0~4세', '새 한 줄', '새 소개', '',
    '00000000-0000-7000-8000-0000000df003',
    jsonb_build_array(
      jsonb_build_object('id', null, 'name', '김목사', 'role_id', (select v from ids where k = 'pastor'),
                         'greeting', '안녕하세요', 'photo_list_id', '00000000-0000-7000-8000-0000000df005'),
      jsonb_build_object('id', null, 'name', '이간사', 'role_id', (select v from ids where k = 'coord'),
                         'greeting', '', 'photo_list_id', null)
    )
  ),
  null,
  '자기 부서는 저장한다(새 수정 시각)'
);
select is(
  (select row(ages, tagline, intro, extra, photos_list_id)::text from public.departments where slug = 'INFANT'),
  row('0~4세', '새 한 줄', '새 소개', null::text, '00000000-0000-7000-8000-0000000df003'::uuid)::text,
  '부서 칸 · 사진 묶음을 바꾼다(빈 «맨 아래 한 줄» 은 null)'
);
select is(
  (select array_agg(name || ':' || coalesce(greeting, '-') order by sort) from public.department_staff
    where department_id = '00000000-0000-7000-8000-0000000de101'),
  array['김목사:안녕하세요', '이간사:-'],
  '담당자를 순서대로 넣는다(빈 인사말은 null)'
);
update seen set v = (select updated_at from public.departments where slug = 'INFANT') where k = 'infant';

-- 순서 바꾸기 · 고치기 · 빼기 · 더하기를 한 번에
select isnt(
  public.save_department(
    'INFANT', (select v from seen where k = 'infant'), '0~4세', '새 한 줄', '새 소개', '처음 오시면',
    '00000000-0000-7000-8000-0000000df004',
    jsonb_build_array(
      jsonb_build_object('id', (select id from public.department_staff where name = '이간사'), 'name', '이간사님',
                         'role_id', (select v from ids where k = 'coord'), 'greeting', null,
                         'photo_list_id', '00000000-0000-7000-8000-0000000df006'),
      jsonb_build_object('id', null, 'name', '박전도사', 'role_id', (select v from ids where k = 'coord'),
                         'greeting', null, 'photo_list_id', null)
    )
  ),
  null,
  '다시 저장한다'
);
select is(
  (select array_agg(name order by sort) from public.department_staff
    where department_id = '00000000-0000-7000-8000-0000000de101'),
  array['이간사님', '박전도사'],
  '목록에 없는 담당자는 빼고, 있는 사람은 고치고 순서를 맞추고, 새 사람은 넣는다'
);
select is(
  (select photo_list_id from public.department_staff where name = '이간사님'),
  '00000000-0000-7000-8000-0000000df006'::uuid,
  '담당자 사진 묶음을 바꾼다'
);

select is(
  public.save_department(
    -- 한 트랜잭션 안에서는 now() 가 같아 수정 시각이 그대로다 — 화면이 연 «옛 시각» 을 직접 만든다
    'INFANT', (select v - interval '1 second' from seen where k = 'infant'), 'x', 'x', 'x', null,
    '00000000-0000-7000-8000-0000000df004', '[]'::jsonb
  ),
  null,
  '화면을 연 뒤 다른 사람이 저장했으면 저장하지 않는다'
);
select is(
  (select count(*)::int from public.department_staff where department_id = '00000000-0000-7000-8000-0000000de101'),
  2,
  '저장하지 않았으면 담당자도 그대로'
);

select is(
  public.save_department(
    'MIDDLE', (select v from seen where k = 'middle'), 'x', 'x', 'x', null,
    '00000000-0000-7000-8000-0000000df002', '[]'::jsonb
  ),
  null,
  '담당 부서가 아닌 부서는 저장되지 않는다'
);
reset role;
select is(
  (select ages from public.departments where slug = 'MIDDLE'),
  '중1~3',
  '다른 부서는 그대로'
);

-- ----------------------------------------------------------------------------
-- 부서 범위 없는 수정 권한 · 조회만
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000d003","role":"authenticated"}', true);
select is(
  public.save_department(
    'MIDDLE', (select v from seen where k = 'middle'), 'x', 'x', 'x', null,
    '00000000-0000-7000-8000-0000000df002', '[]'::jsonb
  ),
  null,
  '조회 권한만 있으면 저장되지 않는다'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000d002","role":"authenticated"}', true);
select isnt(
  public.save_department(
    'MIDDLE', (select v from seen where k = 'middle'), '중1~3학년', '한 줄', '소개', null,
    '00000000-0000-7000-8000-0000000df002', '[]'::jsonb
  ),
  null,
  '부서 범위가 없으면 어느 부서든 저장한다'
);
select throws_ok(
  $$select public.save_department(
    'MIDDLE', (select updated_at from public.departments where slug = 'MIDDLE'), '중1~3학년', '한 줄', '소개', null,
    '00000000-0000-7000-8000-0000000df002',
    jsonb_build_array(jsonb_build_object('id', null, 'name', '', 'role_id', (select v from ids where k = 'pastor'))))$$,
  '23514', null, '담당자 하나라도 막히면(빈 이름) 전부 되돌린다'
);
reset role;
select is(
  (select ages from public.departments where slug = 'MIDDLE'),
  '중1~3학년',
  '되돌린 저장은 앞 저장을 건드리지 않는다'
);

-- ----------------------------------------------------------------------------
-- «전체 관리» 는 부서가 정해져 있어도 모든 부서(화면의 부서 범위와 같은 기준)
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', '', true);
insert into auth.users (id, email) values ('00000000-0000-7000-8000-00000000d004', 'da@test.local');
update public.profiles set department = 'INFANT' where id = '00000000-0000-7000-8000-00000000d004';
insert into public.user_groups (user_id, group_id)
select '00000000-0000-7000-8000-00000000d004', id from public.groups where key = 'admin';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000d004","role":"authenticated"}', true);
select isnt(
  public.save_department(
    'MIDDLE', (select updated_at from public.departments where slug = 'MIDDLE'), '중1~3학년', '한 줄', '소개 2', null,
    '00000000-0000-7000-8000-0000000df002', '[]'::jsonb
  ),
  null,
  '«전체 관리» 는 부서가 정해져 있어도 다른 부서를 저장한다'
);
reset role;

-- ----------------------------------------------------------------------------
-- 폭별 파일(files.variants 안의 경로)도 «주인 있음» — 예약 작업이 지우지 않는다
-- ----------------------------------------------------------------------------
insert into storage.objects (bucket_id, name, created_at) values
  ('media', 'departments/00000000-0000-7000-8000-0000000df003/main.webp', now() - interval '9 days'),
  ('media', 'departments/00000000-0000-7000-8000-0000000df003/w640.webp', now() - interval '9 days'),
  ('media', 'departments/00000000-0000-7000-8000-0000000df003/lost.webp', now() - interval '9 days');
insert into public.files (list_id, sort, bucket, path, kind, width, height, bytes, original_name, variants) values
  ('00000000-0000-7000-8000-0000000df003', 1, 'media', 'departments/00000000-0000-7000-8000-0000000df003/main.webp',
   'IMAGE', 1600, 1067, 1, 'main.webp', '[[640, "departments/00000000-0000-7000-8000-0000000df003/w640.webp"]]');
select is(
  (select array_agg(n order by n) from public.orphan_storage_objects() n where n like 'departments/00000000-0000-7000-8000-0000000df003/%'),
  array['departments/00000000-0000-7000-8000-0000000df003/lost.webp'],
  '원본 · 폭별 파일은 주인 있음, 어느 줄도 가리키지 않는 파일만 주인 없음'
);

select * from finish();
rollback;
