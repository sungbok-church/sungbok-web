-- 권한 · 이력 · 지키는 규칙 — 방문자 · 권한 없는 계정 · 다른 부서 계정이 직접 DB 를 불러도 막히는지. `pnpm db:test`
-- 로그인은 request.jwt.claims 의 sub 로 흉내 낸다(auth.uid() 가 읽는 값). 모든 변경은 끝에서 되돌린다.
begin;
select * from no_plan();

-- ----------------------------------------------------------------------------
-- 준비(postgres = 사람 없는 변경이라 지키는 규칙을 건너뛴다)
-- ----------------------------------------------------------------------------
-- 계정: a 전체 관리 · c 콘텐츠 담당 · e 앨범 수정만 · n 새가족 담당 · d 영아부 담당 · g 그룹 관리(앨범 조회만) ·
--       u 사용자 관리(영아부 범위) · k 앨범 등록만 · x 그룹 없음(영아부 — u 의 범위 안. 범위 밖은 department_scope.test.sql)
insert into auth.users (id, email) values
  ('00000000-0000-7000-8000-00000000000a', 'a@test.local'),
  ('00000000-0000-7000-8000-00000000000c', 'c@test.local'),
  ('00000000-0000-7000-8000-00000000000e', 'e@test.local'),
  ('00000000-0000-7000-8000-000000000001', 'n@test.local'),
  ('00000000-0000-7000-8000-00000000000d', 'd@test.local'),
  ('00000000-0000-7000-8000-000000000002', 'g@test.local'),
  ('00000000-0000-7000-8000-000000000003', 'u@test.local'),
  ('00000000-0000-7000-8000-000000000004', 'k@test.local'),
  ('00000000-0000-7000-8000-00000000000f', 'x@test.local');

select is((select count(*)::int from public.profiles where email like '%@test.local'), 9, '계정을 만들면 사용자 정보가 생긴다');

-- 이 DB 에 원래 있던 «전체 관리» 구성원(로컬 개발 계정 등)은 끈다 — «마지막 구성원» 검사가 테스트 계정만 보게.
update public.profiles set is_active = false where email not like '%@test.local';

insert into public.groups (id, name) values
  ('00000000-0000-7000-8000-0000000000e0', 'test-editor'),
  ('00000000-0000-7000-8000-0000000000d0', 'test-dept'),
  ('00000000-0000-7000-8000-000000000020', 'test-granter'),
  ('00000000-0000-7000-8000-000000000030', 'test-users'),
  ('00000000-0000-7000-8000-000000000040', 'test-creator'),
  ('00000000-0000-7000-8000-000000000050', 'test-plain');

insert into public.group_permissions (group_id, menu_id, action)
select g, m.id, a::public.permission_action
  from (values
    ('00000000-0000-7000-8000-0000000000e0'::uuid, 'album', 'READ'),
    ('00000000-0000-7000-8000-0000000000e0'::uuid, 'album', 'UPDATE'),
    ('00000000-0000-7000-8000-0000000000e0'::uuid, 'album', 'HISTORY'),
    ('00000000-0000-7000-8000-0000000000d0'::uuid, 'departments', 'READ'),
    ('00000000-0000-7000-8000-0000000000d0'::uuid, 'departments', 'UPDATE'),
    ('00000000-0000-7000-8000-000000000020'::uuid, 'groups', 'READ'),
    ('00000000-0000-7000-8000-000000000020'::uuid, 'groups', 'UPDATE'),
    ('00000000-0000-7000-8000-000000000020'::uuid, 'album', 'READ'),
    ('00000000-0000-7000-8000-000000000030'::uuid, 'users', 'READ'),
    ('00000000-0000-7000-8000-000000000030'::uuid, 'users', 'UPDATE'),
    ('00000000-0000-7000-8000-000000000040'::uuid, 'album', 'READ'),
    ('00000000-0000-7000-8000-000000000040'::uuid, 'album', 'CREATE')
  ) as v (g, k, a)
  join public.menus m on m.area = 'ADMIN' and m.key = v.k;

insert into public.user_groups (user_id, group_id)
select u::uuid, (select id from public.groups where key = gk or (gk like 'test-%' and name = gk))
  from (values
    ('00000000-0000-7000-8000-00000000000a', 'admin'),
    ('00000000-0000-7000-8000-00000000000c', 'content'),
    ('00000000-0000-7000-8000-00000000000e', 'test-editor'),
    ('00000000-0000-7000-8000-000000000001', 'newcomer'),
    ('00000000-0000-7000-8000-00000000000d', 'test-dept'),
    ('00000000-0000-7000-8000-000000000002', 'test-granter'),
    ('00000000-0000-7000-8000-000000000003', 'test-users'),
    ('00000000-0000-7000-8000-000000000004', 'test-creator')
  ) as v (u, gk);

