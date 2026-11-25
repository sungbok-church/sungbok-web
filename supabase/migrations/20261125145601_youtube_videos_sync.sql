SET local check_function_bodies = off;

CREATE TABLE "public"."youtube_sync" (
  "page"       text                     NOT NULL,
  "synced_at"  timestamp with time zone,
  "claimed_at" timestamp with time zone,
  CONSTRAINT "youtube_sync_page_check" CHECK ((page ~ '^[a-z][a-z0-9-]*$'::text)),
  CONSTRAINT "youtube_sync_pkey" PRIMARY KEY (page)
);

ALTER TABLE "public"."youtube_sync"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."youtube_sync" FROM "anon", "authenticated";

CREATE TABLE "public"."youtube_videos" (
  "page"         text                     NOT NULL,
  "video_id"     text                     NOT NULL,
  "position"     integer                  NOT NULL,
  "title"        text                     NOT NULL,
  "description"  text                     NOT NULL DEFAULT ''::text,
  "published_at" timestamp with time zone,
  "added_at"     timestamp with time zone,
  "thumbnail"    text                     NOT NULL,
  "poster"       text                     NOT NULL,
  "synced_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "youtube_videos_page_check" CHECK ((page ~ '^[a-z][a-z0-9-]*$'::text)),
  CONSTRAINT "youtube_videos_pkey" PRIMARY KEY (page, video_id),
  CONSTRAINT "youtube_videos_video_id_check" CHECK ((video_id ~ '^[A-Za-z0-9_-]{11}$'::text))
);

ALTER TABLE "public"."youtube_videos"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_youtube_sync (
  p_page  text,
  p_every interval
)
  RETURNS boolean
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  insert into public.youtube_sync (page) values (p_page) on conflict (page) do nothing;
  update public.youtube_sync
     set claimed_at = now()
   where page = p_page
     and (synced_at is null or synced_at <= now() - p_every)
     and (claimed_at is null or claimed_at < now() - interval '2 minutes');
  return found;
end
$function$;

REVOKE ALL ON FUNCTION "public"."claim_youtube_sync"(text, interval) FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE FUNCTION public.replace_youtube_videos (
  p_page text,
  p_rows jsonb
)
  RETURNS integer
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  n integer;
  at timestamptz;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception '받은 영상이 없어 바꾸지 않습니다(%)', p_page;
  end if;
  select coalesce(s.claimed_at, now()) into at from public.youtube_sync s where s.page = p_page;
  at := coalesce(at, now());
  delete from public.youtube_videos v
   where v.page = p_page
     and not exists (select 1 from jsonb_array_elements(p_rows) r where r ->> 'video_id' = v.video_id);
  insert into public.youtube_videos
    (page, video_id, position, title, description, published_at, added_at, thumbnail, poster, synced_at)
  select p_page, r ->> 'video_id', (r ->> 'position')::integer, r ->> 'title', coalesce(r ->> 'description', ''),
         (r ->> 'published_at')::timestamptz, (r ->> 'added_at')::timestamptz, r ->> 'thumbnail', r ->> 'poster', now()
    from jsonb_array_elements(p_rows) r
  on conflict (page, video_id) do update set
    position     = excluded.position,
    title        = excluded.title,
    description  = excluded.description,
    published_at = excluded.published_at,
    added_at     = excluded.added_at,
    thumbnail    = excluded.thumbnail,
    poster       = excluded.poster,
    synced_at    = excluded.synced_at;
  get diagnostics n = row_count;
  insert into public.youtube_sync (page, synced_at) values (p_page, at)
  on conflict (page) do update set synced_at = at, claimed_at = null;
  return n;
end
$function$;

REVOKE ALL ON FUNCTION "public"."replace_youtube_videos"(text, jsonb) FROM PUBLIC, "anon", "authenticated";

CREATE INDEX youtube_videos_page_position_idx ON public.youtube_videos USING btree (page, "position");

CREATE POLICY "youtube_videos_select" ON "public"."youtube_videos"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

REVOKE ALL ON FUNCTION "public"."claim_youtube_sync"(text, interval) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."claim_youtube_sync"(text, interval) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."claim_youtube_sync"(text, interval) TO "service_role";

REVOKE ALL ON FUNCTION "public"."replace_youtube_videos"(text, jsonb) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."replace_youtube_videos"(text, jsonb) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."replace_youtube_videos"(text, jsonb) TO "service_role";

REVOKE ALL ON TABLE "public"."youtube_sync" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."youtube_sync" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."youtube_sync" TO "service_role";

REVOKE ALL ON TABLE "public"."youtube_videos" FROM "anon";

GRANT SELECT ON TABLE "public"."youtube_videos" TO "anon";

REVOKE ALL ON TABLE "public"."youtube_videos" FROM "authenticated";

GRANT SELECT ON TABLE "public"."youtube_videos" TO "authenticated";

REVOKE ALL ON TABLE "public"."youtube_videos" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."youtube_videos" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."youtube_videos" TO "service_role";
