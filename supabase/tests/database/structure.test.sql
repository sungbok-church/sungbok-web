-- 구조 규칙 — schema.sql 을 고칠 때 빠뜨리기 쉬운 것을 잠근다. `pnpm db:test`
begin;
select * from no_plan();

-- 모든 public 표에 행 권한(RLS)이 켜져 있다 — 공개용 키가 브라우저에 있으므로 꺼진 표 하나 = 공개.
select is(
  (select array_agg(c.relname order by c.relname)
     from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and not c.relrowsecurity),
  null,
  'RLS 가 꺼진 public 표가 없다'
);

-- 외래 키마다 그 칸으로 시작하는 인덱스가 있다(부모 행을 지우거나 고칠 때 자식 표를 통째로 읽지 않게).
select is(
  (select array_agg(c.conrelid::regclass || '(' || c.conname || ')' order by 1)
     from pg_constraint c
    where c.contype = 'f'
      and c.connamespace = 'public'::regnamespace
      and not exists (
        select 1 from pg_index i
         where i.indrelid = c.conrelid
           and (string_to_array(i.indkey::text, ' ')::int2[])[1:cardinality(c.conkey)] @> c.conkey
           and (string_to_array(i.indkey::text, ' ')::int2[])[1:cardinality(c.conkey)] <@ c.conkey
      )),
  null,
  '인덱스 없는 외래 키가 없다'
);

-- 파일 묶음을 가리키는 칸은 전부 private.file_list_owners 에 있다 — 빠지면 예약 작업이 그 자리의 파일을 지운다.
select is(
  (select array_agg(c.conrelid::regclass || '.' || a.attname order by 1)
     from pg_constraint c
     join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and c.confrelid = 'public.file_lists'::regclass
      and c.conrelid <> 'public.files'::regclass
      and position(
            (select relname from pg_class where oid = c.conrelid) || '.' || a.attname
            in pg_get_viewdef('private.file_list_owners'::regclass)
          ) = 0),
  null,
  '파일 묶음을 가리키는 칸이 모두 private.file_list_owners 에 있다'
);

-- 우리가 만든 함수는 모두 search_path 를 고정한다(호출하는 쪽이 바꾼 search_path 로 다른 객체를 부르지 않게).
select is(
  (select array_agg(p.oid::regprocedure::text order by 1)
     from pg_proc p
    where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      and not exists (select 1 from unnest(p.proconfig) cfg where cfg like 'search_path=%')),
  null,
  '모든 함수가 search_path 를 고정한다'
);

-- 방문자 · 로그인 사용자가 public 함수를 직접 부를 수 없다(예약 작업은 서버 전용 키만).
select ok(not has_function_privilege('anon', 'public.purge_expired()', 'execute'), '방문자는 예약 작업을 못 부른다');
select ok(not has_function_privilege('authenticated', 'public.purge_expired()', 'execute'), '로그인 사용자도 못 부른다');
select ok(has_function_privilege('service_role', 'public.purge_expired()', 'execute'), '서버 전용 키는 부른다');
select ok(not has_function_privilege('authenticated', 'public.orphan_storage_objects(integer)', 'execute'), '주인 없는 Storage 파일 목록은 서버 전용');
select ok(not has_function_privilege('authenticated', 'public.newcomer_notify_emails()', 'execute'), '알림 받을 사람 목록은 서버 전용');
select ok(not has_function_privilege('authenticated', 'private.user_has_permission(uuid, text, public.permission_action)', 'execute'), '다른 사람의 권한은 조회하지 못한다');

-- 방문자는 개인정보 · 권한 표를 읽을 권한 자체가 없다.
select ok(not has_table_privilege('anon', 'public.newcomers', 'select'), '방문자: 새가족 읽기 권한 없음');
select ok(not has_table_privilege('anon', 'public.newcomers', 'insert'), '방문자: 새가족 넣기 권한 없음');
select ok(not has_table_privilege('anon', 'public.profiles', 'select'), '방문자: 사용자 읽기 권한 없음');
select ok(not has_table_privilege('anon', 'public.audit_log', 'select'), '방문자: 변경 이력 읽기 권한 없음');
select ok(not has_table_privilege('anon', 'public.group_permissions', 'select'), '방문자: 권한 표 읽기 권한 없음');
select ok(not has_table_privilege('authenticated', 'public.submission_attempts', 'select'), '로그인 사용자: 횟수 제한 표 권한 없음');
select ok(not has_table_privilege('authenticated', 'public.audit_log', 'update'), '변경 이력은 아무도 고치지 못한다');
select ok(not has_table_privilege('authenticated', 'public.audit_log', 'delete'), '변경 이력은 아무도 지우지 못한다');
select ok(not has_table_privilege('authenticated', 'public.bulletins', 'truncate'), '로그인 사용자는 표를 비우지 못한다');