update public.profiles set department = 'INFANT'
 where id in ('00000000-0000-7000-8000-00000000000d', '00000000-0000-7000-8000-000000000003',
              '00000000-0000-7000-8000-00000000000f');

insert into public.categories (id, group_key, slug, label) values
  ('00000000-0000-7000-8000-0000000c0de1', 'ALBUM_CATEGORY', 'test-event', '시험 앨범 분류'),
  ('00000000-0000-7000-8000-0000000c0de2', 'ANNOUNCEMENTS_CATEGORY', 'test-sunday', '시험 광고 분류');

insert into public.file_lists (id, menu_id)
select v.id::uuid, m.id
  from (values
    ('00000000-0000-7000-8000-00000000f001', 'album'),
    ('00000000-0000-7000-8000-00000000f002', 'album'),
    ('00000000-0000-7000-8000-00000000f003', 'departments'),
    ('00000000-0000-7000-8000-00000000f004', 'departments'),
    ('00000000-0000-7000-8000-00000000f005', 'album'),
    ('00000000-0000-7000-8000-00000000f006', 'album')
  ) as v (id, k)
  join public.menus m on m.area = 'ADMIN' and m.key = v.k;

insert into public.files (list_id, sort, bucket, path, kind, width, height, bytes, original_name) values
  ('00000000-0000-7000-8000-00000000f001', 0, 'media', 'album/a/1.webp', 'IMAGE', 700, 998, 1000, '공개.webp'),
  ('00000000-0000-7000-8000-00000000f002', 0, 'media', 'album/b/1.webp', 'IMAGE', 700, 998, 1000, '임시.webp');

-- Storage 에 이미 올라간 파일 한 개(작성 중 묶음 f006) — 덮어쓰기 · 지우기 검사용
insert into storage.objects (bucket_id, name) values ('media', 'album/00000000-0000-7000-8000-00000000f006/1.webp');

insert into public.albums (id, slug, title, category_id, images_list_id, status) values
  ('00000000-0000-7000-8000-0000000a1b01', '2', '공개 앨범', '00000000-0000-7000-8000-0000000c0de1',
   '00000000-0000-7000-8000-00000000f001', 'PUBLISHED'),
  ('00000000-0000-7000-8000-0000000a1b02', '1000', '임시 앨범', '00000000-0000-7000-8000-0000000c0de1',
   '00000000-0000-7000-8000-00000000f002', 'DRAFT');

insert into public.departments (id, slug, ages, tagline, intro, photos_list_id) values
  ('00000000-0000-7000-8000-0000000de001', 'INFANT', '1~4세', '한 줄', '소개', '00000000-0000-7000-8000-00000000f003'),
  ('00000000-0000-7000-8000-0000000de002', 'MIDDLE', '중1~3', '한 줄', '소개', '00000000-0000-7000-8000-00000000f004');

insert into public.newcomers (id, intent, name, phone, consent_at, consent_version) values
  ('00000000-0000-7000-8000-0000000ae001', 'REGISTER', '홍길동', '010-1234-5678', now(), '2026-11');

insert into public.news_videos (id, feed, title, category_id, date, video_id, status) values
  ('00000000-0000-7000-8000-0000000b0001', 'ANNOUNCEMENTS', '주일광고', '00000000-0000-7000-8000-0000000c0de2',
   '2026-11-15', 'abcdefghijk', 'PUBLISHED');

select throws_ok(
  $$insert into public.albums (title, category_id, images_list_id)
    values ('x', '00000000-0000-7000-8000-0000000c0de1', '00000000-0000-7000-8000-00000000f003')$$,
  '23514', null, '글에는 그 화면의 파일 묶음만 붙는다(앨범에 부서 사진 묶음 X)'
);

-- 서버 전용 키(가져오기 · 예약 작업) — 사람 검사를 건너뛰고 판정 함수도 부르지 않는다
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select lives_ok(
  $$update public.news_videos set title = '주일광고(고침)' where id = '00000000-0000-7000-8000-0000000b0001'$$,
  '서버 전용 키로 주일광고를 고칠 수 있다'
);
select ok(
  (select array_agg(e order by e) from public.newcomer_notify_emails() e)
    @> array['a@test.local', 'n@test.local'],
  '새가족 알림: «새가족» 조회 권한이 있는 사람(전체 관리 포함)'
);
select ok(
  not exists (select 1 from public.newcomer_notify_emails() e where e in ('c@test.local', 'x@test.local')),
  '새가족 알림: 권한 없는 사람은 받지 않는다'
);
reset role;

