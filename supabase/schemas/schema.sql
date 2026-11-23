-- ============================================================================
-- 성복교회 웹 DB 구조 — 정본(SSOT)
-- ============================================================================
-- 이 파일이 DB 의 «지금 모습» 전체다. 표 · 인덱스 · 권한 규칙(RLS) · 함수 · 트리거를 여기서만 고친다.
-- supabase/migrations/ 의 변경 파일은 손으로 쓰지 않는다 — `pnpm db:sync` 가 이 파일과 지금까지의
-- 변경 이력을 비교해 만든다. 초기 행(메뉴 · 그룹 · 코드 묶음 · Storage 버킷)은 데이터라 이 파일에 쓸 수 없고
-- (스키마 비교는 insert 를 다루지 않는다) supabase/reference.sql 에 있다.
--
-- 설계: .md/specs/2026-11-17-admin-design.md · 결정: .md/decisions/0019-db-schema-ssot-uuid-v7.md
--
-- 규칙
--   · id 는 uuid v7(private.uuid_v7()) — 만든 순서대로 커져 인덱스 끝에만 붙는다. 예외: 변경 이력(숫자),
--     연결 표(두 칸을 합친 키), 코드 묶음(key — reference.sql 에서만 생긴다).
--   · 공개 주소에 쓰는 값(주보 날짜 · 영상 id · slug)은 id 와 따로 둔다 — 주소를 고쳐도 다른 표가 깨지지 않는다.
--   · 달력 날짜(주보 · 설교 · 방문 예정일)는 date, 순간(등록 · 수정 시각)은 timestamptz.
--   · *_by 칸(누가)은 외래 키를 걸지 않은 uuid 다. 사용자는 지우지 않고(비활성) profiles → auth.users 가
--     on delete restrict 라 계정 자체를 지울 수 없다. 칸마다 외래 키를 걸면 인덱스가 표마다 세 개씩 는다.
--   · created_* · updated_* · deleted_by 는 화면이 보내도 무시하고 트리거(private.stamp)가 채운다.
--   · 공개용 키(anon)와 로그인 사용자(authenticated)에게는 기본 권한을 모두 거두고 필요한 것만 준다
--     (Supabase 는 새 표에 모든 권한을 붙인다 — 파일 맨 끝 «권한» 절).
--   · 권한 판정은 private.has_permission 하나. RLS 에서는 (select …) 로 감싸 쿼리당 한 번만 부른다.
--   · 함수는 모두 search_path = '' — 이름을 전부 스키마까지 적는다.
--   · 동시 수정: 저장할 때 화면이 열었던 updated_at 을 함께 보내 `where id = $1 and updated_at = $2` 로 고친다.
--     0줄이면 «다른 사람이 먼저 고쳤습니다». updated_at 은 트리거가 매번 바꾼다.

-- ----------------------------------------------------------------------------
-- 스키마 · 확장
-- ----------------------------------------------------------------------------

-- private: API(PostgREST)로 열리지 않는 스키마 — 판정 함수 · 트리거 함수 · 내부 뷰를 둔다.
create schema if not exists private;

-- ----------------------------------------------------------------------------
-- enum — 프로그램이 분기하는 값. 값은 모두 영문 대문자(공통코드와 같은 규칙).
-- 화면에 이름을 보여야 하는 enum(콘텐츠 상태 · 새가족 구분 · 새가족 상태)은 같은 값의 잠긴 공통코드 묶음이 있다 —
-- 이름 · 순서는 코드 관리 화면에서 바꾸고, 값은 enum 이 정한다(supabase/tests 가 둘이 같은지 잠근다).
-- 사람이 정하는 분류는 분류(categories) · 공통코드(codes)다.
-- 값은 추가만 쉽다(빼거나 이름을 바꾸려면 타입을 새로 만들어야 한다). 화면의 TS 타입과의 일치는
-- src/shared/api/supabase/enumParity.test.ts 가 잠근다.
-- ----------------------------------------------------------------------------

create type public.content_status    as enum ('DRAFT', 'PUBLISHED');
create type public.resource_section  as enum ('SUNDAY', 'SERIES', 'SEASONAL');
create type public.news_feed         as enum ('ANNOUNCEMENTS', 'GARDEN');
create type public.date_source       as enum ('EVENT', 'UPLOAD');
create type public.file_kind         as enum ('IMAGE', 'PDF', 'HWP');
create type public.menu_area         as enum ('ADMIN', 'SITE');
create type public.permission_action as enum ('READ', 'CREATE', 'UPDATE', 'DELETE', 'PURGE', 'EXPORT', 'HISTORY');
create type public.newcomer_intent   as enum ('REGISTER', 'INQUIRY');
create type public.newcomer_status   as enum ('NEW', 'CONTACTED', 'DONE');
create type public.audit_action      as enum ('INSERT', 'UPDATE', 'DELETE', 'EXPORT');
create type public.hero_media_kind   as enum ('PHOTO', 'YOUTUBE');
create type public.department_slug   as enum ('INFANT', 'KINDERGARTEN', 'LOWER_ELEMENTARY', 'ELEMENTARY',
                                              'MIDDLE', 'HIGH', 'YOUNG_ADULT', 'ENGLISH');

-- ----------------------------------------------------------------------------
-- id 생성 — uuid v7(RFC 9562). Postgres 18 의 내장 uuidv7() 이 Supabase 에 열리면 본문만
-- `select uuidv7()` 로 바꾼다(이미 만든 값은 그대로 쓸 수 있다).
-- 앞 48비트 = 1970 년부터의 밀리초, 버전 칸 = 7, 나머지는 gen_random_uuid() 의 무작위 값.
-- ----------------------------------------------------------------------------

