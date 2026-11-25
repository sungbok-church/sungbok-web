SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.can_edit_department (
  p_slug public.department_slug
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select private.has_permission('departments', 'UPDATE')
     and coalesce(public.my_department_limit() = p_slug, true)
$function$;

REVOKE ALL ON TABLE "public"."newcomers" FROM "authenticated";

REVOKE ALL ("handled_at") ON TABLE "public"."newcomers" FROM "authenticated";

GRANT UPDATE ("handled_at") ON TABLE "public"."newcomers" TO "authenticated";

REVOKE ALL ("handled_by") ON TABLE "public"."newcomers" FROM "authenticated";

GRANT UPDATE ("handled_by") ON TABLE "public"."newcomers" TO "authenticated";

REVOKE ALL ("note") ON TABLE "public"."newcomers" FROM "authenticated";

GRANT UPDATE ("note") ON TABLE "public"."newcomers" TO "authenticated";

REVOKE ALL ("status") ON TABLE "public"."newcomers" FROM "authenticated";

GRANT UPDATE ("status") ON TABLE "public"."newcomers" TO "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."newcomers" TO "authenticated";