-- ----------------------------------------------------------------------------
-- 방문자
-- ----------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is((select count(*)::int from public.albums), 1, '방문자: 공개 앨범만 보인다');
select is((select count(*)::int from public.files), 1, '방문자: 공개 글에 붙은 파일만 보인다');
select is((select count(*)::int from public.menus), 0, '방문자: 관리자 메뉴는 보이지 않는다');
select throws_ok('select * from public.newcomers', '42501', null, '방문자: 새가족을 읽을 수 없다');
select throws_ok(
  $$insert into public.newcomers (intent, name, phone, consent_at, consent_version)
    values ('REGISTER', '스팸', '010-0000-0000', now(), 'x')$$,
  '42501', null, '방문자: 새가족을 직접 넣을 수 없다(서버 전용 키로만)'
);
select throws_ok('select * from public.audit_log', '42501', null, '방문자: 변경 이력을 읽을 수 없다');
reset role;

-- ----------------------------------------------------------------------------
-- 그룹 없는 계정
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000000f","role":"authenticated"}', true);

select is((select count(*)::int from public.albums), 0, '권한 없음: 앨범이 보이지 않는다(공개된 것도 관리자 쪽에서는)');
select is((select count(*)::int from public.profiles), 1, '권한 없음: 자기 사용자 정보만 보인다');
select is(
  (select count(*)::int from public.actor_names(array['00000000-0000-7000-8000-00000000000c'::uuid])),
  0,
  '권한 없음: 다른 사람의 이름도 받지 못한다'
);
select throws_ok(
  $$insert into public.albums (title, category_id, images_list_id)
    values ('x', '00000000-0000-7000-8000-0000000c0de1', '00000000-0000-7000-8000-00000000f005')$$,
  '42501', null, '권한 없음: 앨범을 등록할 수 없다'
);
select lives_ok(
  $$update public.profiles set must_change_password = false where id = '00000000-0000-7000-8000-00000000000f'$$,
  '자기 비밀번호 변경 표시는 끌 수 있다'
);
select throws_ok(
  $$update public.profiles set name = '바꿈' where id = '00000000-0000-7000-8000-00000000000f'$$,
  '42501', null, '사용자 수정 권한 없이 자기 이름은 못 바꾼다'
);
select throws_ok(
  $$update public.profiles set must_change_password = true where id = '00000000-0000-7000-8000-00000000000f'$$,
  '42501', null, '자기 비밀번호 변경 표시를 다시 켜지는 못한다'
);
reset role;

-- ----------------------------------------------------------------------------
-- 콘텐츠 담당
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000000c","role":"authenticated"}', true);

