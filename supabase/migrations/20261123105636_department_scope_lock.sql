SET local check_function_bodies = off;

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
    -- 권한 올리기 방지 ②: 꺼진 그룹을 켜는 것도 그 구성원에게 그룹의 권한을 주는 것이다 — 그 권한을 내가 모두 가졌을 때만
    -- (그룹에 넣기와 같은 조건, guard_user_groups). 끄는 것은 권한을 빼는 쪽이라 막지 않는다.
    if tg_op = 'UPDATE'
       and new.is_active and not old.is_active
       and not private.is_full_admin()
       and not private.holds_group_permissions(old.id) then
      raise exception '자기가 가진 권한보다 많은 그룹은 켤 수 없습니다' using errcode = '42501';
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

CREATE OR REPLACE FUNCTION private.guard_profiles()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  actor uuid := (select auth.uid());
  scope_dept public.department_slug;
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
  -- 부서 범위가 있으면(권한 올리기 방지 ③): 다른 사람의 부서는 내 부서로만 정하고(비우면 모든 부서 = 내 범위보다 넓다),
  -- 내 부서의 사용자만 바꾼다 — 예외 없이. 범위 밖 계정(부서가 빈 새 계정도)을 내 부서로 끌어오면 그 계정을 관리하게 되고
  -- 비밀번호를 초기화해 쥘 수 있다(다른 관리자가 막 만든 계정 · 물러난 관리자의 꺼진 계정 등). 계정 만들기(createUser)는
  -- 부서를 계정과 함께 정한다(user_metadata.department → on_auth_user_changed) — 내 부서인지는 서버가 Auth API 전에 본다.
  scope_dept := public.my_department_limit();
  if old.id <> actor and scope_dept is not null then
    if new.department is distinct from old.department and new.department is distinct from scope_dept then
      raise exception '부서는 내 담당 부서로만 정할 수 있습니다' using errcode = '42501';
    end if;
    if old.department is distinct from scope_dept then
      raise exception '내 담당 부서의 사용자만 바꿀 수 있습니다' using errcode = '42501';
    end if;
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
$function$;

CREATE OR REPLACE FUNCTION private.guard_user_groups()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
       and not private.holds_group_permissions(target_group) then
      raise exception '자기가 가진 권한보다 많은 그룹에는 넣을 수 없습니다' using errcode = '42501';
    end if;
    -- 권한 올리기 방지 ③: 부서 범위가 있으면 내 부서의 사용자만(넣기 · 빼기 모두). 새 계정은 만들 때 부서가 정해진다(createUser).
    if not private.in_my_department(target_user) then
      raise exception '내 담당 부서의 사용자만 바꿀 수 있습니다' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION private.holds_group_permissions (
  p_group uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select not exists (
    select 1
      from public.group_permissions gp
      join public.menus m on m.id = gp.menu_id
     where gp.group_id = p_group
       and not private.has_permission(m.key, gp.action)
  )
$function$;

CREATE OR REPLACE FUNCTION private.in_my_department (
  p_target uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select case
    when public.my_department_limit() is null then true
    else exists (
      select 1 from public.profiles p
       where p.id = p_target and p.department = public.my_department_limit()
    )
  end
$function$;

CREATE OR REPLACE FUNCTION private.on_auth_user_changed()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  dept text;
begin
  -- 익명 로그인은 관리자 계정이 아니다(reference.sql 의 기존 계정 채우기와 같은 기준).
  if new.is_anonymous then
    return null;
  end if;
  if tg_op = 'INSERT' then
    dept := nullif(new.raw_user_meta_data ->> 'department', '');
    if dept is not null and not (dept = any (enum_range(null::public.department_slug)::text[])) then
      raise exception '없는 부서입니다: %', dept using errcode = '22023';
    end if;
    insert into public.profiles (id, email, name, department)
    values (
      new.id,
      coalesce(new.email, ''),
      left(coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, 'user'), '@', 1)), 50),
      dept::public.department_slug
    )
    on conflict (id) do nothing;
  elsif new.email is distinct from old.email then
    update public.profiles set email = coalesce(new.email, '') where id = new.id;
  end if;
  return null;
end
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_user (
  p_target uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
           select 1 from public.user_groups ug
            where ug.user_id = p_target and not private.holds_group_permissions(ug.group_id)
         )
         and private.in_my_department(p_target)
       )
     )
$function$;

CREATE OR REPLACE FUNCTION public.my_department_limit()
  RETURNS public.department_slug
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
  select p.department
    from public.profiles p
   where p.id = (select auth.uid())
     and not private.is_full_admin()
$function$;

REVOKE ALL ON FUNCTION "public"."my_department_limit"() FROM PUBLIC, "anon";

REVOKE ALL ON FUNCTION "private"."holds_group_permissions"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."holds_group_permissions"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."in_my_department"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."my_department_limit"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."my_department_limit"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."my_department_limit"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."my_department_limit"() TO "service_role";
