SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.orphan_storage_objects (
  p_limit integer DEFAULT 1000
)
  RETURNS SETOF text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select o.name
    from storage.objects o
   where o.bucket_id = 'media'
     and o.created_at < now() - interval '24 hours'
     and not exists (select 1 from public.files f where f.bucket = o.bucket_id and f.path = o.name)
     -- 폭별 파일(부서 · 히어로 사진 — files.variants 의 [[가로, 경로], …])도 그 줄이 가리키는 파일이다
     and not exists (
       select 1 from public.files f, jsonb_array_elements(f.variants) v
        where f.bucket = o.bucket_id and f.variants is not null and v ->> 1 = o.name
     )
   order by o.created_at
   limit p_limit
$function$;

CREATE OR REPLACE FUNCTION public.save_department (
  p_slug           public.department_slug,
  p_updated_at     timestamp with time zone,
  p_ages           text,
  p_tagline        text,
  p_intro          text,
  p_extra          text,
  p_photos_list_id uuid,
  p_staff          jsonb
)
  RETURNS timestamp WITH time zone
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  dept uuid;
  saved timestamptz;
begin
  update public.departments
     set ages = p_ages, tagline = p_tagline, intro = p_intro, extra = nullif(btrim(p_extra), ''),
         photos_list_id = p_photos_list_id
   where slug = p_slug and updated_at = p_updated_at
  returning id, updated_at into dept, saved;
  if saved is null then
    return null;
  end if;
  delete from public.department_staff s
   where s.department_id = dept
     and s.id not in (
       select (e ->> 'id')::uuid from jsonb_array_elements(coalesce(p_staff, '[]')) e where e ->> 'id' is not null
     );
  update public.department_staff s
     set sort = x.ord, name = x.e ->> 'name', role_id = (x.e ->> 'role_id')::uuid,
         greeting = nullif(btrim(x.e ->> 'greeting'), ''), photo_list_id = (x.e ->> 'photo_list_id')::uuid
    from jsonb_array_elements(coalesce(p_staff, '[]')) with ordinality as x (e, ord)
   where s.department_id = dept and s.id = (x.e ->> 'id')::uuid;
  insert into public.department_staff (department_id, sort, name, role_id, greeting, photo_list_id)
  select dept, x.ord, x.e ->> 'name', (x.e ->> 'role_id')::uuid, nullif(btrim(x.e ->> 'greeting'), ''),
         (x.e ->> 'photo_list_id')::uuid
    from jsonb_array_elements(coalesce(p_staff, '[]')) with ordinality as x (e, ord)
   where x.e ->> 'id' is null;
  return saved;
end
$function$;

REVOKE ALL ON FUNCTION "public"."save_department"(public.department_slug, timestamp WITH time zone, text, text, text, text, uuid, jsonb) FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."save_department"(public.department_slug, timestamp WITH time zone, text, text, text, text, uuid, jsonb) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."save_department"(public.department_slug, timestamp WITH time zone, text, text, text, text, uuid, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."save_department"(public.department_slug, timestamp WITH time zone, text, text, text, text, uuid, jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."save_department"(public.department_slug, timestamp WITH time zone, text, text, text, text, uuid, jsonb) TO "service_role";