select is((select count(*)::int from public.albums), 2, '콘텐츠 담당: 임시저장 앨범까지 보인다');
select lives_ok(
  $$insert into public.albums (id, title, category_id, images_list_id, created_by)
    values ('00000000-0000-7000-8000-0000000a1b03', '새 앨범', '00000000-0000-7000-8000-0000000c0de1',
            '00000000-0000-7000-8000-00000000f005', '00000000-0000-7000-8000-00000000000a')$$,
  '콘텐츠 담당: 앨범을 등록한다'
);
select is(
  (select created_by from public.albums where id = '00000000-0000-7000-8000-0000000a1b03'),
  '00000000-0000-7000-8000-00000000000c'::uuid,
  '등록한 사람은 화면이 보낸 값이 아니라 로그인한 사람'
);
select ok(
  (select slug::int >= 1000 from public.albums where id = '00000000-0000-7000-8000-0000000a1b03'),
  '새 앨범의 주소 번호는 1000 부터'
);
select throws_ok(
  $$insert into public.albums (title, category_id, category_group, images_list_id)
    values ('x', '00000000-0000-7000-8000-0000000c0de2', 'ANNOUNCEMENTS_CATEGORY', '00000000-0000-7000-8000-00000000f005')$$,
  null, null, '앨범에 주일광고 분류를 넣을 수 없다'
);
select throws_ok(
  $$insert into public.albums (title, category_id, images_list_id)
    values ('x', '00000000-0000-7000-8000-0000000c0de2', '00000000-0000-7000-8000-00000000f006')$$,
  '23503', null, '앨범 분류 칸은 앨범 분류 묶음의 코드만 받는다'
);
update public.albums set title = '공개 앨범(고침)' where id = '00000000-0000-7000-8000-0000000a1b01';
select is(
  (select changes from public.audit_log where table_name = 'albums' and row_id = '00000000-0000-7000-8000-0000000a1b01'
    and action = 'UPDATE' order by id desc limit 1),
  '{"title": ["공개 앨범", "공개 앨범(고침)"]}'::jsonb,
  '이력에는 바뀐 칸만 «이전 → 이후» 로 남는다'
);
select is(
  (select actor_id from public.audit_log where table_name = 'albums' order by id desc limit 1),
  '00000000-0000-7000-8000-00000000000c'::uuid,
  '이력의 «누가» 는 로그인한 사람'
);
delete from public.albums where id = '00000000-0000-7000-8000-0000000a1b01';
select ok(
  exists (select 1 from public.albums where id = '00000000-0000-7000-8000-0000000a1b01'),
  '휴지통에 들지 않은 글은 완전 삭제되지 않는다'
);
update public.albums set deleted_at = now() where id = '00000000-0000-7000-8000-0000000a1b01';
select is(
  (select deleted_by from public.albums where id = '00000000-0000-7000-8000-0000000a1b01'),
  '00000000-0000-7000-8000-00000000000c'::uuid,
  '휴지통에 보낸 사람이 남는다'
);
select ok(
  private.can_write_storage_path('album/00000000-0000-7000-8000-00000000f005/1.webp'),
  'Storage: 앨범 묶음 경로에 올릴 수 있다'
);
select ok(
  not private.can_write_storage_path('bulletin/00000000-0000-7000-8000-00000000f005/1.webp'),
  'Storage: 경로의 메뉴가 묶음의 메뉴와 다르면 거절'
);
select ok(not private.can_write_storage_path('album/../x.webp'), 'Storage: 모양이 틀린 경로는 거절');
select lives_ok(
  $$insert into public.files (list_id, sort, bucket, path, kind, width, height, bytes, original_name)
    values ('00000000-0000-7000-8000-00000000f005', 1, 'media',
            'album/00000000-0000-7000-8000-00000000f005/2.webp', 'IMAGE', 1, 1, 1, '2.webp')$$,
  '파일: 묶음의 메뉴 경로는 적는다'
);
select throws_ok(
  $$insert into public.files (list_id, sort, bucket, path, kind, width, height, bytes, original_name)
    values ('00000000-0000-7000-8000-00000000f005', 2, 'media',
            'bulletin/00000000-0000-7000-8000-00000000f005/3.webp', 'IMAGE', 1, 1, 1, '3.webp')$$,
  '42501', null, '파일: 묶음의 메뉴와 다른 메뉴의 경로는 적지 못한다'
);
select throws_ok(
  $$insert into public.files (list_id, sort, bucket, path, kind, width, height, bytes, original_name)
    values ('00000000-0000-7000-8000-00000000f005', 2, 'other',
            'album/00000000-0000-7000-8000-00000000f005/3.webp', 'IMAGE', 1, 1, 1, '3.webp')$$,
  '42501', null, '파일: media 버킷만'
);
select throws_ok(
  $$update public.files set path = 'bulletin/00000000-0000-7000-8000-00000000f005/2.webp'
     where list_id = '00000000-0000-7000-8000-00000000f005' and sort = 1$$,
  '42501', null, '파일: 고칠 때도 다른 메뉴의 경로로 바꾸지 못한다'
);
select ok(
  not private.can_write_storage_path('departments/00000000-0000-7000-8000-00000000f003/1.webp'),
  'Storage: 권한 없는 메뉴의 묶음은 거절'
);
select throws_ok('select public.purge_expired()', '42501', null, '로그인 사용자는 예약 작업을 못 부른다');
reset role;

-- 완전 삭제는 휴지통에 든 것만(콘텐츠 담당은 «완전 삭제» 권한이 있다)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000000c","role":"authenticated"}', true);
delete from public.albums where id = '00000000-0000-7000-8000-0000000a1b01';
select ok(
  not exists (select 1 from public.albums where id = '00000000-0000-7000-8000-0000000a1b01'),
  '휴지통에 든 글은 완전 삭제된다'
);
reset role;

