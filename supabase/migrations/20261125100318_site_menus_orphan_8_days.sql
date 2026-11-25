SET local check_function_bodies = off;

DROP VIEW "private"."orphan_file_lists";

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
     and o.created_at < now() - interval '8 days'
     and not exists (select 1 from public.files f where f.bucket = o.bucket_id and f.path = o.name)
     -- 폭별 파일(부서 · 히어로 사진 — files.variants 의 [[가로, 경로], …])도 그 줄이 가리키는 파일이다
     and not exists (
       select 1 from public.files f, jsonb_array_elements(f.variants) v
        where f.bucket = o.bucket_id and f.variants is not null and v ->> 1 = o.name
     )
   order by o.created_at
   limit p_limit
$function$;

CREATE OR REPLACE FUNCTION public.purge_expired()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  result jsonb := '{}';
  n integer;
begin
  -- 휴지통 30일
  delete from public.bulletins where deleted_at < now() - interval '30 days';
  get diagnostics n = row_count; result := result || jsonb_build_object('bulletins', n);
  delete from public.news_videos where deleted_at < now() - interval '30 days';
  get diagnostics n = row_count; result := result || jsonb_build_object('news_videos', n);
  delete from public.albums where deleted_at < now() - interval '30 days';
  get diagnostics n = row_count; result := result || jsonb_build_object('albums', n);
  delete from public.resources where deleted_at < now() - interval '30 days';
  get diagnostics n = row_count; result := result || jsonb_build_object('resources', n);
  -- 새가족 접수 1년
  delete from public.newcomers where created_at < now() - interval '1 year';
  get diagnostics n = row_count; result := result || jsonb_build_object('newcomers', n);
  -- 횟수 제한 기록 하루
  delete from public.submission_attempts where at < now() - interval '1 day';
  get diagnostics n = row_count; result := result || jsonb_build_object('submission_attempts', n);
  -- 어느 글에도 붙지 않은, 만든 지 8일 넘은 묶음(파일 행은 함께 지워진다). 휴지통에서 지운 글의 묶음도 여기서 정리된다.
  delete from public.file_lists where id in (select id from private.orphan_file_lists);
  get diagnostics n = row_count; result := result || jsonb_build_object('file_lists', n);
  return result;
end
$function$;

ALTER TABLE "public"."menus"
  ADD CONSTRAINT "menus_check3" CHECK (((area = 'ADMIN'::public.menu_area) OR (char_length(label) <=
CASE
    WHEN (parent_id IS NULL) THEN 8
    ELSE 20
END)));

CREATE VIEW "private"."orphan_file_lists" AS  SELECT id,
    menu_id,
    created_at
   FROM public.file_lists l
  WHERE ((created_at < (now() - '8 days'::interval)) AND (NOT (EXISTS ( SELECT 1
           FROM private.file_list_owners o
          WHERE (o.list_id = l.id)))));