create function private.uuid_v7() returns uuid
language sql volatile parallel safe
set search_path = ''
as $$
  select encode(
    set_bit(
      set_bit(
        overlay(
          uuid_send(gen_random_uuid())
          placing substring(int8send((extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
          from 1 for 6
        ),
        52, 1
      ),
      53, 1
    ),
    'hex'
  )::uuid
$$;

-- ----------------------------------------------------------------------------
-- 사용자 · 그룹 · 메뉴 · 권한
-- ----------------------------------------------------------------------------

-- 로그인 계정 한 명. id = auth.users.id. 계정이 생기면 트리거(private.on_auth_user_changed)가 만든다.
-- email 은 auth.users 의 사본이다 — 트리거가 맞추고 화면에서는 바꿀 수 없다(목록 화면이 auth 스키마를 읽지 않게).
create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete restrict,
  email                text not null,
  name                 text not null check (char_length(name) between 1 and 50),
  -- 지정하면 «다음세대 부서» 에서 그 부서만 다룬다. 비어 있으면 모든 부서.
  department           public.department_slug,
  is_active            boolean not null default true,
  must_change_password boolean not null default true,
  created_at           timestamptz not null default now(),
  created_by           uuid,
  updated_at           timestamptz not null default now(),
  updated_by           uuid
);

-- 사용자 그룹. key 는 reference.sql 이 만든 그룹만 갖는다(코드가 이름 대신 key 로 가리킨다).
-- is_system(«전체 관리»)은 모든 권한을 가진 것으로 판정하고, 끄거나 지울 수 없다.
create table public.groups (
  id          uuid primary key default private.uuid_v7(),
  key         text unique check (key ~ '^[a-z][a-z0-9-]*$'),
  name        text not null unique check (char_length(name) between 1 and 50),
  description text check (char_length(description) <= 200),
  is_system   boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  check (not is_system or (is_active and key is not null))
);

create table public.user_groups (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  group_id   uuid not null references public.groups (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid,
  primary key (user_id, group_id)
);
create index user_groups_group_id_idx on public.user_groups (group_id);

-- 메뉴. 행은 reference.sql 로만 들어간다(메뉴 하나 = 화면 코드 하나). 화면에서는 label · is_active · sort 만 바꾼다
-- (private.guard_menus). label 이 비면 default_label 을 쓴다(«기본 이름으로» = label 을 비운다).
-- actions 는 그 화면에 있는 기능 — 권한 화면(그룹 × 기능 표)이 이 목록을 읽어 그린다.
create table public.menus (
  id            uuid primary key default private.uuid_v7(),
  area          public.menu_area not null,
  key           text not null check (key ~ '^[a-z][a-z0-9-]*$'),
  parent_id     uuid,
  default_label text not null check (char_length(default_label) between 1 and 50),
  label         text check (char_length(label) between 1 and 50),
  -- 묶음 머리(콘텐츠 · 시스템 등)는 주소가 없다.
  path          text check (path ~ '^/'),
  sort          integer not null default 0,
  is_active     boolean not null default true,
  -- 끌 수 없는 메뉴(사용자 · 그룹 · 메뉴 관리, 홈이 고정 링크로 가리키는 페이지).
  is_locked     boolean not null default false,
  actions       public.permission_action[] not null default '{}',
  created_at    timestamptz not null default now(),
  created_by    uuid,
  updated_at    timestamptz not null default now(),
  updated_by    uuid,
  unique (area, key),
  unique (id, area),
  -- 상위 메뉴는 같은 영역 안에서만(관리자 메뉴 밑에 홈페이지 메뉴가 붙지 않게).
  foreign key (parent_id, area) references public.menus (id, area),
  check (not (is_locked and not is_active)),
  check (path is not null or cardinality(actions) = 0),
  check (area = 'ADMIN' or cardinality(actions) = 0)
);
create index menus_parent_idx on public.menus (parent_id, area, sort);

-- 그룹의 권한 한 칸 = «메뉴 + 기능». action 은 그 메뉴의 actions 안의 값이어야 한다(private.guard_group_permissions).
create table public.group_permissions (
  group_id   uuid not null references public.groups (id) on delete cascade,
  menu_id    uuid not null references public.menus (id) on delete cascade,
  action     public.permission_action not null,
  created_at timestamptz not null default now(),
  created_by uuid,
  primary key (group_id, menu_id, action)
);
create index group_permissions_menu_id_idx on public.group_permissions (menu_id);

-- ----------------------------------------------------------------------------
-- 분류(카테고리 · 칩) — 콘텐츠를 사람이 나누는 이름(주일광고 분류 · 앨범 분류 · 설교 시트지 묶음).
-- 묶음(category_groups)은 reference.sql 로만 생기고, 분류는 «콘텐츠 › 분류 관리» 화면에서 더한다.
-- 글의 분류 칸은 (묶음 key, 분류 id) 두 칸으로 가리킨다 — 앨범에 주일광고 분류가 들어가지 않게.
-- slug 는 공개 주소의 거르기 값(?category=event)이라 영문 소문자다. 한 번 정하면 바꾸지 않는다(guard_categories).
-- ----------------------------------------------------------------------------

create table public.category_groups (
  key  text primary key check (key ~ '^[A-Z][A-Z0-9_]*$'),
  name text not null check (char_length(name) between 1 and 50),
  sort integer not null default 0
);

create table public.categories (
  id         uuid primary key default private.uuid_v7(),
  group_key  text not null references public.category_groups (key),
  slug       text not null check (slug ~ '^[a-z0-9][a-z0-9-]*$' and char_length(slug) <= 50),
  label      text not null check (char_length(label) between 1 and 50),
  sort       integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (group_key, slug),
  unique (group_key, id),
  unique (group_key, label)
);
create index categories_group_sort_idx on public.categories (group_key, sort);

-- ----------------------------------------------------------------------------
-- 공통코드 — 프로그램을 고치지 않고 관리자가 바꾸는 값(직분 등)과, enum 값의 화면 이름(콘텐츠 상태 · 새가족 상태 등).
-- 묶음 key · 코드 값은 영문 대문자(NEWCOMER_STATUS › NEW). 묶음은 reference.sql 로만 생긴다.
-- 잠긴 묶음(is_locked — enum 과 같은 값)은 코드를 더하거나 끄거나 값을 바꿀 수 없고, 이름 · 순서만 바꾼다(guard_codes).
-- ----------------------------------------------------------------------------

create table public.code_groups (
  key         text primary key check (key ~ '^[A-Z][A-Z0-9_]*$'),
  name        text not null check (char_length(name) between 1 and 50),
  description text check (char_length(description) <= 200),
  is_locked   boolean not null default false,
  sort        integer not null default 0
);

create table public.codes (
  id          uuid primary key default private.uuid_v7(),
  group_key   text not null references public.code_groups (key),
  code        text not null check (code ~ '^[A-Z][A-Z0-9_]*$' and char_length(code) <= 50),
  label       text not null check (char_length(label) between 1 and 50),
  sort        integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  unique (group_key, code),
  unique (group_key, id),
  unique (group_key, label)
);
create index codes_group_sort_idx on public.codes (group_key, sort);

-- ----------------------------------------------------------------------------
-- 파일(공통) — 모든 화면이 이 두 표만 쓴다. 글은 파일을 직접 가리키지 않고 항상 묶음을 가리킨다.
-- 한 묶음은 한 자리에만 붙는다(각 *_list_id 칸이 유일). 어느 자리에 붙었는지는 private.file_list_owners 뷰.
-- ----------------------------------------------------------------------------

create table public.file_lists (
  id         uuid primary key default private.uuid_v7(),
  -- 어느 화면의 묶음인가 — 쓰기 권한을 이 메뉴로 판정한다.
  menu_id    uuid not null references public.menus (id),
  created_at timestamptz not null default now(),
  created_by uuid
);
create index file_lists_menu_id_idx on public.file_lists (menu_id);
-- 어느 글에도 붙지 않은 지 24시간 넘은 묶음 찾기(예약 작업).
create index file_lists_created_at_idx on public.file_lists (created_at);

-- 묶음 안의 파일 한 개. Storage 경로는 `<메뉴 key>/<묶음 id>/<파일 id>.<확장자>` — 한글 원래 이름은
-- original_name 에만 둔다(Storage 는 한글 키를 받지 않는 경우가 있다). 같은 Storage 파일을 여러 행이 가리킬 수 있다.
create table public.files (
  id            uuid primary key default private.uuid_v7(),
  list_id       uuid not null references public.file_lists (id) on delete cascade,
  sort          integer not null,
  bucket        text not null,
  path          text not null check (path !~ '(^/|\.\.)'),
  kind          public.file_kind not null,
  width         integer check (width > 0),
  height        integer check (height > 0),
  bytes         bigint not null check (bytes >= 0),
  original_name text not null check (char_length(original_name) between 1 and 255),
  alt           text check (char_length(alt) <= 300),
  -- 폭별로 미리 만든 파일 [[가로 px, 경로], …] — 홈 히어로 · 부서 사진만 채운다(ADR 0013).
  variants      jsonb check (variants is null or jsonb_typeof(variants) = 'array'),
  created_at    timestamptz not null default now(),
  created_by    uuid,
  updated_at    timestamptz not null default now(),
  updated_by    uuid,
  -- 순서 바꾸기는 한 번에 여러 줄을 고치므로 묶음 끝에서 검사한다.
  constraint files_list_sort_key unique (list_id, sort) deferrable initially deferred,
  check ((width is null) = (height is null)),
  check (kind <> 'IMAGE' or width is not null)
);
-- Storage 의 실제 파일을 지워도 되는지(가리키는 행이 남았는지) 찾기.
create index files_bucket_path_idx on public.files (bucket, path);

-- ----------------------------------------------------------------------------
-- 콘텐츠 — 휴지통(deleted_at)이 있는 표. 공개 화면은 «공개 + 삭제 안 됨» 만 읽는다.
-- 휴지통 보내기 · 복구는 «삭제» 권한, 그 밖의 수정은 «수정» 권한(private.guard_content).
-- ----------------------------------------------------------------------------

-- 주보. 공개 주소 = 주일 날짜(/news/bulletin/2026-11-15).
create table public.bulletins (
  id            uuid primary key default private.uuid_v7(),
  date          date not null,
  pages_list_id uuid not null unique references public.file_lists (id),
  status        public.content_status not null default 'DRAFT',
  created_at    timestamptz not null default now(),
  created_by    uuid,
  updated_at    timestamptz not null default now(),
  updated_by    uuid,
  deleted_at    timestamptz,
  deleted_by    uuid
);
-- 같은 주일의 주보는 하나(휴지통에 든 것은 빼고). 목록(날짜 내림차순)도 이 인덱스를 거꾸로 읽는다.
create unique index bulletins_date_key on public.bulletins (date) where deleted_at is null;
create index bulletins_deleted_at_idx on public.bulletins (deleted_at) where deleted_at is not null;

-- 주일광고 · 성복의 뜰(영상 하나 = 글 하나). 공개 주소 = 유튜브 영상 id.
create table public.news_videos (
  id             uuid primary key default private.uuid_v7(),
  feed           public.news_feed not null,
  title          text not null check (char_length(title) between 1 and 200),
  category_group text not null generated always as (
                   case feed when 'ANNOUNCEMENTS' then 'ANNOUNCEMENTS_CATEGORY' else 'GARDEN_CATEGORY' end
                 ) stored,
  category_id    uuid not null,
  date           date not null,
  date_from      public.date_source not null default 'EVENT',
  -- 비어 있으면 공개 목록에 싣지 않는다(기존 사이트에서 옮긴 글 중 영상이 없는 것).
  video_id       text check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  thumbnail      text,
  poster         text,
  description    text check (char_length(description) <= 5000),
  status         public.content_status not null default 'DRAFT',
  -- 기존 사이트 글번호(«게시판-글번호», 0401-147) — 오픈 전 다시 가져오기가 같은 글인지 이것으로 본다.
  legacy_id      text check (legacy_id ~ '^[0-9]{4}-[0-9]+$'),
  created_at     timestamptz not null default now(),
  created_by     uuid,
  updated_at     timestamptz not null default now(),
  updated_by     uuid,
  deleted_at     timestamptz,
  deleted_by     uuid,
  foreign key (category_group, category_id) references public.categories (group_key, id)
);
create unique index news_videos_video_key on public.news_videos (feed, video_id)
  where deleted_at is null and video_id is not null;
create unique index news_videos_legacy_key on public.news_videos (legacy_id) where legacy_id is not null;
create index news_videos_feed_date_idx on public.news_videos (feed, date desc);
create index news_videos_category_idx on public.news_videos (category_group, category_id);
create index news_videos_deleted_at_idx on public.news_videos (deleted_at) where deleted_at is not null;

-- 교회앨범. 공개 주소 = slug. 기존 글은 기존 번호(«2»)를 그대로, 새 글은 albums_slug_seq(1000 부터 —
-- 기존 사진첩 게시판 번호는 한 자리 수라 오픈 전 다시 가져와도 겹치지 않는다).
create sequence public.albums_slug_seq start with 1000;
create table public.albums (
  id               uuid primary key default private.uuid_v7(),
  slug             text not null default nextval('public.albums_slug_seq')::text check (slug ~ '^[0-9]+$'),
  title            text not null check (char_length(title) between 1 and 200),
  category_group   text not null default 'ALBUM_CATEGORY' check (category_group = 'ALBUM_CATEGORY'),
  category_id      uuid not null,
  images_list_id   uuid not null unique references public.file_lists (id),
  status           public.content_status not null default 'DRAFT',
  created_at       timestamptz not null default now(),
  created_by       uuid,
  updated_at       timestamptz not null default now(),
  updated_by       uuid,
  deleted_at       timestamptz,
  deleted_by       uuid,
  foreign key (category_group, category_id) references public.categories (group_key, id)
);
create unique index albums_slug_key on public.albums (slug) where deleted_at is null;
create index albums_created_at_idx on public.albums (created_at desc);
create index albums_category_idx on public.albums (category_group, category_id);
create index albums_deleted_at_idx on public.albums (deleted_at) where deleted_at is not null;

-- 설교 시트지. 공개 주소 = slug — 기존 글은 «게시판-글번호»(0404-40), 새 글은 resources_slug_seq 의 숫자.
-- 묶음(series)은 분류마다 다른 분류 묶음이다: 주일 강해 이름 · 시리즈 이름 · 가정/명절/절기.
create sequence public.resources_slug_seq start with 1;
create table public.resources (
  id             uuid primary key default private.uuid_v7(),
  slug           text not null default nextval('public.resources_slug_seq')::text
                   check (slug ~ '^([0-9]{4}-)?[0-9]+$'),
  section        public.resource_section not null,
  series_group   text not null generated always as (
                   case section when 'SUNDAY' then 'RESOURCE_SUNDAY'
                                when 'SERIES' then 'RESOURCE_SERIES'
                                else 'RESOURCE_SEASONAL' end
                 ) stored,
  series_id      uuid not null,
  episode        integer check (episode > 0),
  title          text not null check (char_length(title) between 1 and 200),
  -- 사용 날짜 — 문서 · 제목에서 확인된 것만. 모르면 비우고 year 만 둔다.
  date           date,
  year           smallint check (year between 1950 and 2100),
  passage        text check (char_length(passage) <= 100),
  -- 원본 파일(PDF · 한글). 이미지로만 제공되는 자료에는 없다.
  file_list_id   uuid unique references public.file_lists (id),
  -- 미리보기 쪽(미리보기 없는 한글 파일은 빈 묶음).
  pages_list_id  uuid not null unique references public.file_lists (id),
  status         public.content_status not null default 'DRAFT',
  created_at     timestamptz not null default now(),
  created_by     uuid,
  updated_at     timestamptz not null default now(),
  updated_by     uuid,
  deleted_at     timestamptz,
  deleted_by     uuid,
  foreign key (series_group, series_id) references public.categories (group_key, id),
  check (date is null or year is null or year = extract(year from date))
);
create unique index resources_slug_key on public.resources (slug) where deleted_at is null;
create index resources_section_date_idx on public.resources (section, date desc nulls last);
create index resources_series_idx on public.resources (series_group, series_id, episode);
create index resources_deleted_at_idx on public.resources (deleted_at) where deleted_at is not null;

-- 시트지 ↔ 설교 영상(유튜브 영상 id) — 다대다. 부모(시트지)와 함께 움직인다.
create table public.resource_videos (
  resource_id uuid not null references public.resources (id) on delete cascade,
  video_id    text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  created_at  timestamptz not null default now(),
  created_by  uuid,
  primary key (resource_id, video_id)
);
-- 설교 영상 페이지가 «이 영상의 시트지» 를 찾는다.
create index resource_videos_video_id_idx on public.resource_videos (video_id);

-- ----------------------------------------------------------------------------
-- 사이트 화면
-- ----------------------------------------------------------------------------

-- 홈 히어로 — 한 줄뿐(singleton). 대표 사진은 어느 종류에서나 필수.
create table public.home_hero (
  id               uuid primary key default private.uuid_v7(),
  singleton        boolean not null default true unique check (singleton),
  kind             public.hero_media_kind not null default 'PHOTO',
  photo_list_id    uuid not null unique references public.file_lists (id),
  youtube_video_id text check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  created_at       timestamptz not null default now(),
  created_by       uuid,
  updated_at       timestamptz not null default now(),
  updated_by       uuid,
  check ((kind = 'YOUTUBE') = (youtube_video_id is not null))
);

-- 다음세대 부서 — 8줄 고정(가져오기 스크립트가 만든다. 화면에서 추가 · 삭제하지 않는다).
-- 부서 이름과 예배 요일 · 시간 · 장소는 코드에 남는다(설계 6.13).
create table public.departments (
  id             uuid primary key default private.uuid_v7(),
  slug           public.department_slug not null unique,
  ages           text not null check (char_length(ages) <= 50),
  tagline        text not null check (char_length(tagline) <= 100),
  intro          text not null check (char_length(intro) <= 3000),
  extra          text check (char_length(extra) <= 300),
  -- 첫 장이 도입부 사진, 나머지가 쇼케이스. 최소 한 장은 화면 규칙(설계 6.13).
  photos_list_id uuid not null unique references public.file_lists (id),
  created_at     timestamptz not null default now(),
  created_by     uuid,
  updated_at     timestamptz not null default now(),
  updated_by     uuid
);

create table public.department_staff (
  id             uuid primary key default private.uuid_v7(),
  department_id  uuid not null references public.departments (id) on delete cascade,
  sort           integer not null,
  name           text not null check (char_length(name) between 1 and 50),
  -- 직분(목사 · 전도사 · 간사 …) — 공통코드 STAFF_ROLE 에서 고른다.
  role_group     text not null default 'STAFF_ROLE' check (role_group = 'STAFF_ROLE'),
  role_id        uuid not null,
  greeting       text check (char_length(greeting) <= 1000),
  photo_list_id  uuid unique references public.file_lists (id),
  created_at     timestamptz not null default now(),
  created_by     uuid,
  updated_at     timestamptz not null default now(),
  updated_by     uuid,
  constraint department_staff_sort_key unique (department_id, sort) deferrable initially deferred,
  foreign key (role_group, role_id) references public.codes (group_key, id)
);
create index department_staff_role_idx on public.department_staff (role_group, role_id);

-- ----------------------------------------------------------------------------
-- 새가족 · 스팸 제한 · 변경 이력
-- ----------------------------------------------------------------------------

-- 새가족 등록 · 문의. 방문자에게는 어떤 권한도 없다 — 접수는 Server Action 이 검증한 뒤 서버 전용 키로 넣는다.
-- 접수한 날부터 1년이 지나면 처리 상태와 상관없이 완전히 지운다(public.purge_expired).
create table public.newcomers (
  id              uuid primary key default private.uuid_v7(),
  intent          public.newcomer_intent not null,
  name            text not null check (char_length(name) between 1 and 50),
  phone           text not null check (phone ~ '^[0-9+][0-9 -]{7,19}$'),
  visit_date      date,
  message         text check (char_length(message) <= 2000),
  -- 동의한 시각과 동의한 문구의 판(문구가 바뀌어도 그때 무엇에 동의했는지 남는다).
  consent_at      timestamptz not null,
  consent_version text not null check (char_length(consent_version) between 1 and 20),
  status          public.newcomer_status not null default 'NEW',
  handled_by      uuid,
  handled_at      timestamptz,
  note            text check (char_length(note) <= 2000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  updated_by      uuid
);
-- 접수함(상태별 최신순) · 첫 화면의 «처리 안 된 건수».
create index newcomers_status_created_idx on public.newcomers (status, created_at desc);
-- 보관 기간이 지난 접수 지우기.
create index newcomers_created_at_idx on public.newcomers (created_at);

-- 새가족 접수 횟수 제한 — 서버는 요청마다 따로 떠서 메모리로 셀 수 없다. 서버 전용 키로만 읽고 쓴다.
-- key_hash = 접속 IP 의 해시(IP 를 그대로 두지 않는다). 하루 지난 줄은 public.purge_expired 가 지운다.
create table public.submission_attempts (
  id       bigint generated always as identity primary key,
  key_hash text not null check (char_length(key_hash) between 16 and 128),
  at       timestamptz not null default now()
);
create index submission_attempts_key_at_idx on public.submission_attempts (key_hash, at desc);
create index submission_attempts_at_idx on public.submission_attempts (at);

-- 변경 이력 — 추가만 한다(수정 · 삭제 권한을 아무에게도 주지 않는다).
-- changes: 등록 = 새 값, 삭제 = 지워진 값, 수정 = 바뀐 칸만 {칸: [이전, 이후]}.
-- 개인정보 칸은 값 대신 null(어느 칸이 바뀌었는지만). 딸린 행은 parent_* 로 부모 글에 묶는다.
create table public.audit_log (
  id           bigint generated always as identity primary key,
  table_name   text not null,
  -- 연결 표(두 칸 키)는 id 가 없어 null — parent_* 로 찾는다.
  row_id       uuid,
  parent_table text,
  parent_id    uuid,
  action       public.audit_action not null,
  -- 누가 — 사람이 없는 변경(예약 작업 · 가져오기 · 변경 파일)은 null = «시스템».
  -- 엑셀 다운로드 기록은 화면이 이 칸 · at · row_id · parent_* 를 보낼 수 없다(칸 단위 GRANT) — 기본값이 채운다.
  actor_id     uuid default auth.uid(),
  at           timestamptz not null default now(),
  changes      jsonb not null default '{}',
  check ((parent_table is null) = (parent_id is null)),
  -- 엑셀 다운로드는 여러 건이라 행을 가리키지 않는다(건수는 changes.count).
  check (action = 'EXPORT' or row_id is not null or parent_id is not null)
);
-- 글 한 건의 이력(수정 화면 옆 패널) · 딸린 행의 이력 · 사람별 · 기간별(«변경 이력» 메뉴).
create index audit_log_row_idx on public.audit_log (table_name, row_id, id desc) where row_id is not null;
create index audit_log_parent_idx on public.audit_log (parent_table, parent_id, id desc) where parent_id is not null;
create index audit_log_actor_idx on public.audit_log (actor_id, id desc) where actor_id is not null;
-- 추가만 하는 표라 시각 순서와 저장 순서가 같다 — BRIN 이 아주 작게 기간 조회를 맡는다.
create index audit_log_at_brin on public.audit_log using brin (at);

-- ----------------------------------------------------------------------------
-- 파일 묶음의 주인 — 묶음이 어느 글의 어느 자리에 붙었는가.
-- ⚠ *_list_id 칸을 새로 만들면 여기에 한 줄을 더한다. 빠뜨리면 예약 작업이 그 자리의 파일을 «주인 없음» 으로
--   보고 지운다 — supabase/tests/database 의 검사가 «file_lists 를 가리키는 칸이 전부 여기 있는가» 를 잠근다.
-- ----------------------------------------------------------------------------

create view private.file_list_owners as
  -- own_draft_by: 임시저장 글이면 등록한 사람(«등록» 권한만 있는 사람이 자기 임시저장 글의 파일을 고칠 수 있게), 아니면 null.
  select pages_list_id as list_id, 'bulletins'::text as owner_table, id as owner_id,
         (status = 'PUBLISHED' and deleted_at is null) as is_public, null::public.department_slug as department,
         case when status = 'DRAFT' and deleted_at is null then created_by end as own_draft_by
    from public.bulletins
  union all
  select images_list_id, 'albums', id, (status = 'PUBLISHED' and deleted_at is null), null,
         case when status = 'DRAFT' and deleted_at is null then created_by end
    from public.albums
  union all
  select file_list_id, 'resources', id, (status = 'PUBLISHED' and deleted_at is null), null,
         case when status = 'DRAFT' and deleted_at is null then created_by end
    from public.resources where file_list_id is not null
  union all
  select pages_list_id, 'resources', id, (status = 'PUBLISHED' and deleted_at is null), null,
         case when status = 'DRAFT' and deleted_at is null then created_by end
    from public.resources
  union all
  select photo_list_id, 'home_hero', id, true, null, null::uuid
    from public.home_hero
  union all
  select photos_list_id, 'departments', id, true, slug, null::uuid
    from public.departments
  union all
  -- 별칭을 쓰지 않는다 — 검사가 «표.칸» 글자로 빠진 자리를 찾는다.
  select department_staff.photo_list_id, 'department_staff', department_staff.id, true, departments.slug, null::uuid
    from public.department_staff join public.departments on departments.id = department_staff.department_id
   where department_staff.photo_list_id is not null;

-- 어느 글에도 붙지 않은 지 24시간 넘은 묶음(예약 작업이 Storage 파일과 함께 지운다).
create view private.orphan_file_lists as
  select l.id, l.menu_id, l.created_at
    from public.file_lists l
   where l.created_at < now() - interval '24 hours'
     and not exists (select 1 from private.file_list_owners o where o.list_id = l.id);

-- ----------------------------------------------------------------------------
-- 권한 판정
-- security definer — 판정에 필요한 표(그룹 · 권한)를 사용자가 직접 읽을 수 없어도 판정할 수 있게.
-- stable — 같은 쿼리 안에서는 같은 답. RLS 에서는 (select …) 로 감싸 쿼리당 한 번만 부른다.
-- ----------------------------------------------------------------------------

-- 로그인한 사람이 활성 계정이고 «전체 관리» 그룹(활성)에 속하는가.
create function private.is_full_admin() returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles p
      join public.user_groups ug on ug.user_id = p.id
      join public.groups g on g.id = ug.group_id
     where p.id = (select auth.uid())
       and p.is_active
       and g.is_system
       and g.is_active
  )
$$;

-- 이 사람이 «메뉴 key + 기능» 을 갖는가. 사용자가 활성이고, 메뉴가 사용 중이고 그 기능이 있으며,
-- 속한 활성 그룹 중 하나가 그 권한을 갖거나 «전체 관리» 일 때 참. 여러 그룹이면 합친다.
-- 로그인한 사람의 판정은 has_permission, 다른 사람의 판정(새가족 알림 받을 사람)은 이 함수를 직접 쓴다.
create function private.user_has_permission(p_user uuid, p_menu text, p_action public.permission_action)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles p
      join public.menus m on m.area = 'ADMIN' and m.key = p_menu
     where p.id = p_user
       and p.is_active
       and m.is_active
       and p_action = any (m.actions)
       and exists (
         select 1
           from public.user_groups ug
           join public.groups g on g.id = ug.group_id and g.is_active
          where ug.user_id = p.id
            and (
              g.is_system
              or exists (
                select 1 from public.group_permissions gp
                 where gp.group_id = g.id and gp.menu_id = m.id and gp.action = p_action
              )
            )
       )
  )
$$;

-- 로그인한 사람의 권한 판정 — RLS 에서는 (select …) 로 감싸 쿼리당 한 번만 부른다.
create function private.has_permission(p_menu text, p_action public.permission_action) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.user_has_permission((select auth.uid()), p_menu, p_action)
$$;

-- 화면용: 로그인한 사람이 가진 권한 목록(메뉴 key, 기능) — 왼쪽 메뉴와 버튼을 그릴 때 한 번 읽는다.
-- 판정 함수는 API 로 열리지 않는 private 스키마라, 화면 · Server Action 은 이 함수로 받는다.
-- 막는 것은 여전히 RLS 다(이 목록은 그릴지 말지만 정한다).
create function public.my_permissions()
returns table (menu_key text, action public.permission_action)
language sql stable security definer
set search_path = ''
as $$
  select m.key, a.action
    from public.menus m
    cross join lateral unnest(m.actions) as a (action)
   where m.area = 'ADMIN'
     and private.user_has_permission((select auth.uid()), m.key, a.action)
$$;

-- 화면용: 로그인한 사람이 이 사용자의 비밀번호를 초기화하거나 계정을 관리할 수 있는가.
-- 비밀번호 초기화는 만능 키(Auth API)로 해서 DB 트리거가 막지 못하므로 서버가 먼저 이것으로 확인한다(설계 6.4 ①).
-- 사용자 수정 권한이 있고, 대상이 자기 자신이 아니고, «전체 관리» 가 아니면: 대상이 «전체 관리» 구성원이 아니고
-- 대상이 속한 그룹의 권한을 내가 모두 가졌을 때만 참 — 비밀번호를 초기화하면 그 계정(과 권한)을 받는 것과 같다
-- (권한 올리기 방지 ②, guard_user_groups 와 같은 조건).
create function public.can_manage_user(p_target uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.has_permission('users', 'UPDATE')
     and p_target is distinct from (select auth.uid())
     and (
       private.is_full_admin()
       or (
         not exists (
           select 1 from public.user_groups ug join public.groups g on g.id = ug.group_id
            where ug.user_id = p_target and g.is_system
         )
         and not exists (
           select 1
             from public.user_groups ug
             join public.group_permissions gp on gp.group_id = ug.group_id
             join public.menus m on m.id = gp.menu_id
            where ug.user_id = p_target
              and not private.has_permission(m.key, gp.action)
         )
       )
     )
$$;

-- 한 번에 저장하는 함수 — 여러 표를 한 트랜잭션으로 바꾼다(하나라도 막히면 전부 되돌린다).
-- 로그인한 사람의 권한으로 돈다(security invoker — 행 권한 · 지키는 규칙 · 감사 로그가 그대로). 화면을 연 뒤 다른 사람이
-- 바꿨으면(updated_at · 그룹 소속 · 권한 표가 그때와 다르면) 아무것도 바꾸지 않고 null — 화면은 «다른 사람이 먼저 고쳤습니다».

-- 사용자 고치기: 이름 · 부서 · 사용 여부 + 그룹 소속. p_seen_group_ids 는 화면을 열었을 때의 그룹 목록.
create function public.save_user(
  p_id uuid,
  p_updated_at timestamptz,
  p_name text,
  p_department public.department_slug,
  p_is_active boolean,
  p_group_ids uuid[],
  p_seen_group_ids uuid[]
) returns timestamptz
language plpgsql
set search_path = ''
as $$
declare
  saved timestamptz;
begin
  -- 같은 사람을 동시에 저장하면 차례로(앞 저장이 끝난 뒤 판을 다시 본다)
  perform 1 from public.profiles where id = p_id for update;
  if (select coalesce(array_agg(ug.group_id order by ug.group_id), '{}')
        from public.user_groups ug where ug.user_id = p_id)
     is distinct from
     (select coalesce(array_agg(distinct g order by g), '{}') from unnest(p_seen_group_ids) g) then
    return null;
  end if;
  update public.profiles
     set name = p_name, department = p_department, is_active = p_is_active
   where id = p_id and updated_at = p_updated_at
  returning updated_at into saved;
  if saved is null then
    return null;
  end if;
  delete from public.user_groups
   where user_id = p_id and group_id <> all (coalesce(p_group_ids, '{}'));
  insert into public.user_groups (user_id, group_id)
  select distinct p_id, g
    from unnest(coalesce(p_group_ids, '{}')) g
   where not exists (select 1 from public.user_groups ug where ug.user_id = p_id and ug.group_id = g);
  return saved;
end
$$;

-- 그룹 고치기: 이름 · 설명 · 사용 여부 + 권한 표('메뉴key:기능' 목록). p_permissions 가 null 이면 권한은 그대로
-- («전체 관리» 처럼 권한 표가 없는 그룹). p_seen_permissions 는 화면을 열었을 때의 권한 표.
create function public.save_group(
  p_id uuid,
  p_updated_at timestamptz,
  p_name text,
  p_description text,
  p_is_active boolean,
  p_permissions text[],
  p_seen_permissions text[]
) returns timestamptz
language plpgsql
set search_path = ''
as $$
declare
  saved timestamptz;
begin
  perform 1 from public.groups where id = p_id for update;
  if p_permissions is not null
     and (select coalesce(array_agg(m.key || ':' || gp.action order by m.key || ':' || gp.action), '{}')
            from public.group_permissions gp join public.menus m on m.id = gp.menu_id
           where gp.group_id = p_id)
         is distinct from
         (select coalesce(array_agg(distinct x order by x), '{}') from unnest(p_seen_permissions) x) then
    return null;
  end if;
  update public.groups
     set name = p_name, description = p_description, is_active = p_is_active
   where id = p_id and updated_at = p_updated_at
  returning updated_at into saved;
  if saved is null or p_permissions is null then
    return saved;
  end if;
  delete from public.group_permissions gp
   using public.menus m
   where gp.group_id = p_id and m.id = gp.menu_id
     and (m.key || ':' || gp.action) <> all (p_permissions);
  insert into public.group_permissions (group_id, menu_id, action)
  select distinct p_id, m.id, split_part(x, ':', 2)::public.permission_action
    from unnest(p_permissions) x
    join public.menus m on m.area = 'ADMIN' and m.key = split_part(x, ':', 1)
   where not exists (
     select 1 from public.group_permissions gp
      where gp.group_id = p_id and gp.menu_id = m.id and gp.action::text = split_part(x, ':', 2)
   );
  return saved;
end
$$;

-- 그룹 만들기: 그룹과 처음 권한 표를 함께. 권한이 막히면 그룹도 만들지 않는다.
create function public.create_group(p_name text, p_description text, p_permissions text[]) returns uuid
language plpgsql
set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.groups (name, description) values (p_name, p_description) returning id into new_id;
  insert into public.group_permissions (group_id, menu_id, action)
  select distinct new_id, m.id, split_part(x, ':', 2)::public.permission_action
    from unnest(coalesce(p_permissions, '{}')) x
    join public.menus m on m.area = 'ADMIN' and m.key = split_part(x, ':', 1);
  return new_id;
end
$$;

-- 화면용: 변경 이력의 «누가» 를 이름으로 — 이력을 볼 수 있는 사람(«변경 이력» 조회 또는 어느 메뉴든 «이력조회»)에게만
-- 이름을 돌려준다. 사용자 목록 권한 없이도 이력에 이름이 보이게 하되, 이메일 같은 다른 칸은 주지 않는다.
create function public.actor_names(p_ids uuid[])
returns table (id uuid, name text)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.name
    from public.profiles p
   where p.id = any (p_ids)
     and exists (
       select 1 from public.my_permissions() mp where mp.action = 'HISTORY' or (mp.menu_key = 'audit' and mp.action = 'READ')
     )
$$;

-- 주일광고 · 성복의 뜰은 한 표에 있고 메뉴가 둘이다.
create function private.news_menu(p_feed public.news_feed) returns text
language sql immutable
set search_path = ''
as $$
  select case p_feed when 'ANNOUNCEMENTS' then 'announcements' else 'garden' end
$$;

-- 로그인한 사람이 이 부서를 다룰 수 있는가 — «다음세대 부서» 수정 권한 + 부서 범위(지정 안 됐으면 전부).
create function private.can_edit_department(p_slug public.department_slug) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.has_permission('departments', 'UPDATE')
     and exists (
       select 1 from public.profiles p
        where p.id = (select auth.uid())
          and (p.department is null or p.department = p_slug)
     )
$$;

create function private.can_edit_department_id(p_department_id uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select private.can_edit_department(d.slug) from public.departments d where d.id = p_department_id),
    false
  )
$$;

-- 이 묶음에 파일을 넣고 · 빼고 · 순서를 바꿀 수 있는가.
--   · 이미 글에 붙은 묶음 = 그 글을 고치는 것이라 «수정» 권한(부서 묶음은 부서 범위까지).
--     다만 자기가 등록한 임시저장 글의 묶음은 «등록» 권한으로도 된다(시트지 영상 연결과 같은 기준).
--   · 아직 어느 글에도 붙지 않은 묶음(작성 중인 새 글) = «등록» 또는 «수정» 권한.
create function private.can_write_list(p_list_id uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.file_lists l
      join public.menus m on m.id = l.menu_id and m.area = 'ADMIN'
     where l.id = p_list_id
       and case
         when exists (select 1 from private.file_list_owners o where o.list_id = l.id) then
           (
             private.has_permission(m.key, 'UPDATE')
             or (
               private.has_permission(m.key, 'CREATE')
               and not exists (
                 select 1 from private.file_list_owners o
                  where o.list_id = l.id and o.own_draft_by is distinct from (select auth.uid())
               )
             )
           )
           and not exists (
             select 1 from private.file_list_owners o
              where o.list_id = l.id and o.department is not null
                and not private.can_edit_department(o.department)
           )
         else
           private.has_permission(m.key, 'CREATE') or private.has_permission(m.key, 'UPDATE')
       end
  )
$$;

-- 이 묶음을 읽을 수 있는가 — 공개된 글에 붙었거나, 그 메뉴의 조회 권한이 있을 때.
create function private.can_read_list(p_list_id uuid) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from private.file_list_owners o where o.list_id = p_list_id and o.is_public)
      or exists (
        select 1 from public.file_lists l join public.menus m on m.id = l.menu_id and m.area = 'ADMIN'
         where l.id = p_list_id and private.has_permission(m.key, 'READ')
      )
$$;

-- Storage 경로(`<메뉴 key>/<묶음 id>/<파일>`)에서 묶음 id 를 읽어 쓰기 권한을 본다. 모양이 틀리면 거절.
create function private.can_write_storage_path(p_name text) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select case
    when p_name ~ '^[a-z][a-z0-9-]*/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
      then private.can_write_list(split_part(p_name, '/', 2)::uuid)
           and exists (
             select 1 from public.file_lists l join public.menus m on m.id = l.menu_id
              where l.id = split_part(p_name, '/', 2)::uuid and m.key = split_part(p_name, '/', 1)
           )
    else false
  end
$$;

-- 변경 이력 한 줄을 볼 수 있는가 — «변경 이력» 메뉴 조회, 또는 그 글 메뉴의 «이력조회».
create function private.can_read_history(p_table text, p_row_id uuid, p_parent_table text, p_parent_id uuid)
returns boolean
language plpgsql stable security definer
set search_path = ''
as $$
declare
  t text := case when p_table = 'files' then p_parent_table else p_table end;
  menu text;
  feed public.news_feed;
begin
  if t = 'file_lists' then
    select m.key into menu
      from public.file_lists l join public.menus m on m.id = l.menu_id and m.area = 'ADMIN'
     where l.id = p_parent_id;
    return coalesce(private.has_permission(menu, 'HISTORY'), false);
  end if;

  -- 주일광고 · 성복의 뜰은 그 글의 feed 로 메뉴를 고른다. 완전 삭제돼 글이 없으면 둘 다 있어야 본다.
  if t = 'news_videos' then
    select v.feed into feed from public.news_videos v where v.id = p_row_id;
    if feed is null then
      return private.has_permission('announcements', 'HISTORY') and private.has_permission('garden', 'HISTORY');
    end if;
    return private.has_permission(private.news_menu(feed), 'HISTORY');
  end if;

  menu := case t
    when 'bulletins'         then 'bulletin'
    when 'albums'            then 'album'
    when 'resources'         then 'resources'
    when 'resource_videos'   then 'resources'
    when 'home_hero'         then 'home-hero'
    when 'departments'       then 'departments'
    when 'department_staff'  then 'departments'
    when 'newcomers'         then 'newcomers'
    when 'profiles'          then 'users'
    when 'user_groups'       then 'users'
    when 'groups'            then 'groups'
    when 'group_permissions' then 'groups'
    when 'menus'             then 'menus'
    when 'categories'        then 'categories'
    when 'codes'             then 'codes'
  end;
  return menu is not null and private.has_permission(menu, 'HISTORY');
end
$$;

-- ----------------------------------------------------------------------------
-- 트리거 함수
-- ----------------------------------------------------------------------------

-- 등록 · 수정 시각과 사람을 채운다. 화면이 보낸 값은 무시한다. 표에 없는 칸은 건너뛴다(jsonb_populate_record).
-- deleted_at 이 바뀌면 deleted_by 를 맞춘다(휴지통 보내기 = 지금 사람, 복구 = 비움).
create function private.stamp() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  patch jsonb;
begin
  if tg_op = 'INSERT' then
    patch := jsonb_build_object(
      'created_at', now(), 'created_by', actor,
      'updated_at', now(), 'updated_by', actor,
      'deleted_at', null, 'deleted_by', null
    );
  else
    patch := jsonb_build_object(
      'created_at', to_jsonb(old) -> 'created_at', 'created_by', to_jsonb(old) -> 'created_by',
      'updated_at', now(), 'updated_by', actor
    );
    if (to_jsonb(new) -> 'deleted_at') is distinct from (to_jsonb(old) -> 'deleted_at') then
      patch := patch || jsonb_build_object(
        'deleted_by', case when to_jsonb(new) ->> 'deleted_at' is null then null else actor end
      );
    else
      patch := patch || jsonb_build_object('deleted_by', to_jsonb(old) -> 'deleted_by');
    end if;
  end if;
  new := jsonb_populate_record(new, patch);
  return new;
end
$$;

-- 연결 표처럼 등록만 있는 표 — 등록 시각 · 사람만.
create function private.stamp_created() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new := jsonb_populate_record(new, jsonb_build_object('created_at', now(), 'created_by', (select auth.uid())));
  return new;
end
$$;

-- 변경 이력 한 줄. 인자: [0] 부모를 가리키는 칸 이름(없으면 '') [1] 부모 표 이름 [2] 값을 남기지 않을 칸(쉼표).
-- security definer — 사용자는 audit_log 에 직접 쓰지 못한다.
create function private.audit_row() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  rec jsonb := coalesce(n, o);
  skip text[] := array['created_at', 'created_by', 'updated_at', 'updated_by'];
  masked text[] := coalesce(string_to_array(nullif(tg_argv[2], ''), ','), '{}');
  parent_col text := nullif(tg_argv[0], '');
  diff jsonb := '{}';
  k text;
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(n) loop
      continue when k = any (skip);
      if (n -> k) is distinct from (o -> k) then
        diff := diff || jsonb_build_object(
          k, case when k = any (masked) then null else jsonb_build_array(o -> k, n -> k) end
        );
      end if;
    end loop;
    if diff = '{}' then
      return null;
    end if;
  else
    select coalesce(jsonb_object_agg(e.key, case when e.key = any (masked) then null else e.value end), '{}')
      into diff
      from jsonb_each(rec) e
     where e.key <> all (skip);
  end if;

  insert into public.audit_log (table_name, row_id, parent_table, parent_id, action, actor_id, changes)
  values (
    tg_table_name,
    (rec ->> 'id')::uuid,
    case when parent_col is not null then tg_argv[1] end,
    case when parent_col is not null then (rec ->> parent_col)::uuid end,
    tg_op::public.audit_action,
    (select auth.uid()),
    diff
  );
  return null;
end
$$;

-- 콘텐츠 수정의 기능 구분: 휴지통 보내기 · 복구(deleted_at 변경)는 «삭제», 그 밖의 칸은 «수정».
-- 사람이 없는 변경(예약 작업 · 가져오기)은 검사하지 않는다. 인자: [0] 메뉴 key(주일광고 · 성복의 뜰은 feed 로 정한다).
create function private.guard_content() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  menu text;
  o jsonb := to_jsonb(old) - array['updated_at', 'updated_by', 'deleted_at', 'deleted_by'];
  n jsonb := to_jsonb(new) - array['updated_at', 'updated_by', 'deleted_at', 'deleted_by'];
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  -- 메뉴는 사람 검사 뒤에 정한다(서버 전용 키는 판정 함수의 실행 권한이 없다).
  menu := coalesce(nullif(tg_argv[0], ''), private.news_menu((to_jsonb(new) ->> 'feed')::public.news_feed));
  if (to_jsonb(new) ->> 'feed') is distinct from (to_jsonb(old) ->> 'feed') then
    raise exception '주일광고와 성복의 뜰 사이로 옮길 수 없습니다' using errcode = '42501';
  end if;
  if new.deleted_at is distinct from old.deleted_at and not private.has_permission(menu, 'DELETE') then
    raise exception '삭제 권한이 없습니다' using errcode = '42501';
  end if;
  if o is distinct from n and not private.has_permission(menu, 'UPDATE') then
    raise exception '수정 권한이 없습니다' using errcode = '42501';
  end if;
  return new;
end
$$;

-- 글이 가리키는 파일 묶음은 그 글의 메뉴 묶음이어야 한다(다른 화면의 묶음을 붙여 권한 · 부서 범위를 피하지 않게).
-- 사람이 없는 변경에도 지킨다(데이터 규칙). 인자: [0] 메뉴 key, [1..] *_list_id 칸 이름.
create function private.guard_list_menu() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  col text;
  list_id uuid;
  i integer;
begin
  for i in 1 .. tg_nargs - 1 loop
    col := tg_argv[i];
    list_id := (to_jsonb(new) ->> col)::uuid;
    continue when list_id is null;
    if tg_op = 'UPDATE' and list_id is not distinct from (to_jsonb(old) ->> col)::uuid then
      continue;
    end if;
    if not exists (
      select 1 from public.file_lists l join public.menus m on m.id = l.menu_id
       where l.id = list_id and m.area = 'ADMIN' and m.key = tg_argv[0]
    ) then
      raise exception '«%» 칸의 묶음이 «%» 화면의 묶음이 아닙니다', col, tg_argv[0] using errcode = '23514';
    end if;
  end loop;
  return new;
end
$$;

-- 메뉴는 화면에서 이름 · 사용 여부 · 순서만 바꾼다. 나머지는 reference.sql(사람 없음)로만.
create function private.guard_menus() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and (to_jsonb(new) - array['label', 'is_active', 'sort', 'updated_at', 'updated_by'])
         is distinct from (to_jsonb(old) - array['label', 'is_active', 'sort', 'updated_at', 'updated_by']) then
    raise exception '메뉴는 이름 · 사용 여부 · 순서만 바꿀 수 있습니다' using errcode = '42501';
  end if;
  return new;
end
$$;

-- 분류: 묶음 · slug(공개 주소의 거르기 값)는 바꾸지 않는다. 사람이 없는 변경(reference.sql · 가져오기)은 검사하지 않는다.
create function private.guard_categories() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and (new.group_key is distinct from old.group_key or new.slug is distinct from old.slug) then
    raise exception '분류의 묶음 · 영문 이름은 바꿀 수 없습니다' using errcode = '42501';
  end if;
  return new;
end
$$;

-- 공통코드: 묶음 · 코드 값은 바꾸지 않는다. 잠긴 묶음(enum 과 같은 값)은 코드를 더하거나 끌 수 없다 — 이름 · 순서만.
-- 사람이 없는 변경(reference.sql)은 검사하지 않는다.
create function private.guard_codes() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  locked boolean;
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  select g.is_locked into locked from public.code_groups g where g.key = new.group_key;
  if tg_op = 'INSERT' then
    if locked then
      raise exception '프로그램이 쓰는 코드 묶음에는 코드를 더할 수 없습니다' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.group_key is distinct from old.group_key or new.code is distinct from old.code then
    raise exception '코드 값은 바꿀 수 없습니다' using errcode = '42501';
  end if;
  if locked and new.is_active is distinct from old.is_active then
    raise exception '프로그램이 쓰는 코드는 끌 수 없습니다' using errcode = '42501';
  end if;
  return new;
end
$$;

-- 메뉴에서 기능이 빠지면(변경 파일) 그 기능의 권한 칸도 지운다.
create function private.prune_menu_permissions() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  delete from public.group_permissions gp
   where gp.menu_id = new.id and not (gp.action = any (new.actions));
  return null;
end
$$;

-- 권한 칸: 그 메뉴에 있는 기능만. 사람이 줄 때는 자기가 가진 권한만 줄 수 있다(«전체 관리» 는 예외).
create function private.guard_group_permissions() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  m record;
begin
  select key, actions, area into m from public.menus where id = new.menu_id;
  if m.area <> 'ADMIN' or not (new.action = any (m.actions)) then
    raise exception '메뉴 «%» 에는 «%» 기능이 없습니다', m.key, new.action using errcode = '23514';
  end if;
  if (select auth.uid()) is not null
     and not private.is_full_admin()
     and not private.has_permission(m.key, new.action) then
    raise exception '자기가 가진 권한만 줄 수 있습니다' using errcode = '42501';
  end if;
  return new;
end
$$;

-- 그룹 소속: 자기 그룹은 못 바꾸고, «전체 관리» 그룹의 구성원은 «전체 관리» 만 바꾼다.
create function private.guard_user_groups() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target_user uuid;
  target_group uuid;
begin
  if tg_op = 'DELETE' then
    target_user := old.user_id;
    target_group := old.group_id;
  else
    target_user := new.user_id;
    target_group := new.group_id;
  end if;
  if actor is not null then
    if target_user = actor then
      raise exception '자기 그룹은 바꿀 수 없습니다' using errcode = '42501';
    end if;
    if exists (select 1 from public.groups g where g.id = target_group and g.is_system)
       and not private.is_full_admin() then
      raise exception '«전체 관리» 그룹의 구성원은 «전체 관리» 만 바꿉니다' using errcode = '42501';
    end if;
    -- 권한 올리기 방지 ②: 그룹에 넣는 것도 권한을 주는 것이다 — 그 그룹의 권한을 내가 모두 가졌을 때만.
    if tg_op = 'INSERT'
       and not private.is_full_admin()
       and exists (
         select 1
           from public.group_permissions gp
           join public.menus m on m.id = gp.menu_id
          where gp.group_id = target_group
            and not private.has_permission(m.key, gp.action)
       ) then
      raise exception '자기가 가진 권한보다 많은 그룹에는 넣을 수 없습니다' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;

-- 그룹: 시스템 그룹은 끄거나 지우거나 key 를 바꿀 수 없다(이름 · 설명은 된다). key 는 사람이 정하지 않는다.
create function private.guard_groups() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then
      raise exception '시스템 그룹은 지울 수 없습니다' using errcode = '42501';
    end if;
    return old;
  end if;
  if (select auth.uid()) is not null then
    if tg_op = 'INSERT' and (new.key is not null or new.is_system) then
      raise exception '그룹 key 와 시스템 여부는 변경 파일로만 정합니다' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and (new.key is distinct from old.key or new.is_system is distinct from old.is_system) then
      raise exception '그룹 key 와 시스템 여부는 변경 파일로만 정합니다' using errcode = '42501';
    end if;
    -- «삭제»(끄기) 권한만 있으면 사용 여부만 바꾼다.
    if tg_op = 'UPDATE'
       and not private.has_permission('groups', 'UPDATE')
       and (to_jsonb(new) - array['is_active', 'updated_at', 'updated_by'])
           is distinct from (to_jsonb(old) - array['is_active', 'updated_at', 'updated_by']) then
      raise exception '그룹 수정 권한이 없습니다' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;

-- 사용자 정보: id · email 은 화면에서 못 바꾼다. 자기 자신은(사용자 수정 권한이 없으면) 비밀번호 변경 표시만 끈다.
-- «전체 관리» 구성원을 끄거나 · 비밀번호 초기화 표시를 하거나 · 부서를 바꾸는 것은 «전체 관리» 만.
create function private.guard_profiles() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null then
    return new;
  end if;
  if new.id is distinct from old.id or new.email is distinct from old.email then
    raise exception '계정 id · 이메일은 여기서 바꿀 수 없습니다' using errcode = '42501';
  end if;
  if not private.has_permission('users', 'UPDATE') then
    if old.id <> actor
       or (to_jsonb(new) - array['must_change_password', 'updated_at', 'updated_by'])
          is distinct from (to_jsonb(old) - array['must_change_password', 'updated_at', 'updated_by'])
       or new.must_change_password then
      raise exception '사용자 수정 권한이 없습니다' using errcode = '42501';
    end if;
    return new;
  end if;
  if old.id = actor and not new.is_active then
    raise exception '자기 계정은 끌 수 없습니다' using errcode = '42501';
  end if;
  -- 자기 부서 범위는 «전체 관리» 만 바꾼다(비우면 모든 부서가 된다).
  if old.id = actor and new.department is distinct from old.department and not private.is_full_admin() then
    raise exception '자기 부서 범위는 바꿀 수 없습니다' using errcode = '42501';
  end if;
  if old.id <> actor
     and exists (
       select 1 from public.user_groups ug join public.groups g on g.id = ug.group_id
        where ug.user_id = old.id and g.is_system
     )
     and not private.is_full_admin() then
    raise exception '«전체 관리» 구성원은 «전체 관리» 만 바꿉니다' using errcode = '42501';
  end if;
  return new;
end
$$;

-- «전체 관리» 에 활성 구성원이 한 명은 남아야 한다(잠김 방지). 이미 0명인 상태(처음 만든 DB)는 막지 않는다 —
-- 그 변경으로 0명이 될 때만 막는다.
-- 동시에 돌면 서로의 커밋 전 변경이 안 보여 둘 다 통과할 수 있다(두 사람이 서로를 끄는 경우 등) — 표를 읽기 전에 잠금을 걸고
-- 차례로 본다. 잠금 뒤의 읽기가 앞쪽이 커밋한 상태를 보는 것은 READ COMMITTED(Supabase 기본)라서다 — 더 높은 격리 수준으로
-- 이 표들을 고치는 곳은 없다. 지연 검사(커밋 때)로 두고 바로 검사로 바꾸지 않는다 — 트랜잭션 중간에 잠그면 다른 행 잠금과
-- 엇갈릴 수 있다.
create function private.ensure_admin_remains() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  -- 잠글 필요가 없는 변경은 바로 넘긴다 — 바뀐 행 값과, 바뀌지 않는 칸(그룹의 is_system)만 본다.
  -- 표마다 칸이 달라서 따로 읽는다(한 식에 섞으면 다른 표의 칸 이름을 찾다가 실패한다).
  if tg_table_name = 'user_groups' then
    if not exists (select 1 from public.groups g where g.id = old.group_id and g.is_system) then
      return null;
    end if;
  elsif not (old.is_active and not new.is_active) then
    return null;
  end if;
  -- 이 검사만 쓰는 잠금 열쇠(두 칸: 이 사이트 · 이 검사 — 다른 곳의 잠금 번호와 겹치지 않게 고정 값). 트랜잭션이 끝날 때 풀린다
  perform pg_catalog.pg_advisory_xact_lock(5355, 1);
  -- 끈 사람이 «전체 관리» 구성원이 아니면 상관없다(일반 사용자 끄기). 같은 트랜잭션에서 그룹에서도 뺐으면 여기서는 넘기고,
  -- 그 빼기(user_groups) 쪽 검사가 남은 인원을 본다. if 를 겹친다 — 한 식에 두면 user_groups 일 때도 old.id 를 찾다가 실패한다
  if tg_table_name = 'profiles' then
    if not exists (
      select 1 from public.user_groups ug join public.groups g on g.id = ug.group_id and g.is_system
       where ug.user_id = old.id
    ) then
      return null;
    end if;
  end if;
  if not exists (
    select 1
      from public.user_groups ug
      join public.groups g on g.id = ug.group_id and g.is_system and g.is_active
      join public.profiles p on p.id = ug.user_id and p.is_active
  ) then
    raise exception '«전체 관리» 에 활성 사용자가 한 명은 남아야 합니다' using errcode = '23514';
  end if;
  return null;
end
$$;

-- 로그인 계정이 생기면 사용자 정보를 만들고, 이메일이 바뀌면 맞춘다.
-- 이름은 계정을 만들 때 넘긴 user_metadata.name(없으면 이메일 앞부분).
create function private.on_auth_user_changed() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  -- 익명 로그인은 관리자 계정이 아니다(reference.sql 의 기존 계정 채우기와 같은 기준).
  if new.is_anonymous then
    return null;
  end if;
  if tg_op = 'INSERT' then
    insert into public.profiles (id, email, name)
    values (
      new.id,
      coalesce(new.email, ''),
      left(coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, 'user'), '@', 1)), 50)
    )
    on conflict (id) do nothing;
  elsif new.email is distinct from old.email then
    update public.profiles set email = coalesce(new.email, '') where id = new.id;
  end if;
  return null;