-- ----------------------------------------------------------------------------
-- 앨범 «수정» 만 있는 계정 — 휴지통 보내기는 «삭제» 권한
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000000e","role":"authenticated"}', true);
select lives_ok(
  $$update public.albums set title = '고침' where id = '00000000-0000-7000-8000-0000000a1b02'$$,
  '수정 권한: 제목을 고친다'
);
select throws_ok(
  $$update public.albums set deleted_at = now() where id = '00000000-0000-7000-8000-0000000a1b02'$$,
  '42501', null, '수정 권한만으로는 휴지통에 보낼 수 없다'
);
select ok(
  (select count(*) > 0 from public.audit_log where table_name = 'albums'),
  '이력조회 권한: 앨범 이력을 본다'
);
select is(
  (select count(*)::int from public.audit_log where table_name = 'newcomers'),
  0,
  '이력조회 권한은 그 메뉴의 이력만'
);
select is(
  (select name from public.actor_names(array['00000000-0000-7000-8000-00000000000c'::uuid])),
  'c',
  '이력조회 권한이 있으면 «누가» 의 이름을 본다'
);
reset role;

-- ----------------------------------------------------------------------------
-- 앨범 «등록» 만 있는 계정 — 이미 글에 붙은 묶음의 파일은 못 건드린다
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-000000000004","role":"authenticated"}', true);
select ok(
  private.can_write_list('00000000-0000-7000-8000-00000000f006'),
  '등록 권한: 아직 글에 붙지 않은 묶음(작성 중)에는 파일을 넣는다'
);
select ok(
  not private.can_write_list('00000000-0000-7000-8000-00000000f002'),
  '등록 권한: 이미 글에 붙은 묶음의 파일은 못 바꾼다'
);
-- Storage 는 올리기만 — 덮어쓰기 · 지우기는 아무도 못 한다(올리기 묶음은 글에 붙지 않아 «등록» 권한으로
-- 열리므로, 열어 두면 공개된 글의 그림을 바꾸거나 지울 수 있다). 정리는 서버 전용 키가 한다.
select is_empty(
  $$update storage.objects set metadata = '{"x": 1}'::jsonb
     where name = 'album/00000000-0000-7000-8000-00000000f006/1.webp' returning 1$$,
  'Storage: 올라간 파일은 덮어쓰지 못한다'
);
select set_config('storage.allow_delete_query', 'true', true);
select is_empty(
  $$delete from storage.objects where name = 'album/00000000-0000-7000-8000-00000000f006/1.webp' returning 1$$,
  'Storage: 올라간 파일은 지우지 못한다'
);
select set_config('storage.allow_delete_query', 'false', true);
delete from public.files where list_id = '00000000-0000-7000-8000-00000000f002';
reset role;
-- 자기가 등록한 임시저장 글의 묶음은 «등록» 권한으로도 고친다
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-000000000004","role":"authenticated"}', true);
insert into public.albums (title, category_id, images_list_id)
values ('내 임시 앨범', '00000000-0000-7000-8000-0000000c0de1', '00000000-0000-7000-8000-00000000f006');
select ok(
  private.can_write_list('00000000-0000-7000-8000-00000000f006'),
  '등록 권한: 자기가 등록한 임시저장 글의 묶음은 고친다'
);
select ok(
  not private.can_write_list('00000000-0000-7000-8000-00000000f005'),
  '등록 권한: 다른 사람이 등록한 임시저장 글의 묶음은 못 고친다'
);
select ok(
  (select bool_and(menu_key = 'album') and count(*) = 2 from public.my_permissions()),
  '내 권한 목록: 가진 것(앨범 조회 · 등록)만'
);
reset role;
select is(
  (select count(*)::int from public.files where list_id = '00000000-0000-7000-8000-00000000f002'),
  1,
  '등록 권한: 글에 붙은 묶음의 파일 지우기는 0줄'
);

-- ----------------------------------------------------------------------------
-- 분류 · 공통코드 — 영문 값은 바꾸지 못한다, 잠긴 묶음은 더하거나 끌 수 없다(«전체 관리» 여도)
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000000a","role":"authenticated"}', true);
select throws_ok(
  $$update public.categories set slug = 'changed' where id = '00000000-0000-7000-8000-0000000c0de1'$$,
  '42501', null, '분류의 영문 이름은 바꿀 수 없다'
);
select lives_ok(
  $$update public.categories set label = '시험 앨범 분류(고침)' where id = '00000000-0000-7000-8000-0000000c0de1'$$,
  '분류 이름은 바꾼다'
);
select throws_ok(
  $$insert into public.codes (group_key, code, label) values ('NEWCOMER_STATUS', 'LOST', '연락 안 됨')$$,
  '42501', null, '잠긴 묶음(새가족 처리 상태)에는 코드를 더할 수 없다'
);
select throws_ok(
  $$update public.codes set is_active = false where group_key = 'CONTENT_STATUS' and code = 'DRAFT'$$,
  '42501', null, '잠긴 코드는 끌 수 없다'
);
select throws_ok(
  $$update public.codes set code = 'MINISTER' where group_key = 'STAFF_ROLE' and code = 'PASTOR'$$,
  '42501', null, '코드 값은 바꿀 수 없다'
);
select lives_ok(
  $$update public.codes set label = '접수됨', sort = 15 where group_key = 'NEWCOMER_STATUS' and code = 'NEW'$$,
  '잠긴 코드도 이름 · 순서는 바꾼다'
);
select lives_ok(
  $$insert into public.codes (group_key, code, label, sort) values ('STAFF_ROLE', 'PGTAP_ROLE', '시험 직분', 40)$$,
  '잠기지 않은 묶음(직분)에는 더한다'
);
select throws_ok(
  $$insert into public.codes (group_key, code, label) values ('STAFF_ROLE', 'elder2', '장로2')$$,
  '23514', null, '코드 값은 영문 대문자'
);
reset role;

