-- ============================================================================
-- 성복교회 웹 DB 초기 행 — 정본(SSOT)
-- ============================================================================
-- 구조는 supabase/schemas/schema.sql, 이 파일은 «처음부터 있어야 하는 행» 이다: 분류 묶음과 처음 분류 ·
-- 공통코드 묶음과 코드 · 관리자 메뉴 · 처음 그룹과 그 권한 · Storage 버킷 · 첫 관리자.
-- 이 파일을 고치면 `pnpm db:sync` 가 내용을 그대로 담은 변경 파일(<시각>_reference.sql)을 하나 더 만든다.
-- 그래서 **여러 번 돌려도 같은 결과**여야 하고, **화면에서 바꾼 값을 덮어쓰면 안 된다**:
--   · 메뉴: 구조(상위 · 기본 이름 · 주소 · 기능 · 잠김)만 맞추고 이름(label) · 사용 여부 · 순서는 처음 넣을 때만 정한다.
--   · 그룹: 없을 때만 만든다. 처음 권한도 그룹을 새로 만들 때만 준다(화면에서 뺀 권한이 되살아나지 않게).
--   · 분류 · 공통코드 묶음: 이름 · 순서(· 설명 · 잠김)를 맞춘다.
--   · 처음 분류 · 코드: 없을 때만 넣는다(화면에서 이름을 바꿨거나 같은 이름이 있으면 건너뛴다).
--     잠긴 공통코드(enum 과 같은 값)는 enum 값이 늘면 여기에 같이 더한다 — supabase/tests 가 어긋남을 잡는다.
-- 사람이 없는 변경이라 변경 이력에는 «시스템» 으로 남는다.
-- 홈페이지 메뉴(area = SITE)는 아래 «홈페이지 메뉴» — siteNav 와 같게 둔다.

-- ----------------------------------------------------------------------------
-- 분류(카테고리 · 칩) — 콘텐츠 › 분류 관리. 처음 분류는 지금 사이트에 있는 값이다.
-- ----------------------------------------------------------------------------

insert into public.category_groups (key, name, sort) values
  ('ANNOUNCEMENTS_CATEGORY', '주일광고 분류',                    10),
  ('GARDEN_CATEGORY',        '성복의 뜰 분류',                   20),
  ('ALBUM_CATEGORY',         '교회앨범 분류',                    30),
  ('RESOURCE_SUNDAY',        '설교 시트지 · 주일 강해',           40),
  ('RESOURCE_SERIES',        '설교 시트지 · 시리즈',              50),
  ('RESOURCE_SEASONAL',      '설교 시트지 · 가정 · 명절 · 절기',  60)
on conflict (key) do update set name = excluded.name, sort = excluded.sort;

insert into public.categories (group_key, slug, label, sort) values
  ('ANNOUNCEMENTS_CATEGORY', 'notice',               '주일광고',                      10),
  ('GARDEN_CATEGORY',        'revival',              '부흥집회',                      10),
  ('GARDEN_CATEGORY',        'church-news',          '교회소식',                      20),
  ('ALBUM_CATEGORY',         'church-event',         '교회행사',                      10),
  ('ALBUM_CATEGORY',         'next-generation',      '다음세대',                      20),
  ('RESOURCE_SUNDAY',        'acts',                 '사도행전 강해',                 10),
  ('RESOURCE_SERIES',        'death-heaven-hell',    '죽음, 그리고 천국과 지옥',      10),
  ('RESOURCE_SERIES',        'reviving-worship',     '우리를 살리는 예배',            20),
  ('RESOURCE_SERIES',        'pleasing-worship',     '하나님께서 기뻐 받으시는 예배', 30),
  ('RESOURCE_SERIES',        'spirit-power-fruit',   '성령의 능력, 성령의 열매',      40),
  ('RESOURCE_SERIES',        'reviving-small-group', '우리를 살리는 소그룹',          50),
  ('RESOURCE_SEASONAL',      'family-worship',       '가정예배',                      10),
  ('RESOURCE_SEASONAL',      'holiday',              '명절',                          20),
  ('RESOURCE_SEASONAL',      'feast',                '절기',                          30)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 공통코드 — 시스템 › 코드 관리. 잠긴 묶음은 enum 과 같은 값이다(이름 · 순서만 화면에서 바꾼다).
-- ----------------------------------------------------------------------------

insert into public.code_groups (key, name, description, is_locked, sort) values
  ('STAFF_ROLE',      '직분',             '다음세대 부서 담당자의 직분',                                         false, 10),
  ('CONTENT_STATUS',  '콘텐츠 상태',      '주보 · 주일광고 · 성복의 뜰 · 교회앨범 · 설교 시트지의 공개 여부',  true,  20),
  ('NEWCOMER_INTENT', '새가족 구분',      '새가족 접수의 종류',                                                  true,  30),
  ('NEWCOMER_STATUS', '새가족 처리 상태', '새가족 접수를 처리한 단계',                                           true,  40)
