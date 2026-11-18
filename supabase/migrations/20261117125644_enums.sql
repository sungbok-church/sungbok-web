-- 프로그램이 분기하는 값(enum). 화면에서 바꿀 수 없다 — 값을 더하려면 변경 파일을 새로 쓴다.
-- 사람이 정하는 분류(성복의 뜰 분류, 시리즈 이름 등)는 enum 이 아니라 공통코드(codes)다.
-- 값은 설계 문서(.md/specs/2026-11-17-admin-design.md 6.3)와 글자 그대로 같고,
-- 화면이 쓰는 TS 타입과의 일치는 src/shared/api/supabase/enumParity.test.ts 가 잠근다.

create type content_status    as enum ('draft', 'published');
create type resource_section  as enum ('sunday', 'series', 'seasonal');
create type news_feed         as enum ('announcements', 'garden');
create type date_source       as enum ('event', 'upload');
create type file_kind         as enum ('image', 'pdf', 'hwp');
create type menu_area         as enum ('admin', 'site');
create type permission_action as enum ('read', 'create', 'update', 'delete', 'purge', 'export', 'history');
create type newcomer_intent   as enum ('register', 'inquiry');
create type newcomer_status   as enum ('new', 'contacted', 'done');
create type audit_action      as enum ('insert', 'update', 'delete', 'export');
create type hero_media_kind   as enum ('photo', 'youtube');
create type department_slug   as enum ('infant', 'kindergarten', 'lower-elementary', 'elementary',
                                       'middle', 'high', 'young-adult', 'english');