-- ----------------------------------------------------------------------------
-- 새가족 담당 — 개인정보는 이력에 값이 남지 않는다
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from public.albums), 0, '새가족 담당: 앨범은 보이지 않는다');
select is((select count(*)::int from public.newcomers), 1, '새가족 담당: 접수가 보인다');
update public.newcomers set name = '홍길순', status = 'CONTACTED' where id = '00000000-0000-7000-8000-0000000ae001';
select is(
  (select changes from public.audit_log
    where table_name = 'newcomers' and action = 'UPDATE' and row_id = '00000000-0000-7000-8000-0000000ae001'
    order by id desc limit 1),
  '{"name": null, "status": ["NEW", "CONTACTED"]}'::jsonb,
  '새가족 이력: 이름은 «바뀌었다» 만, 상태는 값까지'
);
select ok(
  (select changes ->> 'name' is null and changes ? 'name' and changes ->> 'phone' is null
     from public.audit_log
    where table_name = 'newcomers' and action = 'INSERT' and row_id = '00000000-0000-7000-8000-0000000ae001'),
  '새가족 이력: 등록 때도 이름 · 연락처 값이 없다'
);
select lives_ok(
  $$insert into public.audit_log (table_name, action, changes) values ('newcomers', 'EXPORT', '{"count": 1}')$$,
  '엑셀 다운로드 기록을 남긴다'
);
select is(
  (select actor_id from public.audit_log where action = 'EXPORT' order by id desc limit 1),
  '00000000-0000-7000-8000-000000000001'::uuid,
  '다운로드 기록의 «누가» 는 기본값(로그인한 사람)'
);
select throws_ok(
  $$insert into public.audit_log (table_name, action, changes, at) values ('newcomers', 'EXPORT', '{}', now() - interval '1 year')$$,
  '42501', null, '다운로드 기록의 시각을 지어 넣을 수 없다'
);
select throws_ok(
  $$insert into public.audit_log (table_name, action, changes) values ('albums', 'UPDATE', '{}')$$,
  '42501', null, '다운로드 기록 말고는 이력에 직접 쓸 수 없다'
);
delete from public.newcomers where id = '00000000-0000-7000-8000-0000000ae001';
reset role;
select ok(
  not exists (
    select 1 from public.audit_log
     where table_name = 'newcomers' and (changes::text like '%홍길%' or changes::text like '%1234%')
  ),
  '새가족을 지운 뒤 이력 어디에도 이름 · 연락처가 없다'
);

-- ----------------------------------------------------------------------------
-- 부서 범위 — 영아부 담당은 영아부만
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000000d","role":"authenticated"}', true);
update public.departments set tagline = '고침' where slug in ('INFANT', 'MIDDLE');
select is((select tagline from public.departments where slug = 'INFANT'), '고침', '영아부 담당: 영아부를 고친다');
select is((select tagline from public.departments where slug = 'MIDDLE'), '한 줄', '영아부 담당: 중등부는 고칠 수 없다');
select throws_ok(
  $$insert into public.department_staff (department_id, sort, name, role_id)
    values ('00000000-0000-7000-8000-0000000de002', 0, '홍',
            (select id from public.codes where group_key = 'STAFF_ROLE' and code = 'PASTOR'))$$,
  '42501', null, '영아부 담당: 중등부 담당자를 넣을 수 없다'
);
select ok(
  private.can_write_storage_path('departments/00000000-0000-7000-8000-00000000f003/1.webp'),
  '영아부 담당: 영아부 사진 묶음에 올린다'
);
select ok(
  not private.can_write_storage_path('departments/00000000-0000-7000-8000-00000000f004/1.webp'),
  '영아부 담당: 중등부 사진 묶음에는 못 올린다'
);
reset role;

