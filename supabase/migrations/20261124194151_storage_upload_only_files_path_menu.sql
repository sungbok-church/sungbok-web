SET local check_function_bodies = off;

DROP POLICY "files_insert" ON "public"."files";

DROP POLICY "files_update" ON "public"."files";

DROP POLICY "media_delete" ON "storage"."objects";

DROP POLICY "media_update" ON "storage"."objects";

CREATE OR REPLACE FUNCTION private.file_path_in_list_menu (
  p_list_id uuid,
  p_bucket  text,
  p_path    text
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select p_bucket = 'media'
     and exists (
       select 1 from public.file_lists l join public.menus m on m.id = l.menu_id
        where l.id = p_list_id and m.key = split_part(p_path, '/', 1)
     )
$function$;

CREATE POLICY "files_insert" ON "public"."files"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((private.can_write_list(list_id) AND private.file_path_in_list_menu(list_id, bucket, path)));

CREATE POLICY "files_update" ON "public"."files"
  FOR UPDATE
  TO "authenticated"
  USING (private.can_write_list(list_id))
  WITH CHECK ((private.can_write_list(list_id) AND private.file_path_in_list_menu(list_id, bucket, path)));

REVOKE ALL ON FUNCTION "private"."file_path_in_list_menu"(uuid, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."file_path_in_list_menu"(uuid, text, text) TO "authenticated";
