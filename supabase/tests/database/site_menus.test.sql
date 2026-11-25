-- 홈페이지 메뉴(설계 6.5) — 방문자는 홈페이지 메뉴만 읽고, 잠긴 메뉴는 «전체 관리» 도 끄지 못한다.
-- 예약 작업의 «주인 없는 묶음» 은 만든 지 8일 넘은 것만(임시 보관 7일 + 하루). `pnpm db:test`. 모든 변경은 끝에서 되돌린다.
begin;
select * from no_plan();

-- ----------------------------------------------------------------------------
-- 방문자
-- ----------------------------------------------------------------------------
set local role anon;
select is(
  (select count(*)::int from public.menus where parent_id is null),
  6,
  '방문자: 홈페이지 대메뉴 6개를 읽는다'
);
select is((select count(*)::int from public.menus), 30, '방문자: 홈페이지 메뉴(대 6 · 하위 24)만 읽는다 — 관리자 메뉴는 안 보인다');
reset role;

select is(
  (select array_agg(key order by key) from public.menus where area = 'SITE' and is_locked and parent_id is not null),
  array[
    'news-announcements',
    'next-generation-elementary', 'next-generation-english', 'next-generation-high', 'next-generation-infant',
    'next-generation-kindergarten', 'next-generation-lower-elementary', 'next-generation-middle',
    'next-generation-young-adult',
    'worship-sunday'
  ],
  '잠긴 하위 메뉴 = 홈이 고정 링크로 가리키는 곳'
);

-- ----------------------------------------------------------------------------
-- «전체 관리»
-- ----------------------------------------------------------------------------
insert into auth.users (id, email) values ('00000000-0000-7000-8000-00000000a501', 'sm@test.local');
insert into public.user_groups (user_id, group_id)
select '00000000-0000-7000-8000-00000000a501', id from public.groups where key = 'admin';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-7000-8000-00000000a501","role":"authenticated"}', true);

select throws_ok(
  $$update public.menus set is_active = false where area = 'SITE' and key = 'location'$$,
  '23514', null, '잠긴 메뉴(찾아오시는 길)는 «전체 관리» 도 끄지 못한다'
);
update public.menus set is_active = false where area = 'SITE' and key = 'about-history';
select is(
  (select is_active from public.menus where area = 'SITE' and key = 'about-history'),
  false,
  '잠기지 않은 메뉴(연혁)는 끈다'
);
update public.menus set label = '교회 연혁' where area = 'SITE' and key = 'about-history';
select is(
  (select label from public.menus where area = 'SITE' and key = 'about-history'),
  '교회 연혁',
  '이름을 바꾼다'
);
select throws_ok(
  $$update public.menus set label = '아홉 글자 대메뉴다' where area = 'SITE' and key = 'about'$$,
  '23514', null, '홈페이지 대메뉴 이름은 8자까지(로고와 한 줄)'
);
select throws_ok(
  $$update public.menus set label = repeat('가', 21) where area = 'SITE' and key = 'about-history'$$,
  '23514', null, '홈페이지 하위 메뉴 이름은 20자까지'
);
update public.menus set label = repeat('가', 30) where area = 'ADMIN' and key = 'bulletin';
select is(
  (select char_length(label) from public.menus where area = 'ADMIN' and key = 'bulletin'),
  30,
  '관리자 메뉴 이름은 전처럼 50자까지'
);
select throws_ok(
  $$update public.menus set path = '/about/story' where area = 'SITE' and key = 'about-history'$$,
  '42501', null, '주소는 바꾸지 못한다'
);
reset role;

-- ----------------------------------------------------------------------------
-- 주인 없는 묶음 — 만든 지 8일 넘은 것만
-- ----------------------------------------------------------------------------
select set_config('request.jwt.claims', '', true);
insert into public.file_lists (id, menu_id)
select v.id::uuid, m.id
  from (values ('00000000-0000-7000-8000-00000000a601'), ('00000000-0000-7000-8000-00000000a602')) as v (id)
  join public.menus m on m.area = 'ADMIN' and m.key = 'bulletin';
-- 등록 시각은 트리거가 지금으로 찍는다 — 지난 시각으로 옮긴다
update public.file_lists set created_at = now() - interval '7 days' where id = '00000000-0000-7000-8000-00000000a601';
update public.file_lists set created_at = now() - interval '9 days' where id = '00000000-0000-7000-8000-00000000a602';
select is(
  (select array_agg(id::text order by id) from private.orphan_file_lists
    where id in ('00000000-0000-7000-8000-00000000a601', '00000000-0000-7000-8000-00000000a602')),
  array['00000000-0000-7000-8000-00000000a602'],
  '7일 된 묶음은 남기고(임시 보관한 글이 쓸 수 있다) 9일 된 묶음만 지울 대상'
);

select * from finish();
rollback;