-- ----------------------------------------------------------------------------
-- 권한 올리기 방지
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.group_permissions (group_id, menu_id, action)
    select '00000000-0000-7000-8000-000000000030', id, 'READ' from public.menus where area = 'ADMIN' and key = 'album'$$,
  '42501', null, '그룹 관리: 자기가 가진 권한(앨범 조회)도 주지 못한다 — 그룹 권한은 «전체 관리» 만'
);
select throws_ok(
  $$insert into public.groups (name) values ('그룹 관리가 만든 그룹')$$,
  '42501', null, '그룹 관리: 그룹을 만들지 못한다 — «전체 관리» 만'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-000000000003","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-000000000003', (select id from public.groups where key = 'content'))$$,
  '42501', null, '자기 그룹은 바꿀 수 없다'
);
select throws_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000000f', (select id from public.groups where key = 'admin'))$$,
  '42501', null, '«전체 관리» 가 아니면 «전체 관리» 구성원을 바꿀 수 없다'
);
select throws_ok(
  $$update public.profiles set is_active = false where id = '00000000-0000-7000-8000-00000000000a'$$,
  '42501', null, '«전체 관리» 가 아니면 «전체 관리» 구성원을 끌 수 없다'
);
select throws_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000000f', (select id from public.groups where key = 'newcomer'))$$,
  '42501', null, '내가 속하지 않은 그룹(새가족 담당)에는 넣을 수 없다'
);
select throws_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000000f', '00000000-0000-7000-8000-000000000050')$$,
  '42501', null, '권한이 없는 그룹이어도 내가 속하지 않았으면 넣을 수 없다'
);
select lives_ok(
  $$insert into public.user_groups (user_id, group_id)
    values ('00000000-0000-7000-8000-00000000000f', '00000000-0000-7000-8000-000000000030')$$,
  '사용자 관리: 내가 속한 그룹에는 넣는다'
);
select ok(
  not public.can_manage_user('00000000-0000-7000-8000-00000000000a'),
  '사용자 관리: «전체 관리» 구성원의 비밀번호 초기화는 못 한다(서버가 먼저 확인)'
);
select ok(
  not public.can_manage_user('00000000-0000-7000-8000-00000000000c'),
  '사용자 관리: 내가 속하지 않은 그룹의 사람(콘텐츠 담당)은 관리하지 못한다 — 비밀번호를 초기화하면 그 권한을 받게 된다'
);
select ok(
  public.can_manage_user('00000000-0000-7000-8000-00000000000f'),
  '사용자 관리: 내 그룹에만 속한 사람은 관리한다'
);
select ok(not public.can_manage_user('00000000-0000-7000-8000-000000000003'), '자기 자신은 이 화면으로 관리하지 않는다');
select throws_ok(
  $$update public.profiles set department = null where id = '00000000-0000-7000-8000-000000000003'$$,
  '42501', null, '자기 부서 범위는 풀 수 없다'
);
reset role;

-- ----------------------------------------------------------------------------
-- 전체 관리 — 메뉴 규칙 · 잠김 방지
-- ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000000a","role":"authenticated"}', true);
select lives_ok(
  $$update public.menus set label = '주보 관리' where area = 'ADMIN' and key = 'bulletin'$$,
  '메뉴 이름을 바꾼다'
);
select throws_ok(
  $$update public.menus set path = '/admin/x' where area = 'ADMIN' and key = 'bulletin'$$,
  '42501', null, '메뉴 주소는 화면에서 바꿀 수 없다'
);
select throws_ok(
  $$update public.menus set is_active = false where area = 'ADMIN' and key = 'users'$$,
  '23514', null, '잠긴 메뉴는 끌 수 없다'
);
select throws_ok(
  $$update public.profiles set is_active = false where id = '00000000-0000-7000-8000-00000000000a'$$,
  '42501', null, '자기 계정은 끌 수 없다'
);
select throws_ok(
  $$update public.groups set is_active = false where key = 'admin'$$,
  null, null, '«전체 관리» 그룹은 끌 수 없다'
);
select throws_ok(
  $$insert into public.group_permissions (group_id, menu_id, action)
    select '00000000-0000-7000-8000-000000000030', id, 'CREATE' from public.menus where area = 'ADMIN' and key = 'home-hero'$$,
  '23514', null, '메뉴에 없는 기능은 권한으로 줄 수 없다(«전체 관리» 여도)'
);
select throws_ok(
  $$insert into public.groups (name, key) values ('가짜 관리', 'fake')$$,
  '42501', null, '화면에서 그룹 key 를 정할 수 없다(«전체 관리» 여도)'
);
select throws_ok(
  $$update public.departments set slug = 'HIGH' where slug = 'MIDDLE'$$,
  '42501', null, '부서 slug 는 바꿀 수 없다'
);
reset role;