end
$$;

-- ----------------------------------------------------------------------------
-- 예약 작업(하루 한 번 — 서버 전용 키로만 부른다). Storage 의 실제 파일은 SQL 로 지울 수 없어서
-- 지울 파일 목록은 private.orphan_file_lists 를 앱이 읽어 Storage API 로 지운 뒤 묶음을 지운다.
-- ----------------------------------------------------------------------------

create function public.purge_expired() returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  result jsonb := '{}';
  n integer;
begin
  -- 휴지통 30일
  delete from public.bulletins where deleted_at < now() - interval '30 days';
  get diagnostics n = row_count; result := result || jsonb_build_object('bulletins', n);
  delete from public.news_videos where deleted_at < now() - interval '30 days';
  get diagnostics n = row_count; result := result || jsonb_build_object('news_videos', n);
  delete from public.albums where deleted_at < now() - interval '30 days';
  get diagnostics n = row_count; result := result || jsonb_build_object('albums', n);
  delete from public.resources where deleted_at < now() - interval '30 days';
  get diagnostics n = row_count; result := result || jsonb_build_object('resources', n);
  -- 새가족 접수 1년
  delete from public.newcomers where created_at < now() - interval '1 year';
  get diagnostics n = row_count; result := result || jsonb_build_object('newcomers', n);
  -- 횟수 제한 기록 하루
  delete from public.submission_attempts where at < now() - interval '1 day';
  get diagnostics n = row_count; result := result || jsonb_build_object('submission_attempts', n);
  -- 어느 글에도 붙지 않은 지 24시간 넘은 묶음(파일 행은 함께 지워진다). 휴지통에서 지운 글의 묶음도 여기서 정리된다.
  delete from public.file_lists where id in (select id from private.orphan_file_lists);
  get diagnostics n = row_count; result := result || jsonb_build_object('file_lists', n);
  return result;
