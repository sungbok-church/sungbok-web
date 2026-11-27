SET local check_function_bodies = off;

DROP POLICY "audit_log_select" ON "public"."audit_log";

DROP INDEX "public"."audit_log_actor_idx";

DROP INDEX "public"."audit_log_at_brin";

CREATE OR REPLACE FUNCTION public.actor_names (
  p_ids uuid[]
)
  RETURNS TABLE (
    id   uuid,
    name text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select p.id, p.name
    from public.profiles p
   where p.id = any (p_ids)
     and exists (
       select 1 from public.my_permissions() mp where mp.action = 'HISTORY'
     )
$function$;

CREATE OR REPLACE FUNCTION public.storage_usage()
  RETURNS bigint
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  -- numeric 으로 더한다 — 크기가 소수 표기여도 함수 전체가 실패하지 않게(Storage API 는 정수를 쓴다)
  select coalesce(sum((o.metadata ->> 'size')::numeric), 0)::bigint
    from storage.objects o
   where o.bucket_id = 'media'
$function$;

REVOKE ALL ON FUNCTION "public"."storage_usage"() FROM PUBLIC, "anon";

CREATE POLICY "audit_log_select" ON "public"."audit_log"
  FOR SELECT
  TO "authenticated"
  USING (private.can_read_history(table_name, row_id, parent_table, parent_id));

GRANT EXECUTE ON FUNCTION "public"."storage_usage"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."storage_usage"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."storage_usage"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."storage_usage"() TO "service_role";