-- 여기부터는 사람 없는 변경(변경 파일 · 예약 작업). auth.uid() 는 역할이 아니라 로그인 값을 읽으므로 그것도 비운다.
select set_config('request.jwt.claims', '', true);

-- 마지막 «전체 관리» 구성원을 빼면 막힌다(지연 검사를 바로 돌린다)
set constraints all immediate;
select throws_ok(
  $$delete from public.user_groups
     where user_id = '00000000-0000-7000-8000-00000000000a'
       and group_id = (select id from public.groups where key = 'admin')$$,
  '23514', null, '«전체 관리» 의 마지막 활성 구성원은 뺄 수 없다'
);

-- 두 사람이 동시에 서로를 끄면 각자 «다른 한 명이 남아 있다» 를 보고 둘 다 통과할 수 있다(커밋 전 상태는 서로 안 보인다).
-- 검사는 차례로 돌아야 한다 — 한 트랜잭션 안의 테스트로는 동시 실행을 만들 수 없어 잠금을 거는지만 본다
-- (2026-11-23 로컬 DB 에서 두 연결로 확인: 잠금이 없으면 둘 다 통과해 0명, 있으면 뒤에 온 쪽이 거절돼 1명 남는다)
-- 잠금은 사용자 · 소속을 읽기 전에 걸어야 한다(뒤에 걸면 커밋 전 상태로 이미 판단한 뒤다)
select ok(
  (with d as (select pg_get_functiondef('private.ensure_admin_remains'::regproc) as src),
        p as (select strpos(src, 'perform pg_catalog.pg_advisory_xact_lock') as lock_at,
                     strpos(src, 'from public.user_groups') as ug_at,
                     strpos(src, 'from public.profiles') as profiles_at,
                     strpos(src, 'join public.profiles') as profiles_join_at
                from d)
   select lock_at > 0 and lock_at < ug_at and (profiles_at = 0 or lock_at < profiles_at)
      and lock_at < profiles_join_at
     from p),
  '«전체 관리» 남기기 검사는 사용자 · 소속을 읽기 전에 잠금을 걸고 차례로 돈다(동시에 서로를 꺼서 0명이 되지 않게)'
);

-- 한 번에 끄고 그룹에서도 빼도(사용자 수정 저장 — save_user) 마지막 구성원이면 막힌다
select throws_ok(
  $$set constraints all deferred;
    update public.profiles set is_active = false where id = '00000000-0000-7000-8000-00000000000a';
    delete from public.user_groups
     where user_id = '00000000-0000-7000-8000-00000000000a'
       and group_id = (select id from public.groups where key = 'admin');
    set constraints all immediate$$,
  '23514', null, '마지막 «전체 관리» 구성원을 끄면서 그룹에서도 빼면 막힌다'
);
set constraints all immediate;

-- «전체 관리» 가 0명인 DB(새 프로젝트)에서도 일반 사용자는 끌 수 있다
-- (새 프로젝트처럼 0명인 상태를 만들려고 이 검사만 잠깐 끈다 — 끝에서 되돌린다)
alter table public.user_groups disable trigger ensure_admin_remains;
delete from public.user_groups where group_id = (select id from public.groups where key = 'admin');
alter table public.user_groups enable trigger ensure_admin_remains;
select lives_ok(
  $$update public.profiles set is_active = false where id = '00000000-0000-7000-8000-00000000000f'$$,
  '«전체 관리» 가 0명이어도 일반 사용자는 끌 수 있다'
);

select is((select count(*)::int from public.profiles p join auth.users u on u.id = p.id where u.is_anonymous), 0,
  '익명 계정에는 사용자 정보가 없다');
insert into auth.users (id, email, is_anonymous) values ('00000000-0000-7000-8000-0000000000a0', null, true);
select ok(not exists (select 1 from public.profiles where id = '00000000-0000-7000-8000-0000000000a0'),
  '익명 로그인 계정이 생겨도 사용자 정보를 만들지 않는다');

-- 메뉴에서 기능이 빠지면(변경 파일) 그 권한 칸도 사라진다
update public.menus set actions = '{READ,UPDATE}' where area = 'ADMIN' and key = 'album';
select is(
  (select count(*)::int from public.group_permissions gp join public.menus m on m.id = gp.menu_id
    where m.key = 'album' and gp.action not in ('READ', 'UPDATE')),
  0,
  '메뉴에서 빠진 기능의 권한 칸은 지워진다'
);

select * from finish();
rollback;
