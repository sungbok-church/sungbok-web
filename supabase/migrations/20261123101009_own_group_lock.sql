SET local check_function_bodies = off;

DROP TRIGGER "guard" ON "public"."group_permissions";

CREATE OR REPLACE FUNCTION private.guard_group_permissions()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  m record;
begin
  if (select auth.uid()) is not null
     and ((tg_op <> 'INSERT' and private.is_my_group(old.group_id))
          or (tg_op <> 'DELETE' and private.is_my_group(new.group_id)))
     and not private.is_full_admin() then
    raise exception '내가 속한 그룹의 권한은 «전체 관리» 만 바꿉니다' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
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
$function$;

CREATE OR REPLACE FUNCTION private.guard_groups()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
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
    -- 내가 속한 그룹은 끄거나 켜지 못한다(«전체 관리» 는 예외) — 끄고 켜는 것도 내 권한을 바꾸는 것이다. 이름 · 설명은 된다.
    if tg_op = 'UPDATE'
       and new.is_active is distinct from old.is_active
       and private.is_my_group(old.id)
       and not private.is_full_admin() then
      raise exception '내가 속한 그룹의 권한은 «전체 관리» 만 바꿉니다' using errcode = '42501';
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
$function$;

CREATE OR REPLACE FUNCTION private.is_my_group (
  p_group uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.user_groups ug
     where ug.user_id = (select auth.uid()) and ug.group_id = p_group
  )
$function$;

CREATE TRIGGER guard
  BEFORE INSERT OR DELETE OR UPDATE ON public.group_permissions
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_group_permissions();

REVOKE ALL ON FUNCTION "private"."is_my_group"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."is_my_group"(uuid) TO "authenticated";