end
$$;

-- 예약 작업 2단계: 어느 files 행도 가리키지 않는 Storage 파일(24시간 지난 것 — 올리는 중인 파일은 건드리지 않는다).
-- 앱이 이 목록을 Storage API 로 지운다. purge_expired 뒤에 부른다.
create function public.orphan_storage_objects(p_limit integer default 1000) returns setof text
language sql stable security definer
set search_path = ''
as $$
  select o.name
    from storage.objects o
   where o.bucket_id = 'media'
     and o.created_at < now() - interval '24 hours'
     and not exists (select 1 from public.files f where f.bucket = o.bucket_id and f.path = o.name)
   order by o.created_at
   limit p_limit
$$;

-- 새가족 알림을 받을 사람(설계 6.11) — «새가족» 조회 권한이 있는 활성 사용자의 이메일. 서버 전용 키로만.
create function public.newcomer_notify_emails() returns setof text
language sql stable security definer
set search_path = ''
as $$
  select p.email
    from public.profiles p
   where p.is_active
     and p.email <> ''
     and private.user_has_permission(p.id, 'newcomers', 'READ')
$$;

-- ----------------------------------------------------------------------------
-- 트리거
-- ----------------------------------------------------------------------------

create trigger on_auth_user_changed
  after insert or update of email on auth.users
  for each row execute function private.on_auth_user_changed();

