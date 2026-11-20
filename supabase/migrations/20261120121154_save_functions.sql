SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_group (
  p_name        text,
  p_description text,
  p_permissions text[]
)
  RETURNS uuid
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION "public"."create_group"(text, text, text[]) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.save_group (
  p_id               uuid,
  p_updated_at       timestamp with time zone,
  p_name             text,
  p_description      text,
  p_is_active        boolean,
  p_permissions      text[],
  p_seen_permissions text[]
)
  RETURNS timestamp WITH time zone
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION "public"."save_group"(uuid, timestamp WITH time zone, text, text, boolean, text[], text[]) FROM PUBLIC, "anon";

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
  delete from public.user_groups
   where user_id = p_id and group_id <> all (coalesce(p_group_ids, '{}'));
  insert into public.user_groups (user_id, group_id)
  select distinct p_id, g
    from unnest(coalesce(p_group_ids, '{}')) g
   where not exists (select 1 from public.user_groups ug where ug.user_id = p_id and ug.group_id = g);
  return saved;
end
$function$;

REVOKE ALL ON FUNCTION "public"."save_user"(uuid, timestamp WITH time zone, text, public.department_slug, boolean, uuid[], uuid[]) FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."create_group"(text, text, text[]) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."create_group"(text, text, text[]) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_group"(text, text, text[]) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."create_group"(text, text, text[]) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."save_group"(uuid, timestamp WITH time zone, text, text, boolean, text[], text[]) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."save_group"(uuid, timestamp WITH time zone, text, text, boolean, text[], text[]) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."save_group"(uuid, timestamp WITH time zone, text, text, boolean, text[], text[]) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."save_group"(uuid, timestamp WITH time zone, text, text, boolean, text[], text[]) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."save_user"(uuid, timestamp WITH time zone, text, public.department_slug, boolean, uuid[], uuid[]) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."save_user"(uuid, timestamp WITH time zone, text, public.department_slug, boolean, uuid[], uuid[]) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."save_user"(uuid, timestamp WITH time zone, text, public.department_slug, boolean, uuid[], uuid[]) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."save_user"(uuid, timestamp WITH time zone, text, public.department_slug, boolean, uuid[], uuid[]) TO "service_role";