-- uuid v7: 버전 칸 7, 변형 칸 10xx, 만든 순서대로 커진다.
select is(substr(private.uuid_v7()::text, 15, 1), '7', 'uuid_v7 의 버전 칸은 7');
select ok(substr(private.uuid_v7()::text, 20, 1) in ('8', '9', 'a', 'b'), 'uuid_v7 의 변형 칸은 RFC 9562');
create temp table ids (n int, v uuid);
insert into ids values (1, private.uuid_v7());
select pg_sleep(0.002);
insert into ids values (2, private.uuid_v7());
select ok(
  (select v from ids where n = 1) < (select v from ids where n = 2),
  'uuid_v7 은 나중에 만든 것이 더 크다'
);

-- 초기 행(reference.sql)
select is((select count(*)::int from public.menus where area = 'ADMIN' and path is not null), 14, '관리자 화면 메뉴 14개(전체 «변경 이력» 은 2026-11-26 없앰)');
select ok((select is_system and is_active from public.groups where key = 'admin'), '«전체 관리» 그룹이 있다');
select is(
  (select count(*)::int from public.group_permissions gp join public.groups g on g.id = gp.group_id where g.key = 'admin'),
  0,
  '«전체 관리» 는 권한 칸 없이 모든 권한'
);
select ok(
  (select bool_and(gp.action = any (m.actions))
     from public.group_permissions gp join public.menus m on m.id = gp.menu_id),
  '처음 권한은 모두 그 메뉴에 있는 기능이다'
);
select ok(exists (select 1 from storage.buckets where id = 'media' and public), 'media 버킷(공개 읽기)');

-- 잠긴 공통코드 묶음 = enum 값(대문자). enum 에 값을 더하면 reference.sql 의 코드도 더해야 한다.
select set_eq(
  $$select code from public.codes where group_key = 'CONTENT_STATUS'$$,
  $$select unnest(enum_range(null::public.content_status))::text$$,
  '콘텐츠 상태 코드 = content_status enum'
);
select set_eq(
  $$select code from public.codes where group_key = 'NEWCOMER_INTENT'$$,
  $$select unnest(enum_range(null::public.newcomer_intent))::text$$,
  '새가족 구분 코드 = newcomer_intent enum'
);
select set_eq(
  $$select code from public.codes where group_key = 'NEWCOMER_STATUS'$$,
  $$select unnest(enum_range(null::public.newcomer_status))::text$$,
  '새가족 처리 상태 코드 = newcomer_status enum'
);
select ok(
  (select bool_and(is_locked) from public.code_groups
    where key in ('CONTENT_STATUS', 'NEWCOMER_INTENT', 'NEWCOMER_STATUS')),
  'enum 과 짝인 묶음은 잠겨 있다'
);
select ok(
  not exists (
    select 1 from pg_enum e
     where e.enumlabel <> upper(e.enumlabel)
       and e.enumtypid in (select t.oid from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public')
  ),
  'public enum 값은 모두 대문자'
);
select ok(
  (select count(*) from public.categories) >= 14 and (select count(*) from public.category_groups) = 6,
  '처음 분류(지금 사이트의 값)가 들어 있다'
);

-- 첫 화면 «저장 공간»(합계만) — 로그인한 관리자만
select ok(has_function_privilege('authenticated', 'public.storage_usage()', 'execute'), '로그인 사용자는 저장 공간 합계를 본다');
select ok(not has_function_privilege('anon', 'public.storage_usage()', 'execute'), '방문자는 못 본다');
insert into storage.objects (bucket_id, name, metadata) values
  ('media', 't-usage/a.webp', '{"size": 1000}'), ('media', 't-usage/b.webp', '{"size": 24}');
select ok(public.storage_usage() >= 1024, '올린 파일 크기를 더한다');
-- 전체 «변경 이력» 화면은 없앴다(2026-11-26) — 이력은 각 화면에서
select is((select count(*)::int from public.menus where area = 'ADMIN' and key = 'audit'), 0, '«변경 이력» 메뉴는 없다');

select * from finish();
rollback;