-- 등록 · 수정 시각과 사람
create trigger stamp before insert or update on public.profiles          for each row execute function private.stamp();
create trigger stamp before insert or update on public.groups            for each row execute function private.stamp();
create trigger stamp before insert or update on public.menus             for each row execute function private.stamp();
create trigger stamp before insert or update on public.categories        for each row execute function private.stamp();
create trigger stamp before insert or update on public.codes             for each row execute function private.stamp();
create trigger stamp before insert or update on public.files             for each row execute function private.stamp();
create trigger stamp before insert or update on public.bulletins         for each row execute function private.stamp();
create trigger stamp before insert or update on public.news_videos       for each row execute function private.stamp();
create trigger stamp before insert or update on public.albums            for each row execute function private.stamp();
create trigger stamp before insert or update on public.resources         for each row execute function private.stamp();
create trigger stamp before insert or update on public.home_hero         for each row execute function private.stamp();
create trigger stamp before insert or update on public.departments       for each row execute function private.stamp();
create trigger stamp before insert or update on public.department_staff  for each row execute function private.stamp();
create trigger stamp before insert or update on public.newcomers         for each row execute function private.stamp();
create trigger stamp before insert on public.user_groups       for each row execute function private.stamp_created();
create trigger stamp before insert on public.group_permissions for each row execute function private.stamp_created();
create trigger stamp before insert on public.file_lists        for each row execute function private.stamp_created();
create trigger stamp before insert on public.resource_videos   for each row execute function private.stamp_created();