on conflict (key) do update set
  name = excluded.name, description = excluded.description, is_locked = excluded.is_locked, sort = excluded.sort;

insert into public.codes (group_key, code, label, sort) values
  ('STAFF_ROLE',      'PASTOR',      '목사',     10),
  ('STAFF_ROLE',      'EVANGELIST',  '전도사',   20),
  ('STAFF_ROLE',      'COORDINATOR', '간사',     30),
  ('CONTENT_STATUS',  'DRAFT',       '임시저장', 10),
  ('CONTENT_STATUS',  'PUBLISHED',   '게시',     20),
  ('NEWCOMER_INTENT', 'REGISTER',    '등록',     10),
  ('NEWCOMER_INTENT', 'INQUIRY',     '문의',     20),
  ('NEWCOMER_STATUS', 'NEW',         '접수',     10),
  ('NEWCOMER_STATUS', 'CONTACTED',   '연락함',   20),
  ('NEWCOMER_STATUS', 'DONE',        '완료',     30)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 관리자 메뉴 — 설계 6.4 의 표와 같다. 묶음 머리(주소 없음) → 그 아래 화면 순서로 넣는다.
-- ----------------------------------------------------------------------------

with spec (key, parent_key, default_label, path, sort, is_locked, actions) as (
  values
    ('dashboard',     null,       '첫 화면',      '/admin',               0,  true,  '{}'::public.permission_action[]),
    ('content',       null,       '콘텐츠',       null,                   10, false, '{}'),
    ('site-screens',  null,       '사이트 화면',  null,                   20, false, '{}'),
    ('intake',        null,       '접수',         null,                   30, false, '{}'),
    ('system',        null,       '시스템',       null,                   40, true,  '{}')
)
insert into public.menus (area, key, parent_id, default_label, path, sort, is_locked, actions)
select 'ADMIN', s.key, null, s.default_label, s.path, s.sort, s.is_locked, s.actions from spec s
on conflict (area, key) do update set
  parent_id     = excluded.parent_id,
  default_label = excluded.default_label,
  path          = excluded.path,
  is_locked     = excluded.is_locked,
  is_active     = public.menus.is_active or excluded.is_locked,
  actions       = excluded.actions;

with spec (key, parent_key, default_label, path, sort, is_locked, actions) as (
  values
    ('bulletin',      'content',      '주보',         '/admin/bulletin',      10, false,
       '{READ,CREATE,UPDATE,DELETE,PURGE,HISTORY}'::public.permission_action[]),
    ('announcements', 'content',      '주일광고',     '/admin/announcements', 20, false,
       '{READ,CREATE,UPDATE,DELETE,PURGE,HISTORY}'),
    ('garden',        'content',      '성복의 뜰',    '/admin/garden',        30, false,
       '{READ,CREATE,UPDATE,DELETE,PURGE,HISTORY}'),
    ('album',         'content',      '교회앨범',     '/admin/album',         40, false,
       '{READ,CREATE,UPDATE,DELETE,PURGE,HISTORY}'),
    ('resources',     'content',      '설교 시트지',  '/admin/resources',     50, false,
       '{READ,CREATE,UPDATE,DELETE,PURGE,HISTORY}'),
    ('categories',    'content',      '분류 관리',    '/admin/categories',    60, false,
       '{READ,CREATE,UPDATE,HISTORY}'),
    ('home-hero',     'site-screens', '홈 히어로',    '/admin/home-hero',     10, false,
       '{READ,UPDATE,HISTORY}'),
    ('departments',   'site-screens', '다음세대 부서', '/admin/departments',  20, false,
       '{READ,UPDATE,HISTORY}'),
    ('newcomers',     'intake',       '새가족',       '/admin/newcomers',     10, false,
       '{READ,UPDATE,EXPORT,PURGE,HISTORY}'),
    ('users',         'system',       '사용자',       '/admin/users',         10, true,
       '{READ,CREATE,UPDATE,HISTORY}'),
    ('groups',        'system',       '그룹 · 권한',  '/admin/groups',        20, true,
       '{READ,CREATE,UPDATE,DELETE,HISTORY}'),
    ('menus',         'system',       '메뉴 관리',    '/admin/menus',         30, true,
       '{READ,UPDATE,HISTORY}'),
    ('codes',         'system',       '코드 관리',    '/admin/codes',         40, false,
       '{READ,CREATE,UPDATE,HISTORY}')
)
insert into public.menus (area, key, parent_id, default_label, path, sort, is_locked, actions)
select 'ADMIN', s.key, p.id, s.default_label, s.path, s.sort, s.is_locked, s.actions
  from spec s
  join public.menus p on p.area = 'ADMIN' and p.key = s.parent_key
