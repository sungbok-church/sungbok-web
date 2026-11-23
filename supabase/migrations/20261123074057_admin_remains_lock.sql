SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.ensure_admin_remains()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;