-- 지키는 규칙
create trigger guard before update on public.bulletins   for each row execute function private.guard_content('bulletin');
create trigger guard before update on public.news_videos for each row execute function private.guard_content('');
create trigger guard before update on public.albums      for each row execute function private.guard_content('album');
create trigger guard before update on public.resources   for each row execute function private.guard_content('resources');
create trigger guard before update on public.menus       for each row execute function private.guard_menus();
create trigger guard before update on public.categories  for each row execute function private.guard_categories();
create trigger guard before insert or update on public.codes for each row execute function private.guard_codes();
create trigger guard_lists before insert or update on public.bulletins
  for each row execute function private.guard_list_menu('bulletin', 'pages_list_id');
create trigger guard_lists before insert or update on public.albums
  for each row execute function private.guard_list_menu('album', 'images_list_id');
create trigger guard_lists before insert or update on public.resources
  for each row execute function private.guard_list_menu('resources', 'file_list_id', 'pages_list_id');
create trigger guard_lists before insert or update on public.home_hero
  for each row execute function private.guard_list_menu('home-hero', 'photo_list_id');
create trigger guard_lists before insert or update on public.departments
  for each row execute function private.guard_list_menu('departments', 'photos_list_id');
create trigger guard_lists before insert or update on public.department_staff
  for each row execute function private.guard_list_menu('departments', 'photo_list_id');