on conflict (area, key) do update set
  parent_id     = excluded.parent_id,
  default_label = excluded.default_label,
  path          = excluded.path,
  is_locked     = excluded.is_locked,
  is_active     = public.menus.is_active or excluded.is_locked,
  actions       = excluded.actions;

-- 전체 «변경 이력» 화면은 없앴다(2026-11-26, 사용자 결정 — 이력은 각 화면의 «변경 이력» 창에서 그 글만). 메뉴와 그 권한을 지운다.
delete from public.menus where area = 'ADMIN' and key = 'audit';

-- ----------------------------------------------------------------------------
-- 홈페이지 메뉴(설계 6.5) — 어떤 페이지가 있는지는 코드(src/shared/config/siteNav.ts)가 정본이고, 여기 줄은 화면에서 덮어쓸
-- 이름 · 순서 · 사용 여부의 자리다. siteNav 와 같아야 한다(siteMenuSeed.test.ts 가 잠근다). 잠김 = 홈이 고정 링크로 가리키는 곳
-- (찾아오시는 길 · 교회소식 › 주일광고 · 예배 › 주일예배 · 다음세대 8부서와 그 상위).
-- ----------------------------------------------------------------------------

with spec (key, default_label, path, sort, is_locked) as (
  values
    ('about', '교회소개', '/about', 10, false),
    ('worship', '예배', '/worship', 20, true),
    ('next-generation', '다음세대', '/next-generation', 30, true),
    ('news', '교회소식', '/news', 40, true),
    ('resources', '자료실', '/resources', 50, false),
    ('location', '찾아오시는 길', '/location', 60, true)
)
insert into public.menus (area, key, parent_id, default_label, path, sort, is_locked)
select 'SITE', s.key, null, s.default_label, s.path, s.sort, s.is_locked from spec s
on conflict (area, key) do update set
  default_label = excluded.default_label,
  path          = excluded.path,
  is_locked     = excluded.is_locked,
  is_active     = public.menus.is_active or excluded.is_locked;

with spec (key, parent_key, default_label, path, sort, is_locked) as (
  values
    ('about-pastor-emeritus', 'about', '원로목사', '/about/pastor-emeritus', 10, false),
    ('about-pastor', 'about', '담임목사', '/about/pastor', 20, false),
    ('about-staff', 'about', '섬기는 이들', '/about/staff', 30, false),
    ('about-training', 'about', '양육·훈련', '/about/training', 40, false),
    ('about-history', 'about', '연혁', '/about/history', 50, false),
    ('worship-sunday', 'worship', '주일예배', '/worship/sunday', 10, true),
    ('worship-friday', 'worship', '금요 생수의 강·월삭예배', '/worship/friday', 20, false),
    ('worship-special', 'worship', '특별집회·행사', '/worship/special', 30, false),
    ('worship-weekday', 'worship', '수요·새벽·주일5부', '/worship/weekday', 40, false),
    ('next-generation-infant', 'next-generation', '영아부', '/next-generation/infant', 10, true),
    ('next-generation-kindergarten', 'next-generation', '유치부', '/next-generation/kindergarten', 20, true),
    ('next-generation-lower-elementary', 'next-generation', '유년부', '/next-generation/lower-elementary', 30, true),
    ('next-generation-elementary', 'next-generation', '초등부', '/next-generation/elementary', 40, true),
    ('next-generation-middle', 'next-generation', '중등부', '/next-generation/middle', 50, true),
    ('next-generation-high', 'next-generation', '고등부', '/next-generation/high', 60, true),
    ('next-generation-young-adult', 'next-generation', '청년부', '/next-generation/young-adult', 70, true),
    ('next-generation-english', 'next-generation', '영어예배부', '/next-generation/english', 80, true),
    ('news-announcements', 'news', '주일광고', '/news/announcements', 10, true),
    ('news-bulletin', 'news', '주보', '/news/bulletin', 20, false),
    ('news-garden', 'news', '성복의 뜰', '/news/garden', 30, false),
    ('news-album', 'news', '교회앨범', '/news/album', 40, false),
    ('resources-sunday-sermon', 'resources', '주일 설교 시트지', '/resources/sunday-sermon', 10, false),
    ('resources-series-sermon', 'resources', '시리즈 설교 시트지', '/resources/series-sermon', 20, false),
    ('resources-seasonal-sermon', 'resources', '가정·명절·절기 설교 시트지', '/resources/seasonal-sermon', 30, false)
)
insert into public.menus (area, key, parent_id, default_label, path, sort, is_locked)
select 'SITE', s.key, p.id, s.default_label, s.path, s.sort, s.is_locked
  from spec s
  join public.menus p on p.area = 'SITE' and p.key = s.parent_key
