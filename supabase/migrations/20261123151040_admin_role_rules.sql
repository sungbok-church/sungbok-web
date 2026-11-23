SET local check_function_bodies = off;

DROP FUNCTION "private"."holds_group_permissions"(uuid);

CREATE OR REPLACE FUNCTION private.guard_group_permissions()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  m record;
begin
  if (select auth.uid()) is not null and not private.is_full_admin() then
    raise exception '그룹 권한은 «전체 관리» 만 바꿉니다' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  select key, actions, area into m from public.menus where id = new.menu_id;
  if m.area <> 'ADMIN' or not (new.action = any (m.actions)) then
    raise exception '메뉴 «%» 에는 «%» 기능이 없습니다', m.key, new.action using errcode = '23514';
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
    if not private.is_full_admin() then
      raise exception '그룹은 «전체 관리» 만 만들고 고칩니다' using errcode = '42501';
    end if;
    if tg_op = 'INSERT' and (new.key is not null or new.is_system) then
      raise exception '그룹 key 와 시스템 여부는 변경 파일로만 정합니다' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and (new.key is distinct from old.key or new.is_system is distinct from old.is_system) then
      raise exception '그룹 key 와 시스템 여부는 변경 파일로만 정합니다' using errcode = '42501';
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
  -- 권한 올리기 방지 ②: 다른 사람의 정보(이름 · 부서 · 끄기 · 켜기 · 비밀번호 바꾸기 표시)는 그 계정을 관리할 수 있을 때만 —
  -- 비밀번호 초기화와 같은 기준(can_manage_user: 대상의 그룹이 모두 내 그룹이고 내 부서 범위 안). 꺼진 남의 그룹 사람을 켜면
  -- 그 그룹의 권한이 되살아난다. save_user 는 사용자 정보를 그룹보다 먼저 고치므로 이때 대상의 그룹은 아직 화면을 열었을 때의
  -- 그룹이다(그룹 없는 새 계정도 관리할 수 있다 — 그 뒤 그룹 넣고 빼기도 guard_user_groups 가 같은 기준으로 본다).
  if old.id <> actor and not private.is_full_admin() and not public.can_manage_user(old.id) then
    raise exception '내가 속하지 않은 그룹의 사용자는 «전체 관리» 만 바꿉니다' using errcode = '42501';
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
    -- «전체 관리» 소속은 화면(로그인한 세션)에서 아무도 — «전체 관리» 도 — 바꾸지 못한다. «전체 관리» 계정을 빼앗겨도 새 «전체 관리» 를
    -- 만들거나 다른 «전체 관리» 를 빼내지 못하게. 운영자가 대시보드 SQL 편집기(사람 없는 변경)로만 바꾼다(deploy-and-env.md).
    if exists (select 1 from public.groups g where g.id = target_group and g.is_system) then
      raise exception '«전체 관리» 소속은 화면에서 바꿀 수 없습니다' using errcode = '42501';
    end if;
    if target_user = actor then
      raise exception '자기 그룹은 바꿀 수 없습니다' using errcode = '42501';
    end if;
    if not private.is_full_admin() then
      -- 권한 올리기 방지 ②: 그룹에 넣는 것도 권한을 주는 것이다 — 내가 속한 그룹(내가 가진 권한)에만. 빼는 것도 내 그룹에서만.
      if not private.is_my_group(target_group) then
        raise exception '내가 속한 그룹에만 넣고 뺄 수 있습니다' using errcode = '42501';
      end if;
      -- 권한 올리기 방지 ③: 부서 범위가 있으면 내 부서의 사용자만(넣기 · 빼기 모두). 새 계정은 만들 때 부서가 정해진다(createUser).
      if not private.in_my_department(target_user) then
        raise exception '내 담당 부서의 사용자만 바꿀 수 있습니다' using errcode = '42501';
      end if;
      -- 권한 올리기 방지 ②: 대상이 남의 그룹에도 속하면(관리할 수 없는 사람) 내 그룹이라도 넣고 빼지 못한다 — 빼면 그 사람의
      -- 권한을 깎고, 넣으면 내가 관리하지 못하는 계정의 권한을 바꾼다. BEFORE 트리거라 이 줄은 아직 반영되지 않았다 — 바꾸기 전
      -- 소속으로 본다(넣기: 아직 없음 · 빼기: 아직 있음 — 둘 다 내 그룹이라 관리할 수 있는 사람은 그대로 관리할 수 있다).
      -- 그룹 없는 새 계정(createUser)은 관리할 수 있고, save_user 는 사용자 정보를 먼저 고친 뒤 한 줄씩 넣고 빼므로
      -- 줄마다 대상의 그룹은 여전히 모두 내 그룹이다.
      if not public.can_manage_user(target_user) then
        raise exception '내가 속하지 않은 그룹의 사용자는 «전체 관리» 만 바꿉니다' using errcode = '42501';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
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
            where ug.user_id = p_target and (g.is_system or not private.is_my_group(g.id))
         )
         and private.in_my_department(p_target)
       )
     )
$function$;

CREATE OR REPLACE FUNCTION public.save_user (
  p_id             uuid,
  p_updated_at     timestamp with time zone,
  p_name           text,
  p_department     public.department_slug,
  p_is_active      boolean,
  p_group_ids      uuid[],
  p_seen_group_ids uuid[]
)
  RETURNS timestamp WITH time zone
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
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
  -- «전체 관리» 소속은 목록에 없어도 지우지 않는다(화면에서 바꾸지 않는다 — 넣으려 하면 guard_user_groups 가 막는다)
  delete from public.user_groups ug
   where ug.user_id = p_id and ug.group_id <> all (coalesce(p_group_ids, '{}'))
     and not exists (select 1 from public.groups g where g.id = ug.group_id and g.is_system);
  insert into public.user_groups (user_id, group_id)
  select distinct p_id, g
    from unnest(coalesce(p_group_ids, '{}')) g
   where not exists (select 1 from public.user_groups ug where ug.user_id = p_id and ug.group_id = g);
  return saved;
end
$function$;