create trigger prune_permissions after update of actions on public.menus
  for each row execute function private.prune_menu_permissions();
create trigger guard before insert or update on public.group_permissions
  for each row execute function private.guard_group_permissions();
create trigger guard before insert or delete on public.user_groups
  for each row execute function private.guard_user_groups();
create trigger guard before insert or update or delete on public.groups
  for each row execute function private.guard_groups();
create trigger guard before update on public.profiles for each row execute function private.guard_profiles();
create constraint trigger ensure_admin_remains after delete on public.user_groups
  deferrable initially deferred for each row execute function private.ensure_admin_remains();
create constraint trigger ensure_admin_remains after update of is_active on public.profiles
  deferrable initially deferred for each row execute function private.ensure_admin_remains();

-- 변경 이력(딸린 행은 부모에 묶는다, 새가족은 개인정보 칸의 값을 남기지 않는다)
create trigger audit after insert or update or delete on public.profiles
  for each row execute function private.audit_row();
create trigger audit after insert or delete on public.user_groups
  for each row execute function private.audit_row('user_id', 'profiles');
create trigger audit after insert or update or delete on public.groups
  for each row execute function private.audit_row();
create trigger audit after insert or delete on public.group_permissions
  for each row execute function private.audit_row('group_id', 'groups');
create trigger audit after insert or update or delete on public.menus
  for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.categories
  for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.codes
  for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.files
  for each row execute function private.audit_row('list_id', 'file_lists');
create trigger audit after insert or update or delete on public.bulletins
  for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.news_videos
  for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.albums
  for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.resources
  for each row execute function private.audit_row();
create trigger audit after insert or delete on public.resource_videos
  for each row execute function private.audit_row('resource_id', 'resources');
create trigger audit after insert or update or delete on public.home_hero
  for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.departments
  for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.department_staff
  for each row execute function private.audit_row('department_id', 'departments');
create trigger audit after insert or update or delete on public.newcomers
  for each row execute function private.audit_row('', '', 'name,phone,message,note');

-- ----------------------------------------------------------------------------
-- 행 권한(RLS) — 모든 표에 켠다(supabase/tests/database 가 «꺼진 표 0개» 를 잠근다).
-- 같은 역할 · 같은 동작에는 규칙을 하나만 둔다(여러 개면 Postgres 가 전부 계산한다).
-- 방문자(anon)는 공개 화면이 서버에서 읽을 때의 역할이다.
-- ----------------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.groups              enable row level security;
alter table public.user_groups         enable row level security;
alter table public.menus               enable row level security;
alter table public.group_permissions   enable row level security;
alter table public.category_groups     enable row level security;
alter table public.categories          enable row level security;
alter table public.code_groups         enable row level security;
alter table public.codes               enable row level security;
alter table public.file_lists          enable row level security;
alter table public.files               enable row level security;
alter table public.bulletins           enable row level security;
alter table public.news_videos         enable row level security;
alter table public.albums              enable row level security;
alter table public.resources           enable row level security;
alter table public.resource_videos     enable row level security;
alter table public.home_hero           enable row level security;
alter table public.departments         enable row level security;
alter table public.department_staff    enable row level security;
alter table public.newcomers           enable row level security;
alter table public.submission_attempts enable row level security;
alter table public.audit_log           enable row level security;

-- 사용자 · 그룹 · 권한
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.has_permission('users', 'READ')));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.has_permission('users', 'UPDATE')))
  with check (id = (select auth.uid()) or (select private.has_permission('users', 'UPDATE')));

create policy groups_select on public.groups for select to authenticated
  using ((select private.has_permission('groups', 'READ')) or (select private.has_permission('users', 'READ')));
create policy groups_insert on public.groups for insert to authenticated
  with check ((select private.has_permission('groups', 'CREATE')));
-- «삭제» 는 끄기(is_active = false)다 — 행을 지우는 규칙은 두지 않는다.
create policy groups_update on public.groups for update to authenticated
  using ((select private.has_permission('groups', 'UPDATE')) or (select private.has_permission('groups', 'DELETE')))
  with check ((select private.has_permission('groups', 'UPDATE')) or (select private.has_permission('groups', 'DELETE')));

create policy user_groups_select on public.user_groups for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.has_permission('users', 'READ'))
    or (select private.has_permission('groups', 'READ'))
  );
create policy user_groups_insert on public.user_groups for insert to authenticated
  with check ((select private.has_permission('users', 'UPDATE')));
create policy user_groups_delete on public.user_groups for delete to authenticated
  using ((select private.has_permission('users', 'UPDATE')));

create policy group_permissions_select on public.group_permissions for select to authenticated
  using ((select private.has_permission('groups', 'READ')));
create policy group_permissions_insert on public.group_permissions for insert to authenticated
  with check ((select private.has_permission('groups', 'UPDATE')));
create policy group_permissions_delete on public.group_permissions for delete to authenticated
  using ((select private.has_permission('groups', 'UPDATE')));

-- 메뉴 — 홈페이지 메뉴는 방문자도 읽는다(덮어쓸 이름 · 사용 여부 · 순서). 관리자 메뉴는 로그인한 사람만.
create policy menus_select_anon on public.menus for select to anon using (area = 'SITE');
create policy menus_select on public.menus for select to authenticated using (true);
create policy menus_update on public.menus for update to authenticated
  using ((select private.has_permission('menus', 'UPDATE')))
  with check ((select private.has_permission('menus', 'UPDATE')));

-- 공통코드 — 분류 이름은 공개 화면에도 나온다.
create policy category_groups_select on public.category_groups for select to anon, authenticated using (true);
create policy categories_select on public.categories for select to anon, authenticated using (true);
create policy categories_insert on public.categories for insert to authenticated
  with check ((select private.has_permission('categories', 'CREATE')));
-- 분류는 지우지 않고 끈다(글이 가리킨다).
create policy categories_update on public.categories for update to authenticated
  using ((select private.has_permission('categories', 'UPDATE')))
  with check ((select private.has_permission('categories', 'UPDATE')));

create policy code_groups_select on public.code_groups for select to anon, authenticated using (true);
create policy codes_select on public.codes for select to anon, authenticated using (true);
create policy codes_insert on public.codes for insert to authenticated
  with check ((select private.has_permission('codes', 'CREATE')));
-- 코드는 지우지 않고 끈다(글이 가리킨다).
create policy codes_update on public.codes for update to authenticated
  using ((select private.has_permission('codes', 'UPDATE')))
  with check ((select private.has_permission('codes', 'UPDATE')));

-- 파일 — 공개된 글에 붙은 묶음은 누구나, 나머지는 그 메뉴의 권한대로.
create policy file_lists_select_anon on public.file_lists for select to anon
  using (private.can_read_list(id));
create policy file_lists_select on public.file_lists for select to authenticated
  using (private.can_read_list(id));
create policy file_lists_insert on public.file_lists for insert to authenticated
  with check (
    exists (
      select 1 from public.menus m
       where m.id = menu_id
         and m.area = 'ADMIN'
         and (private.has_permission(m.key, 'CREATE') or private.has_permission(m.key, 'UPDATE'))
    )
  );
create policy file_lists_delete on public.file_lists for delete to authenticated
  using (private.can_write_list(id));

create policy files_select_anon on public.files for select to anon using (private.can_read_list(list_id));
create policy files_select on public.files for select to authenticated using (private.can_read_list(list_id));
create policy files_insert on public.files for insert to authenticated with check (private.can_write_list(list_id));
create policy files_update on public.files for update to authenticated
  using (private.can_write_list(list_id)) with check (private.can_write_list(list_id));
create policy files_delete on public.files for delete to authenticated using (private.can_write_list(list_id));

-- 콘텐츠 — 방문자는 «공개 + 삭제 안 됨», 로그인한 사람은 메뉴 권한대로.
-- 수정 규칙은 «수정» 또는 «삭제» 권한이면 통과시키고, 어느 칸을 바꿨는지는 private.guard_content 가 가른다.
-- 완전 삭제는 휴지통에 든 것만.
create policy bulletins_select_anon on public.bulletins for select to anon
  using (status = 'PUBLISHED' and deleted_at is null);
create policy bulletins_select on public.bulletins for select to authenticated
  using ((select private.has_permission('bulletin', 'READ')));
create policy bulletins_insert on public.bulletins for insert to authenticated
  with check ((select private.has_permission('bulletin', 'CREATE')));
create policy bulletins_update on public.bulletins for update to authenticated
  using ((select private.has_permission('bulletin', 'UPDATE')) or (select private.has_permission('bulletin', 'DELETE')))
  with check ((select private.has_permission('bulletin', 'UPDATE')) or (select private.has_permission('bulletin', 'DELETE')));
create policy bulletins_delete on public.bulletins for delete to authenticated
  using (deleted_at is not null and (select private.has_permission('bulletin', 'PURGE')));

create policy news_videos_select_anon on public.news_videos for select to anon
  using (status = 'PUBLISHED' and deleted_at is null and video_id is not null);