on conflict (area, key) do update set
  parent_id     = excluded.parent_id,
  default_label = excluded.default_label,
  path          = excluded.path,
  is_locked     = excluded.is_locked,
  is_active     = public.menus.is_active or excluded.is_locked;

-- ----------------------------------------------------------------------------
-- 처음 그룹(설계 11절 3번) — 새로 만들 때만 처음 권한을 준다.
-- «전체 관리» 는 판정 함수가 모든 권한을 가진 것으로 보므로 권한 칸을 두지 않는다.
-- ----------------------------------------------------------------------------

insert into public.groups (key, name, description, is_system)
values ('admin', '전체 관리', '모든 메뉴의 모든 기능. 끄거나 지울 수 없다.', true)
on conflict (key) do nothing;

with created as (
  insert into public.groups (key, name, description)
  values ('content', '콘텐츠 담당', '주보 · 주일광고 · 성복의 뜰 · 교회앨범 · 설교 시트지, 분류 관리')
  on conflict (key) do nothing
  returning id
)
insert into public.group_permissions (group_id, menu_id, action)
select c.id, m.id, a.action
  from created c
  cross join public.menus m
  cross join lateral unnest(m.actions) as a (action)
 where m.area = 'ADMIN'
   and (
     m.key in ('bulletin', 'announcements', 'garden', 'album', 'resources')
     or (m.key = 'categories' and a.action in ('READ', 'CREATE', 'UPDATE'))
   );

with created as (
  insert into public.groups (key, name, description)
  values ('newcomer', '새가족 담당', '새가족 접수 처리 · 엑셀 다운로드')
  on conflict (key) do nothing
  returning id
)
insert into public.group_permissions (group_id, menu_id, action)
select c.id, m.id, a.action
  from created c
  cross join public.menus m
  cross join lateral unnest(m.actions) as a (action)
 where m.area = 'ADMIN' and m.key = 'newcomers';

-- ----------------------------------------------------------------------------
-- Storage 버킷 — 공개 읽기 하나. 영상 파일은 받지 않는다(설계 6.12). 한 파일 50MB(무료 요금제 한도).
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 52428800,
  array['image/webp', 'image/jpeg', 'image/png', 'application/pdf', 'application/x-hwp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 첫 관리자 — 트리거(private.on_auth_user_changed)보다 먼저 있던 로그인 계정에 사용자 정보를 만들고,
-- «전체 관리» 에 구성원이 아무도 없을 때만 첫 관리자를 정한다.
--   · 후보 = 이메일 인증을 마쳤고, 지워지지 않았고, 차단되지 않은 일반 계정.
--   · 후보가 0명이면 아무것도 하지 않는다(새 프로젝트 — 계정을 옮겨 온 뒤 그룹 소속도 함께 옮긴다).
--   · 1명이면 그 계정을 넣는다(운영: 프로젝트 담당자 한 명).
--   · 2명 이상이면 누구를 넣을지 모르므로 적용을 멈춘다 — 손으로 정한 뒤 다시 적용한다.
-- 한 번 구성원이 생기면 다시는 아무것도 하지 않는다.
-- ----------------------------------------------------------------------------

insert into public.profiles (id, email, name, must_change_password)
select u.id, coalesce(u.email, ''), left(split_part(coalesce(u.email, 'user'), '@', 1), 50), false
  from auth.users u
 where not u.is_anonymous
on conflict (id) do nothing;

do $$
declare
  admin_group uuid := (select id from public.groups where key = 'admin');
  candidates uuid[];
begin
  if exists (select 1 from public.user_groups where group_id = admin_group) then
    return;
  end if;
  select coalesce(array_agg(u.id), '{}') into candidates
    from auth.users u
    join public.profiles p on p.id = u.id and p.is_active
   where not u.is_anonymous
     and u.email_confirmed_at is not null
     and u.deleted_at is null
     and (u.banned_until is null or u.banned_until < now());
  if cardinality(candidates) = 1 then
    insert into public.user_groups (user_id, group_id) values (candidates[1], admin_group);
  elsif cardinality(candidates) > 1 then
    raise exception '첫 관리자 후보가 %명입니다 — 누구를 «전체 관리» 에 넣을지 정한 뒤 다시 적용하세요', cardinality(candidates);
  end if;
end
$$;
