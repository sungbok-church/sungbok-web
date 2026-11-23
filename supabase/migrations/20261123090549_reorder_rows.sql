SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.reorder_rows (
  p_table text,
  p_ids   uuid[]
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  first_id uuid := p_ids[1];
  current_ids uuid[];
begin
  if p_table is null or p_table not in ('menus', 'categories', 'codes') then
    raise exception '순서를 바꿀 수 없는 표입니다: %', p_table using errcode = '22023';
  end if;
  if coalesce(cardinality(p_ids), 0) = 0
     or cardinality(p_ids) <> (select count(distinct x) from unnest(p_ids) x) then
    raise exception '순서를 바꿀 목록이 비었거나 같은 줄이 두 번 들어 있습니다' using errcode = '23514';
  end if;
  if not private.has_permission(p_table, 'UPDATE') then
    raise exception '수정 권한이 없습니다' using errcode = '42501';
  end if;

  -- 첫 줄과 같은 무리의 줄을 모두 잠그고 지금 목록을 읽는다(잠그는 차례는 id 순 — 서로 기다리다 멈추지 않게)
  if p_table = 'menus' then
    with locked as (
      select t.id
        from public.menus t
        join public.menus f on f.id = first_id
       where t.area = f.area and t.parent_id is not distinct from f.parent_id
       order by t.id
         for update of t
    )
    select array_agg(id order by id) into current_ids from locked;
  elsif p_table = 'categories' then
    with locked as (
      select t.id
        from public.categories t
        join public.categories f on f.id = first_id
       where t.group_key = f.group_key
       order by t.id
         for update of t
    )
    select array_agg(id order by id) into current_ids from locked;
  else
    with locked as (
      select t.id
        from public.codes t
        join public.codes f on f.id = first_id
       where t.group_key = f.group_key
       order by t.id
         for update of t
    )
    select array_agg(id order by id) into current_ids from locked;
  end if;

  if current_ids is distinct from (select array_agg(x order by x) from unnest(p_ids) x) then
    raise exception '목록이 그사이 바뀌었습니다. 새로고침한 뒤 다시 옮겨 주세요' using errcode = '23514';
  end if;

  if p_table = 'menus' then
    update public.menus t set sort = o.sort
      from (select x.id, (x.n * 10)::integer as sort from unnest(p_ids) with ordinality as x (id, n)) o
     where t.id = o.id and t.sort <> o.sort;
  elsif p_table = 'categories' then
    update public.categories t set sort = o.sort
      from (select x.id, (x.n * 10)::integer as sort from unnest(p_ids) with ordinality as x (id, n)) o
     where t.id = o.id and t.sort <> o.sort;
  else
    update public.codes t set sort = o.sort
      from (select x.id, (x.n * 10)::integer as sort from unnest(p_ids) with ordinality as x (id, n)) o
     where t.id = o.id and t.sort <> o.sort;
  end if;
end
$function$;

REVOKE ALL ON FUNCTION "public"."reorder_rows"(text, uuid[]) FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."reorder_rows"(text, uuid[]) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."reorder_rows"(text, uuid[]) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."reorder_rows"(text, uuid[]) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."reorder_rows"(text, uuid[]) TO "service_role";