create policy news_videos_select on public.news_videos for select to authenticated
  using (
    case feed
      when 'ANNOUNCEMENTS' then (select private.has_permission('announcements', 'READ'))
      else (select private.has_permission('garden', 'READ'))
    end
  );
create policy news_videos_insert on public.news_videos for insert to authenticated
  with check (
    case feed
      when 'ANNOUNCEMENTS' then (select private.has_permission('announcements', 'CREATE'))
      else (select private.has_permission('garden', 'CREATE'))
    end
  );
create policy news_videos_update on public.news_videos for update to authenticated
  using (
    case feed
      when 'ANNOUNCEMENTS' then (select private.has_permission('announcements', 'UPDATE'))
                             or (select private.has_permission('announcements', 'DELETE'))
      else (select private.has_permission('garden', 'UPDATE')) or (select private.has_permission('garden', 'DELETE'))
    end
  )
  with check (
    case feed
      when 'ANNOUNCEMENTS' then (select private.has_permission('announcements', 'UPDATE'))
                             or (select private.has_permission('announcements', 'DELETE'))
      else (select private.has_permission('garden', 'UPDATE')) or (select private.has_permission('garden', 'DELETE'))
    end
  );
create policy news_videos_delete on public.news_videos for delete to authenticated
  using (
    deleted_at is not null
    and case feed
      when 'ANNOUNCEMENTS' then (select private.has_permission('announcements', 'PURGE'))
      else (select private.has_permission('garden', 'PURGE'))
    end
  );

create policy albums_select_anon on public.albums for select to anon
  using (status = 'PUBLISHED' and deleted_at is null);
create policy albums_select on public.albums for select to authenticated
  using ((select private.has_permission('album', 'READ')));
create policy albums_insert on public.albums for insert to authenticated
  with check ((select private.has_permission('album', 'CREATE')));
create policy albums_update on public.albums for update to authenticated
  using ((select private.has_permission('album', 'UPDATE')) or (select private.has_permission('album', 'DELETE')))
  with check ((select private.has_permission('album', 'UPDATE')) or (select private.has_permission('album', 'DELETE')));
create policy albums_delete on public.albums for delete to authenticated
  using (deleted_at is not null and (select private.has_permission('album', 'PURGE')));

create policy resources_select_anon on public.resources for select to anon
  using (status = 'PUBLISHED' and deleted_at is null);
create policy resources_select on public.resources for select to authenticated
  using ((select private.has_permission('resources', 'READ')));
create policy resources_insert on public.resources for insert to authenticated
  with check ((select private.has_permission('resources', 'CREATE')));
create policy resources_update on public.resources for update to authenticated
  using ((select private.has_permission('resources', 'UPDATE')) or (select private.has_permission('resources', 'DELETE')))
  with check ((select private.has_permission('resources', 'UPDATE')) or (select private.has_permission('resources', 'DELETE')));
create policy resources_delete on public.resources for delete to authenticated
  using (deleted_at is not null and (select private.has_permission('resources', 'PURGE')));

create policy resource_videos_select_anon on public.resource_videos for select to anon
  using (exists (
    select 1 from public.resources r
     where r.id = resource_id and r.status = 'PUBLISHED' and r.deleted_at is null
  ));
create policy resource_videos_select on public.resource_videos for select to authenticated
  using ((select private.has_permission('resources', 'READ')));
-- 영상 연결은 시트지를 고치는 것 — «수정» 권한. «등록» 만 있으면 자기가 만든 임시저장 시트지에만.
create policy resource_videos_insert on public.resource_videos for insert to authenticated
  with check (
    (select private.has_permission('resources', 'UPDATE'))
    or (
      (select private.has_permission('resources', 'CREATE'))
      and exists (
        select 1 from public.resources r
         where r.id = resource_id and r.status = 'DRAFT' and r.deleted_at is null
           and r.created_by = (select auth.uid())
      )
    )
  );
create policy resource_videos_delete on public.resource_videos for delete to authenticated
  using (
    (select private.has_permission('resources', 'UPDATE'))
    or (
      (select private.has_permission('resources', 'CREATE'))
      and exists (
        select 1 from public.resources r
         where r.id = resource_id and r.status = 'DRAFT' and r.deleted_at is null
           and r.created_by = (select auth.uid())
      )
    )
  );

-- 사이트 화면 — 방문자가 읽는다. 홈 히어로 줄은 가져오기 스크립트가 만든다(화면은 고치기만).
create policy home_hero_select on public.home_hero for select to anon, authenticated using (true);
create policy home_hero_update on public.home_hero for update to authenticated
  using ((select private.has_permission('home-hero', 'UPDATE')))
  with check ((select private.has_permission('home-hero', 'UPDATE')));

create policy departments_select on public.departments for select to anon, authenticated using (true);
create policy departments_update on public.departments for update to authenticated
  using (private.can_edit_department(slug)) with check (private.can_edit_department(slug));

create policy department_staff_select on public.department_staff for select to anon, authenticated using (true);
create policy department_staff_insert on public.department_staff for insert to authenticated
  with check (private.can_edit_department_id(department_id));
create policy department_staff_update on public.department_staff for update to authenticated
  using (private.can_edit_department_id(department_id)) with check (private.can_edit_department_id(department_id));
create policy department_staff_delete on public.department_staff for delete to authenticated
  using (private.can_edit_department_id(department_id));

-- 새가족 — 방문자 규칙 없음(읽기 · 넣기 모두 막힌다). 넣기는 서버 전용 키.
create policy newcomers_select on public.newcomers for select to authenticated
  using ((select private.has_permission('newcomers', 'READ')));
create policy newcomers_update on public.newcomers for update to authenticated
  using ((select private.has_permission('newcomers', 'UPDATE')))
  with check ((select private.has_permission('newcomers', 'UPDATE')));
create policy newcomers_delete on public.newcomers for delete to authenticated
  using ((select private.has_permission('newcomers', 'PURGE')));

-- submission_attempts — 규칙 없음(서버 전용 키만).

-- 변경 이력 — 읽기는 «변경 이력» 메뉴 또는 그 글의 «이력조회». 쓰기는 엑셀 다운로드 기록만(나머지는 트리거).
-- 다운로드 기록은 table_name · action · changes 만 보낼 수 있다(칸 단위 GRANT) — 누가 · 언제는 기본값.
create policy audit_log_select on public.audit_log for select to authenticated
  using (
    (select private.has_permission('audit', 'READ'))
    or private.can_read_history(table_name, row_id, parent_table, parent_id)
  );
create policy audit_log_insert on public.audit_log for insert to authenticated
  with check (
    action = 'EXPORT'
    and table_name = 'newcomers'
    and actor_id = (select auth.uid())
    and row_id is null and parent_table is null
    and (select private.has_permission('newcomers', 'EXPORT'))
  );

-- Storage — 공개 읽기 버킷 하나(media, reference.sql 이 만든다). 방문자 읽기는 공개 주소라 규칙이 필요 없다.
-- 올리기 · 바꾸기 · 지우기는 경로의 묶음에 쓰기 권한이 있을 때만. 덮어쓰기(upsert) · 지우기는 대상 행을 먼저
-- 읽어야 하므로 같은 조건의 읽기 규칙을 둔다(없으면 오류 없이 0줄로 «성공» 한다).
create policy media_select on storage.objects for select to authenticated
  using (bucket_id = 'media' and private.can_write_storage_path(name));
create policy media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and private.can_write_storage_path(name));
create policy media_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and private.can_write_storage_path(name))
  with check (bucket_id = 'media' and private.can_write_storage_path(name));
create policy media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and private.can_write_storage_path(name));

-- ----------------------------------------------------------------------------
-- 권한(GRANT) — 이 절은 파일 맨 끝에 둔다. Supabase 는 public 의 새 표 · 함수에 anon · authenticated 의
-- 모든 권한을 붙이므로, 먼저 전부 거두고 필요한 것만 준다(RLS 가 마지막 벽이고 이것은 그 앞의 벽이다).
-- ----------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public;
revoke all on all tables in schema private from public, anon, authenticated;

grant usage on schema private to anon, authenticated, service_role;
-- 서버 전용 키로 넣을 때(새가족 접수 · 가져오기)도 id 기본값을 부른다
grant execute on function private.uuid_v7() to service_role;
-- RLS 와 기본값이 부르는 함수
grant execute on function private.uuid_v7() to authenticated;
grant execute on function private.is_full_admin() to authenticated;
grant execute on function private.has_permission(text, public.permission_action) to authenticated;
grant execute on function private.news_menu(public.news_feed) to authenticated;
grant execute on function private.can_edit_department(public.department_slug) to authenticated;
grant execute on function private.can_edit_department_id(uuid) to authenticated;
grant execute on function private.can_write_list(uuid) to authenticated;
grant execute on function private.can_read_list(uuid) to anon, authenticated;
grant execute on function private.can_write_storage_path(text) to authenticated;
grant execute on function private.can_read_history(text, uuid, text, uuid) to authenticated;
-- 예약 작업은 서버 전용 키만
grant execute on function public.my_permissions() to authenticated;
grant execute on function public.can_manage_user(uuid) to authenticated;
grant execute on function public.actor_names(uuid[]) to authenticated;
grant execute on function public.save_user(uuid, timestamptz, text, public.department_slug, boolean, uuid[], uuid[]) to authenticated;
grant execute on function public.save_group(uuid, timestamptz, text, text, boolean, text[], text[]) to authenticated;
grant execute on function public.create_group(text, text, text[]) to authenticated;
grant execute on function public.purge_expired() to service_role;
grant execute on function public.orphan_storage_objects(integer) to service_role;
grant execute on function public.newcomer_notify_emails() to service_role;

-- 방문자: 공개 화면이 읽는 표만 읽기
grant select on public.menus, public.category_groups, public.categories, public.code_groups, public.codes,
                public.file_lists, public.files,
                public.bulletins, public.news_videos, public.albums, public.resources, public.resource_videos,
                public.home_hero, public.departments, public.department_staff
  to anon;

-- 로그인 사용자: 표마다 필요한 동작만(행은 RLS 가 다시 거른다)
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.groups to authenticated;
grant select, insert, delete on public.user_groups, public.group_permissions to authenticated;
grant select, update on public.menus to authenticated;
grant select on public.category_groups to authenticated;
grant select, insert, update on public.categories to authenticated;
grant select on public.code_groups to authenticated;
grant select, insert, update on public.codes to authenticated;
grant select, insert, delete on public.file_lists to authenticated;
grant select, insert, update, delete on public.files to authenticated;
grant select, insert, update, delete on public.bulletins, public.news_videos, public.albums, public.resources
  to authenticated;
grant select, insert, delete on public.resource_videos to authenticated;
grant select, update on public.home_hero to authenticated;
-- 부서 slug 는 바꾸지 못한다(주소 · 부서 범위의 기준).
grant select, update (ages, tagline, intro, extra, photos_list_id) on public.departments to authenticated;
grant select, insert, update, delete on public.department_staff to authenticated;
grant select, update, delete on public.newcomers to authenticated;
grant select on public.audit_log to authenticated;
grant insert (table_name, action, changes) on public.audit_log to authenticated;
grant usage on sequence public.albums_slug_seq, public.resources_slug_seq to authenticated;
