SET local check_function_bodies = off;

CREATE SCHEMA "private";

CREATE SEQUENCE "public"."albums_slug_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1000 CACHE 1 NO CYCLE;

REVOKE ALL ON SEQUENCE "public"."albums_slug_seq" FROM "anon";

CREATE SEQUENCE "public"."resources_slug_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

REVOKE ALL ON SEQUENCE "public"."resources_slug_seq" FROM "anon";

CREATE TABLE "public"."albums" (
  "slug"           text NOT NULL DEFAULT (nextval('public.albums_slug_seq'::regclass))::text,
  "title"          text NOT NULL,
  "category_group" text NOT NULL DEFAULT 'ALBUM_CATEGORY'::text,
  "category_id"    uuid NOT NULL,
  "images_list_id" uuid NOT NULL,
  CONSTRAINT "albums_category_group_check" CHECK ((category_group = 'ALBUM_CATEGORY'::text)),
  CONSTRAINT "albums_images_list_id_key" UNIQUE (images_list_id),
  CONSTRAINT "albums_slug_check" CHECK ((slug ~ '^[0-9]+$'::text)),
  CONSTRAINT "albums_title_check" CHECK (((char_length(title) >= 1) AND (char_length(title) <= 200)))
);

ALTER TABLE "public"."albums"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."audit_log" (
  "id"           bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "table_name"   text   NOT NULL,
  "row_id"       uuid,
  "parent_table" text,
  "parent_id"    uuid,
  CONSTRAINT "audit_log_check" CHECK (((parent_table IS NULL) = (parent_id IS NULL))),
  CONSTRAINT "audit_log_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."audit_log"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."audit_log" FROM "anon";

CREATE TABLE "public"."bulletins" (
  "date"          date NOT NULL,
  "pages_list_id" uuid NOT NULL,
  CONSTRAINT "bulletins_pages_list_id_key" UNIQUE (pages_list_id)
);

ALTER TABLE "public"."bulletins"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."categories" (
  "group_key"  text                     NOT NULL,
  "slug"       text                     NOT NULL,
  "label"      text                     NOT NULL,
  "sort"       integer                  NOT NULL DEFAULT 0,
  "is_active"  boolean                  NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "categories_group_key_label_key" UNIQUE (group_key, label),
  CONSTRAINT "categories_group_key_slug_key" UNIQUE (group_key, slug),
  CONSTRAINT "categories_label_check" CHECK (((char_length(label) >= 1) AND (char_length(label) <= 50))),
  CONSTRAINT "categories_slug_check" CHECK (((slug ~ '^[a-z0-9][a-z0-9-]*$'::text) AND (char_length(slug) <= 50)))
);

ALTER TABLE "public"."categories"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."category_groups" (
  "key"  text    NOT NULL,
  "name" text    NOT NULL,
  "sort" integer NOT NULL DEFAULT 0,
  CONSTRAINT "category_groups_key_check" CHECK ((key ~ '^[A-Z][A-Z0-9_]*$'::text)),
  CONSTRAINT "category_groups_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 50))),
  CONSTRAINT "category_groups_pkey" PRIMARY KEY (key)
);

ALTER TABLE "public"."category_groups"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."code_groups" (
  "key"         text    NOT NULL,
  "name"        text    NOT NULL,
  "description" text,
  "is_locked"   boolean NOT NULL DEFAULT false,
  "sort"        integer NOT NULL DEFAULT 0,
  CONSTRAINT "code_groups_description_check" CHECK ((char_length(description) <= 200)),
  CONSTRAINT "code_groups_key_check" CHECK ((key ~ '^[A-Z][A-Z0-9_]*$'::text)),
  CONSTRAINT "code_groups_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 50))),
  CONSTRAINT "code_groups_pkey" PRIMARY KEY (key)
);

ALTER TABLE "public"."code_groups"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."codes" (
  "group_key"  text                     NOT NULL,
  "code"       text                     NOT NULL,
  "label"      text                     NOT NULL,
  "sort"       integer                  NOT NULL DEFAULT 0,
  "is_active"  boolean                  NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "codes_code_check" CHECK (((code ~ '^[A-Z][A-Z0-9_]*$'::text) AND (char_length(code) <= 50))),
  CONSTRAINT "codes_group_key_code_key" UNIQUE (group_key, code),
  CONSTRAINT "codes_group_key_label_key" UNIQUE (group_key, label),
  CONSTRAINT "codes_label_check" CHECK (((char_length(label) >= 1) AND (char_length(label) <= 50)))
);

ALTER TABLE "public"."codes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."department_staff" (
  "department_id" uuid                     NOT NULL,
  "sort"          integer                  NOT NULL,
  "name"          text                     NOT NULL,
  "role_group"    text                     NOT NULL DEFAULT 'STAFF_ROLE'::text,
  "role_id"       uuid                     NOT NULL,
  "greeting"      text,
  "photo_list_id" uuid,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"    uuid,
  "updated_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "updated_by"    uuid,
  CONSTRAINT "department_staff_greeting_check" CHECK ((char_length(greeting) <= 1000)),
  CONSTRAINT "department_staff_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 50))),
  CONSTRAINT "department_staff_photo_list_id_key" UNIQUE (photo_list_id),
  CONSTRAINT "department_staff_role_group_check" CHECK ((role_group = 'STAFF_ROLE'::text)),
  CONSTRAINT "department_staff_sort_key" UNIQUE (department_id, sort) DEFERRABLE INITIALLY DEFERRED
);

ALTER TABLE "public"."department_staff"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."departments" ();

ALTER TABLE "public"."departments"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."file_lists" (
  "menu_id"    uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid
);

ALTER TABLE "public"."file_lists"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."files" (
  "list_id" uuid    NOT NULL,
  "sort"    integer NOT NULL,
  "bucket"  text    NOT NULL,
  "path"    text    NOT NULL,
  CONSTRAINT "files_list_sort_key" UNIQUE (list_id, sort) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT "files_path_check" CHECK ((path !~ '(^/|\.\.)'::text))
);

ALTER TABLE "public"."files"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."group_permissions" (
  "group_id" uuid NOT NULL,
  "menu_id"  uuid NOT NULL
);

ALTER TABLE "public"."group_permissions"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."group_permissions" FROM "anon";

CREATE TABLE "public"."groups" (
  "key"         text,
  "name"        text                     NOT NULL,
  "description" text,
  "is_system"   boolean                  NOT NULL DEFAULT false,
  "is_active"   boolean                  NOT NULL DEFAULT true,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"  uuid,
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_by"  uuid,
  CONSTRAINT "groups_check" CHECK (((NOT is_system) OR (is_active AND (key IS NOT NULL)))),
  CONSTRAINT "groups_description_check" CHECK ((char_length(description) <= 200)),
  CONSTRAINT "groups_key_check" CHECK ((key ~ '^[a-z][a-z0-9-]*$'::text)),
  CONSTRAINT "groups_key_key" UNIQUE (key),
  CONSTRAINT "groups_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 50))),
  CONSTRAINT "groups_name_key" UNIQUE (name)
);

ALTER TABLE "public"."groups"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."groups" FROM "anon";

CREATE TABLE "public"."home_hero" (
  "singleton" boolean NOT NULL DEFAULT true,
  CONSTRAINT "home_hero_singleton_check" CHECK (singleton),
  CONSTRAINT "home_hero_singleton_key" UNIQUE (singleton)
);

ALTER TABLE "public"."home_hero"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."menus" ();

ALTER TABLE "public"."menus"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."newcomers" ();

ALTER TABLE "public"."newcomers"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."newcomers" FROM "anon";

CREATE TABLE "public"."news_videos" ();

ALTER TABLE "public"."news_videos"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"    uuid NOT NULL,
  "email" text NOT NULL,
  "name"  text NOT NULL,
  CONSTRAINT "profiles_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 50))),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."profiles" FROM "anon";

CREATE TABLE "public"."resource_videos" (
  "resource_id" uuid                     NOT NULL,
  "video_id"    text                     NOT NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "created_by"  uuid,
  CONSTRAINT "resource_videos_pkey" PRIMARY KEY (resource_id, video_id),
  CONSTRAINT "resource_videos_video_id_check" CHECK ((video_id ~ '^[A-Za-z0-9_-]{11}$'::text))
);

ALTER TABLE "public"."resource_videos"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."resources" (
  "slug" text NOT NULL DEFAULT (nextval('public.resources_slug_seq'::regclass))::text,
  CONSTRAINT "resources_slug_check" CHECK ((slug ~ '^([0-9]{4}-)?[0-9]+$'::text))
);

ALTER TABLE "public"."resources"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."submission_attempts" (
  "id"       bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "key_hash" text                     NOT NULL,
  "at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "submission_attempts_key_hash_check" CHECK (((char_length(key_hash) >= 16) AND (char_length(key_hash) <= 128))),
  CONSTRAINT "submission_attempts_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."submission_attempts"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."submission_attempts" FROM "anon", "authenticated";

CREATE TABLE "public"."user_groups" (
  "user_id"    uuid                     NOT NULL,
  "group_id"   uuid                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by" uuid,
  CONSTRAINT "user_groups_pkey" PRIMARY KEY (user_id, group_id)
);

ALTER TABLE "public"."user_groups"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."user_groups" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."audit_log_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."audit_log_id_seq" FROM "authenticated";

REVOKE ALL ON SEQUENCE "public"."submission_attempts_id_seq" FROM "anon";

REVOKE ALL ON SEQUENCE "public"."submission_attempts_id_seq" FROM "authenticated";

ALTER TYPE "public"."audit_action" RENAME TO "audit_action__pgdelta_replaced";

CREATE TYPE "public"."audit_action" AS ENUM (
  'INSERT',
  'UPDATE',
  'DELETE',
  'EXPORT'
);

DROP TYPE "public"."audit_action__pgdelta_replaced";

ALTER TABLE "public"."audit_log"
  ADD COLUMN "action" public.audit_action NOT NULL;

ALTER TABLE "public"."audit_log"
  ADD COLUMN "at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."audit_log"
  ADD COLUMN "changes" jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TYPE "public"."content_status" RENAME TO "content_status__pgdelta_replaced";

CREATE TYPE "public"."content_status" AS ENUM (
  'DRAFT',
  'PUBLISHED'
);

DROP TYPE "public"."content_status__pgdelta_replaced";

ALTER TABLE "public"."albums"
  ADD COLUMN "status" public.content_status NOT NULL DEFAULT 'DRAFT'::public.content_status;

ALTER TABLE "public"."albums"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."albums"
  ADD COLUMN "created_by" uuid;

ALTER TABLE "public"."albums"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."albums"
  ADD COLUMN "updated_by" uuid;

ALTER TABLE "public"."albums"
  ADD COLUMN "deleted_at" timestamp WITH time zone;

ALTER TABLE "public"."albums"
  ADD COLUMN "deleted_by" uuid;

ALTER TABLE "public"."bulletins"
  ADD COLUMN "status" public.content_status NOT NULL DEFAULT 'DRAFT'::public.content_status;

ALTER TABLE "public"."bulletins"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."bulletins"
  ADD COLUMN "created_by" uuid;

ALTER TABLE "public"."bulletins"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."bulletins"
  ADD COLUMN "updated_by" uuid;

ALTER TABLE "public"."bulletins"
  ADD COLUMN "deleted_at" timestamp WITH time zone;

ALTER TABLE "public"."bulletins"
  ADD COLUMN "deleted_by" uuid;

ALTER TYPE "public"."date_source" RENAME TO "date_source__pgdelta_replaced";

CREATE TYPE "public"."date_source" AS ENUM (
  'EVENT',
  'UPLOAD'
);

DROP TYPE "public"."date_source__pgdelta_replaced";

ALTER TYPE "public"."department_slug" RENAME TO "department_slug__pgdelta_replaced";

CREATE TYPE "public"."department_slug" AS ENUM (
  'INFANT',
  'KINDERGARTEN',
  'LOWER_ELEMENTARY',
  'ELEMENTARY',
  'MIDDLE',
  'HIGH',
  'YOUNG_ADULT',
  'ENGLISH'
);

DROP TYPE "public"."department_slug__pgdelta_replaced";

ALTER TABLE "public"."departments"
  ADD COLUMN "slug" public.department_slug NOT NULL;

ALTER TABLE "public"."departments"
  ADD COLUMN "ages" text NOT NULL;

ALTER TABLE "public"."departments"
  ADD COLUMN "tagline" text NOT NULL;

ALTER TABLE "public"."departments"
  ADD COLUMN "intro" text NOT NULL;

ALTER TABLE "public"."departments"
  ADD COLUMN "extra" text;

ALTER TABLE "public"."departments"
  ADD COLUMN "photos_list_id" uuid NOT NULL;

ALTER TABLE "public"."departments"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."departments"
  ADD COLUMN "created_by" uuid;

ALTER TABLE "public"."departments"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."departments"
  ADD COLUMN "updated_by" uuid;

ALTER TABLE "public"."profiles"
  ADD COLUMN "department" public.department_slug;

ALTER TABLE "public"."profiles"
  ADD COLUMN "is_active" boolean NOT NULL DEFAULT true;

ALTER TABLE "public"."profiles"
  ADD COLUMN "must_change_password" boolean NOT NULL DEFAULT true;

ALTER TABLE "public"."profiles"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."profiles"
  ADD COLUMN "created_by" uuid;

ALTER TABLE "public"."profiles"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."profiles"
  ADD COLUMN "updated_by" uuid;

ALTER TYPE "public"."file_kind" RENAME TO "file_kind__pgdelta_replaced";

CREATE TYPE "public"."file_kind" AS ENUM (
  'IMAGE',
  'PDF',
  'HWP'
);

DROP TYPE "public"."file_kind__pgdelta_replaced";

ALTER TABLE "public"."files"
  ADD COLUMN "kind" public.file_kind NOT NULL;

ALTER TABLE "public"."files"
  ADD COLUMN "width" integer;

ALTER TABLE "public"."files"
  ADD COLUMN "height" integer;

ALTER TABLE "public"."files"
  ADD COLUMN "bytes" bigint NOT NULL;

ALTER TABLE "public"."files"
  ADD COLUMN "original_name" text NOT NULL;

ALTER TABLE "public"."files"
  ADD COLUMN "alt" text;

ALTER TABLE "public"."files"
  ADD COLUMN "variants" jsonb;

ALTER TABLE "public"."files"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."files"
  ADD COLUMN "created_by" uuid;

ALTER TABLE "public"."files"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."files"
  ADD COLUMN "updated_by" uuid;

ALTER TYPE "public"."hero_media_kind" RENAME TO "hero_media_kind__pgdelta_replaced";

CREATE TYPE "public"."hero_media_kind" AS ENUM (
  'PHOTO',
  'YOUTUBE'
);

DROP TYPE "public"."hero_media_kind__pgdelta_replaced";

ALTER TABLE "public"."home_hero"
  ADD COLUMN "kind" public.hero_media_kind NOT NULL DEFAULT 'PHOTO'::public.hero_media_kind;

ALTER TABLE "public"."home_hero"
  ADD COLUMN "photo_list_id" uuid NOT NULL;

ALTER TABLE "public"."home_hero"
  ADD COLUMN "youtube_video_id" text;

ALTER TABLE "public"."home_hero"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."home_hero"
  ADD COLUMN "created_by" uuid;

ALTER TABLE "public"."home_hero"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."home_hero"
  ADD COLUMN "updated_by" uuid;

ALTER TYPE "public"."menu_area" RENAME TO "menu_area__pgdelta_replaced";

CREATE TYPE "public"."menu_area" AS ENUM (
  'ADMIN',
  'SITE'
);

DROP TYPE "public"."menu_area__pgdelta_replaced";

ALTER TABLE "public"."menus"
  ADD COLUMN "area" public.menu_area NOT NULL;

ALTER TABLE "public"."menus"
  ADD COLUMN "key" text NOT NULL;

ALTER TABLE "public"."menus"
  ADD COLUMN "parent_id" uuid;

ALTER TABLE "public"."menus"
  ADD COLUMN "default_label" text NOT NULL;

ALTER TABLE "public"."menus"
  ADD COLUMN "label" text;

ALTER TABLE "public"."menus"
  ADD COLUMN "path" text;

ALTER TABLE "public"."menus"
  ADD COLUMN "sort" integer NOT NULL DEFAULT 0;

ALTER TABLE "public"."menus"
  ADD COLUMN "is_active" boolean NOT NULL DEFAULT true;

ALTER TABLE "public"."menus"
  ADD COLUMN "is_locked" boolean NOT NULL DEFAULT false;

ALTER TYPE "public"."newcomer_intent" RENAME TO "newcomer_intent__pgdelta_replaced";

CREATE TYPE "public"."newcomer_intent" AS ENUM (
  'REGISTER',
  'INQUIRY'
);

DROP TYPE "public"."newcomer_intent__pgdelta_replaced";

ALTER TABLE "public"."newcomers"
  ADD COLUMN "intent" public.newcomer_intent NOT NULL;

ALTER TABLE "public"."newcomers"
  ADD COLUMN "name" text NOT NULL;

ALTER TABLE "public"."newcomers"
  ADD COLUMN "phone" text NOT NULL;

ALTER TABLE "public"."newcomers"
  ADD COLUMN "visit_date" date;

ALTER TABLE "public"."newcomers"
  ADD COLUMN "message" text;

ALTER TABLE "public"."newcomers"
  ADD COLUMN "consent_at" timestamp WITH time zone NOT NULL;

ALTER TABLE "public"."newcomers"
  ADD COLUMN "consent_version" text NOT NULL;

ALTER TYPE "public"."newcomer_status" RENAME TO "newcomer_status__pgdelta_replaced";

CREATE TYPE "public"."newcomer_status" AS ENUM (
  'NEW',
  'CONTACTED',
  'DONE'
);

DROP TYPE "public"."newcomer_status__pgdelta_replaced";

ALTER TABLE "public"."newcomers"
  ADD COLUMN "status" public.newcomer_status NOT NULL DEFAULT 'NEW'::public.newcomer_status;

ALTER TABLE "public"."newcomers"
  ADD COLUMN "handled_by" uuid;

ALTER TABLE "public"."newcomers"
  ADD COLUMN "handled_at" timestamp WITH time zone;

ALTER TABLE "public"."newcomers"
  ADD COLUMN "note" text;

ALTER TABLE "public"."newcomers"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."newcomers"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."newcomers"
  ADD COLUMN "updated_by" uuid;

ALTER TYPE "public"."news_feed" RENAME TO "news_feed__pgdelta_replaced";

CREATE TYPE "public"."news_feed" AS ENUM (
  'ANNOUNCEMENTS',
  'GARDEN'
);

DROP TYPE "public"."news_feed__pgdelta_replaced";

ALTER TABLE "public"."news_videos"
  ADD COLUMN "feed" public.news_feed NOT NULL;

ALTER TABLE "public"."news_videos"
  ADD COLUMN "title" text NOT NULL;

ALTER TABLE "public"."news_videos"
  ADD COLUMN "category_group" text GENERATED ALWAYS AS (
CASE feed
    WHEN 'ANNOUNCEMENTS'::public.news_feed THEN 'ANNOUNCEMENTS_CATEGORY'::text
    ELSE 'GARDEN_CATEGORY'::text
END) STORED NOT NULL;

ALTER TABLE "public"."news_videos"
  ADD COLUMN "category_id" uuid NOT NULL;

ALTER TABLE "public"."news_videos"
  ADD COLUMN "date" date NOT NULL;

ALTER TABLE "public"."news_videos"
  ADD COLUMN "date_from" public.date_source NOT NULL DEFAULT 'EVENT'::public.date_source;

ALTER TABLE "public"."news_videos"
  ADD COLUMN "video_id" text;

ALTER TABLE "public"."news_videos"
  ADD COLUMN "thumbnail" text;

ALTER TABLE "public"."news_videos"
  ADD COLUMN "poster" text;

ALTER TABLE "public"."news_videos"
  ADD COLUMN "description" text;

ALTER TABLE "public"."news_videos"
  ADD COLUMN "status" public.content_status NOT NULL DEFAULT 'DRAFT'::public.content_status;

ALTER TABLE "public"."news_videos"
  ADD COLUMN "legacy_id" text;

ALTER TABLE "public"."news_videos"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."news_videos"
  ADD COLUMN "created_by" uuid;

ALTER TABLE "public"."news_videos"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."news_videos"
  ADD COLUMN "updated_by" uuid;

ALTER TABLE "public"."news_videos"
  ADD COLUMN "deleted_at" timestamp WITH time zone;

ALTER TABLE "public"."news_videos"
  ADD COLUMN "deleted_by" uuid;

ALTER TYPE "public"."permission_action" RENAME TO "permission_action__pgdelta_replaced";

CREATE TYPE "public"."permission_action" AS ENUM (
  'READ',
  'CREATE',
  'UPDATE',
  'DELETE',
  'PURGE',
  'EXPORT',
  'HISTORY'
);

DROP TYPE "public"."permission_action__pgdelta_replaced";

ALTER TABLE "public"."group_permissions"
  ADD COLUMN "action" public.permission_action NOT NULL;

ALTER TABLE "public"."group_permissions"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."group_permissions"
  ADD COLUMN "created_by" uuid;

ALTER TABLE "public"."menus"
  ADD COLUMN "actions" public.permission_action[] NOT NULL DEFAULT '{}'::public.permission_action[];

ALTER TABLE "public"."menus"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."menus"
  ADD COLUMN "created_by" uuid;

ALTER TABLE "public"."menus"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."menus"
  ADD COLUMN "updated_by" uuid;

ALTER TYPE "public"."resource_section" RENAME TO "resource_section__pgdelta_replaced";

CREATE TYPE "public"."resource_section" AS ENUM (
  'SUNDAY',
  'SERIES',
  'SEASONAL'
);

DROP TYPE "public"."resource_section__pgdelta_replaced";

ALTER TABLE "public"."resources"
  ADD COLUMN "section" public.resource_section NOT NULL;

ALTER TABLE "public"."resources"
  ADD COLUMN "series_group" text GENERATED ALWAYS AS (
CASE section
    WHEN 'SUNDAY'::public.resource_section THEN 'RESOURCE_SUNDAY'::text
    WHEN 'SERIES'::public.resource_section THEN 'RESOURCE_SERIES'::text
    ELSE 'RESOURCE_SEASONAL'::text
END) STORED NOT NULL;

ALTER TABLE "public"."resources"
  ADD COLUMN "series_id" uuid NOT NULL;

ALTER TABLE "public"."resources"
  ADD COLUMN "episode" integer;

ALTER TABLE "public"."resources"
  ADD COLUMN "title" text NOT NULL;

ALTER TABLE "public"."resources"
  ADD COLUMN "date" date;

ALTER TABLE "public"."resources"
  ADD COLUMN "year" smallint;

ALTER TABLE "public"."resources"
  ADD COLUMN "passage" text;

ALTER TABLE "public"."resources"
  ADD COLUMN "file_list_id" uuid;

ALTER TABLE "public"."resources"
  ADD COLUMN "pages_list_id" uuid NOT NULL;

ALTER TABLE "public"."resources"
  ADD COLUMN "status" public.content_status NOT NULL DEFAULT 'DRAFT'::public.content_status;

ALTER TABLE "public"."resources"
  ADD COLUMN "created_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."resources"
  ADD COLUMN "created_by" uuid;

ALTER TABLE "public"."resources"
  ADD COLUMN "updated_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."resources"
  ADD COLUMN "updated_by" uuid;

ALTER TABLE "public"."resources"
  ADD COLUMN "deleted_at" timestamp WITH time zone;

ALTER TABLE "public"."resources"
  ADD COLUMN "deleted_by" uuid;

CREATE OR REPLACE FUNCTION private.audit_row()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  rec jsonb := coalesce(n, o);
  skip text[] := array['created_at', 'created_by', 'updated_at', 'updated_by'];
  masked text[] := coalesce(string_to_array(nullif(tg_argv[2], ''), ','), '{}');
  parent_col text := nullif(tg_argv[0], '');
  diff jsonb := '{}';
  k text;
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(n) loop
      continue when k = any (skip);
      if (n -> k) is distinct from (o -> k) then
        diff := diff || jsonb_build_object(
          k, case when k = any (masked) then null else jsonb_build_array(o -> k, n -> k) end
        );
      end if;
    end loop;
    if diff = '{}' then
      return null;
    end if;
  else
    select coalesce(jsonb_object_agg(e.key, case when e.key = any (masked) then null else e.value end), '{}')
      into diff
      from jsonb_each(rec) e
     where e.key <> all (skip);
  end if;

  insert into public.audit_log (table_name, row_id, parent_table, parent_id, action, actor_id, changes)
  values (
    tg_table_name,
    (rec ->> 'id')::uuid,
    case when parent_col is not null then tg_argv[1] end,
    case when parent_col is not null then (rec ->> parent_col)::uuid end,
    tg_op::public.audit_action,
    (select auth.uid()),
    diff
  );
  return null;
end
$function$;

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
     and exists (
       select 1 from public.profiles p
        where p.id = (select auth.uid())
          and (p.department is null or p.department = p_slug)
     )
$function$;

CREATE OR REPLACE FUNCTION private.can_edit_department_id (
  p_department_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select coalesce(
    (select private.can_edit_department(d.slug) from public.departments d where d.id = p_department_id),
    false
  )
$function$;

CREATE OR REPLACE FUNCTION private.can_read_history (
  p_table        text,
  p_row_id       uuid,
  p_parent_table text,
  p_parent_id    uuid
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  t text := case when p_table = 'files' then p_parent_table else p_table end;
  menu text;
  feed public.news_feed;
begin
  if t = 'file_lists' then
    select m.key into menu
      from public.file_lists l join public.menus m on m.id = l.menu_id and m.area = 'ADMIN'
     where l.id = p_parent_id;
    return coalesce(private.has_permission(menu, 'HISTORY'), false);
  end if;

  -- 주일광고 · 성복의 뜰은 그 글의 feed 로 메뉴를 고른다. 완전 삭제돼 글이 없으면 둘 다 있어야 본다.
  if t = 'news_videos' then
    select v.feed into feed from public.news_videos v where v.id = p_row_id;
    if feed is null then
      return private.has_permission('announcements', 'HISTORY') and private.has_permission('garden', 'HISTORY');
    end if;
    return private.has_permission(private.news_menu(feed), 'HISTORY');
  end if;

  menu := case t
    when 'bulletins'         then 'bulletin'
    when 'albums'            then 'album'
    when 'resources'         then 'resources'
    when 'resource_videos'   then 'resources'
    when 'home_hero'         then 'home-hero'
    when 'departments'       then 'departments'
    when 'department_staff'  then 'departments'
    when 'newcomers'         then 'newcomers'
    when 'profiles'          then 'users'
    when 'user_groups'       then 'users'
    when 'groups'            then 'groups'
    when 'group_permissions' then 'groups'
    when 'menus'             then 'menus'
    when 'categories'        then 'categories'
    when 'codes'             then 'codes'
  end;
  return menu is not null and private.has_permission(menu, 'HISTORY');
end
$function$;

CREATE OR REPLACE FUNCTION private.can_read_list (
  p_list_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (select 1 from private.file_list_owners o where o.list_id = p_list_id and o.is_public)
      or exists (
        select 1 from public.file_lists l join public.menus m on m.id = l.menu_id and m.area = 'ADMIN'
         where l.id = p_list_id and private.has_permission(m.key, 'READ')
      )
$function$;

CREATE OR REPLACE FUNCTION private.can_write_list (
  p_list_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
      from public.file_lists l
      join public.menus m on m.id = l.menu_id and m.area = 'ADMIN'
     where l.id = p_list_id
       and case
         when exists (select 1 from private.file_list_owners o where o.list_id = l.id) then
           (
             private.has_permission(m.key, 'UPDATE')
             or (
               private.has_permission(m.key, 'CREATE')
               and not exists (
                 select 1 from private.file_list_owners o
                  where o.list_id = l.id and o.own_draft_by is distinct from (select auth.uid())
               )
             )
           )
           and not exists (
             select 1 from private.file_list_owners o
              where o.list_id = l.id and o.department is not null
                and not private.can_edit_department(o.department)
           )
         else
           private.has_permission(m.key, 'CREATE') or private.has_permission(m.key, 'UPDATE')
       end
  )
$function$;

CREATE OR REPLACE FUNCTION private.can_write_storage_path (
  p_name text
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select case
    when p_name ~ '^[a-z][a-z0-9-]*/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
      then private.can_write_list(split_part(p_name, '/', 2)::uuid)
           and exists (
             select 1 from public.file_lists l join public.menus m on m.id = l.menu_id
              where l.id = split_part(p_name, '/', 2)::uuid and m.key = split_part(p_name, '/', 1)
           )
    else false
  end
$function$;

CREATE OR REPLACE FUNCTION private.ensure_admin_remains()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  removed_admin boolean;
begin
  -- 표마다 칸이 달라서 따로 읽는다(한 식에 섞으면 다른 표의 칸 이름을 찾다가 실패한다).
  if tg_table_name = 'user_groups' then
    removed_admin := exists (select 1 from public.groups g where g.id = old.group_id and g.is_system);
  else
    -- «전체 관리» 구성원을 끈 경우만(일반 사용자를 끄는 것은 이 검사와 상관없다)
    removed_admin := old.is_active and not new.is_active
      and exists (
        select 1 from public.user_groups ug join public.groups g on g.id = ug.group_id and g.is_system
         where ug.user_id = old.id
      );
  end if;
  if removed_admin and not exists (
    select 1
      from public.user_groups ug
      join public.groups g on g.id = ug.group_id and g.is_system and g.is_active
      join public.profiles p on p.id = ug.user_id and p.is_active
  ) then
    raise exception '«전체 관리» 에 활성 사용자가 한 명은 남아야 합니다' using errcode = '23514';
  end if;
  return null;
end
$function$;

CREATE OR REPLACE FUNCTION private.guard_categories()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if (select auth.uid()) is not null
     and (new.group_key is distinct from old.group_key or new.slug is distinct from old.slug) then
    raise exception '분류의 묶음 · 영문 이름은 바꿀 수 없습니다' using errcode = '42501';
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION private.guard_codes()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  locked boolean;
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  select g.is_locked into locked from public.code_groups g where g.key = new.group_key;
  if tg_op = 'INSERT' then
    if locked then
      raise exception '프로그램이 쓰는 코드 묶음에는 코드를 더할 수 없습니다' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.group_key is distinct from old.group_key or new.code is distinct from old.code then
    raise exception '코드 값은 바꿀 수 없습니다' using errcode = '42501';
  end if;
  if locked and new.is_active is distinct from old.is_active then
    raise exception '프로그램이 쓰는 코드는 끌 수 없습니다' using errcode = '42501';
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION private.guard_content()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  menu text;
  o jsonb := to_jsonb(old) - array['updated_at', 'updated_by', 'deleted_at', 'deleted_by'];
  n jsonb := to_jsonb(new) - array['updated_at', 'updated_by', 'deleted_at', 'deleted_by'];
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  -- 메뉴는 사람 검사 뒤에 정한다(서버 전용 키는 판정 함수의 실행 권한이 없다).
  menu := coalesce(nullif(tg_argv[0], ''), private.news_menu((to_jsonb(new) ->> 'feed')::public.news_feed));
  if (to_jsonb(new) ->> 'feed') is distinct from (to_jsonb(old) ->> 'feed') then
    raise exception '주일광고와 성복의 뜰 사이로 옮길 수 없습니다' using errcode = '42501';
  end if;
  if new.deleted_at is distinct from old.deleted_at and not private.has_permission(menu, 'DELETE') then
    raise exception '삭제 권한이 없습니다' using errcode = '42501';
  end if;
  if o is distinct from n and not private.has_permission(menu, 'UPDATE') then
    raise exception '수정 권한이 없습니다' using errcode = '42501';
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION private.guard_group_permissions()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  m record;
begin
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

CREATE OR REPLACE FUNCTION private.guard_list_menu()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  col text;
  list_id uuid;
  i integer;
begin
  for i in 1 .. tg_nargs - 1 loop
    col := tg_argv[i];
    list_id := (to_jsonb(new) ->> col)::uuid;
    continue when list_id is null;
    if tg_op = 'UPDATE' and list_id is not distinct from (to_jsonb(old) ->> col)::uuid then
      continue;
    end if;
    if not exists (
      select 1 from public.file_lists l join public.menus m on m.id = l.menu_id
       where l.id = list_id and m.area = 'ADMIN' and m.key = tg_argv[0]
    ) then
      raise exception '«%» 칸의 묶음이 «%» 화면의 묶음이 아닙니다', col, tg_argv[0] using errcode = '23514';
    end if;
  end loop;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION private.guard_menus()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if (select auth.uid()) is not null
     and (to_jsonb(new) - array['label', 'is_active', 'sort', 'updated_at', 'updated_by'])
         is distinct from (to_jsonb(old) - array['label', 'is_active', 'sort', 'updated_at', 'updated_by']) then
    raise exception '메뉴는 이름 · 사용 여부 · 순서만 바꿀 수 있습니다' using errcode = '42501';
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
       and exists (
         select 1
           from public.group_permissions gp
           join public.menus m on m.id = gp.menu_id
          where gp.group_id = target_group
            and not private.has_permission(m.key, gp.action)
       ) then
      raise exception '자기가 가진 권한보다 많은 그룹에는 넣을 수 없습니다' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION private.has_permission (
  p_menu   text,
  p_action public.permission_action
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select private.user_has_permission((select auth.uid()), p_menu, p_action)
$function$;

CREATE OR REPLACE FUNCTION private.is_full_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
      from public.profiles p
      join public.user_groups ug on ug.user_id = p.id
      join public.groups g on g.id = ug.group_id
     where p.id = (select auth.uid())
       and p.is_active
       and g.is_system
       and g.is_active
  )
$function$;

CREATE OR REPLACE FUNCTION private.news_menu (
  p_feed public.news_feed
)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
  select case p_feed when 'ANNOUNCEMENTS' then 'announcements' else 'garden' end
$function$;

CREATE OR REPLACE FUNCTION private.on_auth_user_changed()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  -- 익명 로그인은 관리자 계정이 아니다(reference.sql 의 기존 계정 채우기와 같은 기준).
  if new.is_anonymous then
    return null;
  end if;
  if tg_op = 'INSERT' then
    insert into public.profiles (id, email, name)
    values (
      new.id,
      coalesce(new.email, ''),
      left(coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, 'user'), '@', 1)), 50)
    )
    on conflict (id) do nothing;
  elsif new.email is distinct from old.email then
    update public.profiles set email = coalesce(new.email, '') where id = new.id;
  end if;
  return null;
end
$function$;

CREATE OR REPLACE FUNCTION private.prune_menu_permissions()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  delete from public.group_permissions gp
   where gp.menu_id = new.id and not (gp.action = any (new.actions));
  return null;
end
$function$;

CREATE OR REPLACE FUNCTION private.stamp()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
declare
  actor uuid := (select auth.uid());
  patch jsonb;
begin
  if tg_op = 'INSERT' then
    patch := jsonb_build_object(
      'created_at', now(), 'created_by', actor,
      'updated_at', now(), 'updated_by', actor,
      'deleted_at', null, 'deleted_by', null
    );
  else
    patch := jsonb_build_object(
      'created_at', to_jsonb(old) -> 'created_at', 'created_by', to_jsonb(old) -> 'created_by',
      'updated_at', now(), 'updated_by', actor
    );
    if (to_jsonb(new) -> 'deleted_at') is distinct from (to_jsonb(old) -> 'deleted_at') then
      patch := patch || jsonb_build_object(
        'deleted_by', case when to_jsonb(new) ->> 'deleted_at' is null then null else actor end
      );
    else
      patch := patch || jsonb_build_object('deleted_by', to_jsonb(old) -> 'deleted_by');
    end if;
  end if;
  new := jsonb_populate_record(new, patch);
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION private.stamp_created()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new := jsonb_populate_record(new, jsonb_build_object('created_at', now(), 'created_by', (select auth.uid())));
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION private.user_has_permission (
  p_user   uuid,
  p_menu   text,
  p_action public.permission_action
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
      from public.profiles p
      join public.menus m on m.area = 'ADMIN' and m.key = p_menu
     where p.id = p_user
       and p.is_active
       and m.is_active
       and p_action = any (m.actions)
       and exists (
         select 1
           from public.user_groups ug
           join public.groups g on g.id = ug.group_id and g.is_active
          where ug.user_id = p.id
            and (
              g.is_system
              or exists (
                select 1 from public.group_permissions gp
                 where gp.group_id = g.id and gp.menu_id = m.id and gp.action = p_action
              )
            )
       )
  )
$function$;

CREATE OR REPLACE FUNCTION private.uuid_v7()
  RETURNS uuid
  LANGUAGE sql
  PARALLEL SAFE
  SET search_path TO ''
  AS $function$
  select encode(
    set_bit(
      set_bit(
        overlay(
          uuid_send(gen_random_uuid())
          placing substring(int8send((extract(epoch from clock_timestamp()) * 1000)::bigint) from 3)
          from 1 for 6
        ),
        52, 1
      ),
      53, 1
    ),
    'hex'
  )::uuid
$function$;

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
       select 1 from public.my_permissions() mp where mp.action = 'HISTORY' or (mp.menu_key = 'audit' and mp.action = 'READ')
     )
$function$;

REVOKE ALL ON FUNCTION "public"."actor_names"(uuid[]) FROM PUBLIC, "anon";

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
           select 1
             from public.user_groups ug
             join public.group_permissions gp on gp.group_id = ug.group_id
             join public.menus m on m.id = gp.menu_id
            where ug.user_id = p_target
              and not private.has_permission(m.key, gp.action)
         )
       )
     )
$function$;

REVOKE ALL ON FUNCTION "public"."can_manage_user"(uuid) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.my_permissions()
  RETURNS TABLE (
    menu_key text,
    action   public.permission_action
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select m.key, a.action
    from public.menus m
    cross join lateral unnest(m.actions) as a (action)
   where m.area = 'ADMIN'
     and private.user_has_permission((select auth.uid()), m.key, a.action)
$function$;

REVOKE ALL ON FUNCTION "public"."my_permissions"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.newcomer_notify_emails()
  RETURNS SETOF text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select p.email
    from public.profiles p
   where p.is_active
     and p.email <> ''
     and private.user_has_permission(p.id, 'newcomers', 'READ')
$function$;

REVOKE ALL ON FUNCTION "public"."newcomer_notify_emails"() FROM PUBLIC, "anon", "authenticated";

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
   order by o.created_at
   limit p_limit
$function$;

REVOKE ALL ON FUNCTION "public"."orphan_storage_objects"(integer) FROM PUBLIC, "anon", "authenticated";

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
  -- 어느 글에도 붙지 않은 지 24시간 넘은 묶음(파일 행은 함께 지워진다). 휴지통에서 지운 글의 묶음도 여기서 정리된다.
  delete from public.file_lists where id in (select id from private.orphan_file_lists);
  get diagnostics n = row_count; result := result || jsonb_build_object('file_lists', n);
  return result;
end
$function$;

REVOKE ALL ON FUNCTION "public"."purge_expired"() FROM PUBLIC, "anon", "authenticated";

ALTER TABLE "public"."audit_log"
  ADD CONSTRAINT "audit_log_check1" CHECK (((action = 'EXPORT'::public.audit_action) OR (row_id IS NOT NULL) OR (parent_id IS NOT NULL)));

ALTER TABLE "public"."categories"
  ADD CONSTRAINT "categories_group_key_fkey" FOREIGN KEY (group_key) REFERENCES public.category_groups(key);

ALTER TABLE "public"."codes"
  ADD CONSTRAINT "codes_group_key_fkey" FOREIGN KEY (group_key) REFERENCES public.code_groups(key);

ALTER TABLE "public"."departments"
  ADD CONSTRAINT "departments_ages_check" CHECK ((char_length(ages) <= 50));

ALTER TABLE "public"."departments"
  ADD CONSTRAINT "departments_extra_check" CHECK ((char_length(extra) <= 300));

ALTER TABLE "public"."departments"
  ADD CONSTRAINT "departments_intro_check" CHECK ((char_length(intro) <= 3000));

ALTER TABLE "public"."departments"
  ADD CONSTRAINT "departments_photos_list_id_key" UNIQUE (photos_list_id);

ALTER TABLE "public"."departments"
  ADD CONSTRAINT "departments_slug_key" UNIQUE (slug);

ALTER TABLE "public"."departments"
  ADD CONSTRAINT "departments_tagline_check" CHECK ((char_length(tagline) <= 100));

ALTER TABLE "public"."files"
  ADD CONSTRAINT "files_alt_check" CHECK ((char_length(alt) <= 300));

ALTER TABLE "public"."files"
  ADD CONSTRAINT "files_bytes_check" CHECK ((bytes >= 0));

ALTER TABLE "public"."files"
  ADD CONSTRAINT "files_check1" CHECK (((kind <> 'IMAGE'::public.file_kind) OR (width IS NOT NULL)));

ALTER TABLE "public"."files"
  ADD CONSTRAINT "files_check" CHECK (((width IS NULL) = (height IS NULL)));

ALTER TABLE "public"."files"
  ADD CONSTRAINT "files_height_check" CHECK ((height > 0));

ALTER TABLE "public"."files"
  ADD CONSTRAINT "files_original_name_check" CHECK (((char_length(original_name) >= 1) AND (char_length(original_name) <= 255)));

ALTER TABLE "public"."files"
  ADD CONSTRAINT "files_variants_check" CHECK (((variants IS NULL) OR (jsonb_typeof(variants) = 'array'::text)));

ALTER TABLE "public"."files"
  ADD CONSTRAINT "files_width_check" CHECK ((width > 0));

ALTER TABLE "public"."group_permissions"
  ADD CONSTRAINT "group_permissions_pkey" PRIMARY KEY (group_id, menu_id, action);

ALTER TABLE "public"."home_hero"
  ADD CONSTRAINT "home_hero_check" CHECK (((kind = 'YOUTUBE'::public.hero_media_kind) = (youtube_video_id IS NOT NULL)));

ALTER TABLE "public"."home_hero"
  ADD CONSTRAINT "home_hero_photo_list_id_key" UNIQUE (photo_list_id);

ALTER TABLE "public"."home_hero"
  ADD CONSTRAINT "home_hero_youtube_video_id_check" CHECK ((youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'::text));

ALTER TABLE "public"."menus"
  ADD CONSTRAINT "menus_area_key_key" UNIQUE (area, key);

ALTER TABLE "public"."menus"
  ADD CONSTRAINT "menus_check1" CHECK (((path IS NOT NULL) OR (cardinality(actions) = 0)));

ALTER TABLE "public"."menus"
  ADD CONSTRAINT "menus_check2" CHECK (((area = 'ADMIN'::public.menu_area) OR (cardinality(actions) = 0)));

ALTER TABLE "public"."menus"
  ADD CONSTRAINT "menus_check" CHECK ((NOT (is_locked AND (NOT is_active))));

ALTER TABLE "public"."menus"
  ADD CONSTRAINT "menus_default_label_check" CHECK (((char_length(default_label) >= 1) AND (char_length(default_label) <= 50)));

ALTER TABLE "public"."menus"
  ADD CONSTRAINT "menus_key_check" CHECK ((key ~ '^[a-z][a-z0-9-]*$'::text));

ALTER TABLE "public"."menus"
  ADD CONSTRAINT "menus_label_check" CHECK (((char_length(label) >= 1) AND (char_length(label) <= 50)));

ALTER TABLE "public"."menus"
  ADD CONSTRAINT "menus_path_check" CHECK ((path ~ '^/'::text));

ALTER TABLE "public"."newcomers"
  ADD CONSTRAINT "newcomers_consent_version_check" CHECK (((char_length(consent_version) >= 1) AND (char_length(consent_version) <= 20)));

ALTER TABLE "public"."newcomers"
  ADD CONSTRAINT "newcomers_message_check" CHECK ((char_length(message) <= 2000));

ALTER TABLE "public"."newcomers"
  ADD CONSTRAINT "newcomers_name_check" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 50)));

ALTER TABLE "public"."newcomers"
  ADD CONSTRAINT "newcomers_note_check" CHECK ((char_length(note) <= 2000));

ALTER TABLE "public"."newcomers"
  ADD CONSTRAINT "newcomers_phone_check" CHECK ((phone ~ '^[0-9+][0-9 -]{7,19}$'::text));

ALTER TABLE "public"."news_videos"
  ADD CONSTRAINT "news_videos_description_check" CHECK ((char_length(description) <= 5000));

ALTER TABLE "public"."news_videos"
  ADD CONSTRAINT "news_videos_legacy_id_check" CHECK ((legacy_id ~ '^[0-9]{4}-[0-9]+$'::text));

ALTER TABLE "public"."news_videos"
  ADD CONSTRAINT "news_videos_title_check" CHECK (((char_length(title) >= 1) AND (char_length(title) <= 200)));

ALTER TABLE "public"."news_videos"
  ADD CONSTRAINT "news_videos_video_id_check" CHECK ((video_id ~ '^[A-Za-z0-9_-]{11}$'::text));

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE "public"."resources"
  ADD CONSTRAINT "resources_check" CHECK (((date IS NULL) OR (year IS NULL) OR ((year)::numeric = EXTRACT(year FROM date))));

ALTER TABLE "public"."resources"
  ADD CONSTRAINT "resources_episode_check" CHECK ((episode > 0));

ALTER TABLE "public"."resources"
  ADD CONSTRAINT "resources_file_list_id_key" UNIQUE (file_list_id);

ALTER TABLE "public"."resources"
  ADD CONSTRAINT "resources_pages_list_id_key" UNIQUE (pages_list_id);

ALTER TABLE "public"."resources"
  ADD CONSTRAINT "resources_passage_check" CHECK ((char_length(passage) <= 100));

ALTER TABLE "public"."resources"
  ADD CONSTRAINT "resources_title_check" CHECK (((char_length(title) >= 1) AND (char_length(title) <= 200)));

ALTER TABLE "public"."resources"
  ADD CONSTRAINT "resources_year_check" CHECK (((year >= 1950) AND (year <= 2100)));

ALTER TABLE "public"."user_groups"
  ADD CONSTRAINT "user_groups_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX albums_category_idx ON public.albums USING btree (category_group, category_id);

CREATE INDEX albums_created_at_idx ON public.albums USING btree (created_at DESC);

CREATE INDEX albums_deleted_at_idx ON public.albums USING btree (deleted_at)
  WHERE (deleted_at IS NOT NULL);

CREATE UNIQUE INDEX albums_slug_key ON public.albums USING btree (slug)
  WHERE (deleted_at IS NULL);

CREATE INDEX audit_log_at_brin ON public.audit_log USING brin (at);

CREATE INDEX audit_log_parent_idx ON public.audit_log USING btree (parent_table, parent_id, id DESC)
  WHERE (parent_id IS NOT NULL);

CREATE INDEX audit_log_row_idx ON public.audit_log USING btree (table_name, row_id, id DESC)
  WHERE (row_id IS NOT NULL);

CREATE UNIQUE INDEX bulletins_date_key ON public.bulletins USING btree (date)
  WHERE (deleted_at IS NULL);

CREATE INDEX bulletins_deleted_at_idx ON public.bulletins USING btree (deleted_at)
  WHERE (deleted_at IS NOT NULL);

CREATE INDEX categories_group_sort_idx ON public.categories USING btree (group_key, sort);

CREATE INDEX codes_group_sort_idx ON public.codes USING btree (group_key, sort);

CREATE INDEX department_staff_role_idx ON public.department_staff USING btree (role_group, role_id);

CREATE INDEX file_lists_created_at_idx ON public.file_lists USING btree (created_at);

CREATE INDEX file_lists_menu_id_idx ON public.file_lists USING btree (menu_id);

CREATE INDEX files_bucket_path_idx ON public.files USING btree (bucket, path);

CREATE INDEX group_permissions_menu_id_idx ON public.group_permissions USING btree (menu_id);

CREATE INDEX menus_parent_idx ON public.menus USING btree (parent_id, area, sort);

CREATE INDEX newcomers_created_at_idx ON public.newcomers USING btree (created_at);

CREATE INDEX newcomers_status_created_idx ON public.newcomers USING btree (status, created_at DESC);

CREATE INDEX news_videos_category_idx ON public.news_videos USING btree (category_group, category_id);

CREATE INDEX news_videos_deleted_at_idx ON public.news_videos USING btree (deleted_at)
  WHERE (deleted_at IS NOT NULL);

CREATE INDEX news_videos_feed_date_idx ON public.news_videos USING btree (feed, date DESC);

CREATE UNIQUE INDEX news_videos_legacy_key ON public.news_videos USING btree (legacy_id)
  WHERE (legacy_id IS NOT NULL);

CREATE UNIQUE INDEX news_videos_video_key ON public.news_videos USING btree (feed, video_id)
  WHERE ((deleted_at IS NULL) AND (video_id IS NOT NULL));

CREATE INDEX resource_videos_video_id_idx ON public.resource_videos USING btree (video_id);

CREATE INDEX resources_deleted_at_idx ON public.resources USING btree (deleted_at)
  WHERE (deleted_at IS NOT NULL);

CREATE INDEX resources_section_date_idx ON public.resources USING btree (section, date DESC NULLS LAST);

CREATE INDEX resources_series_idx ON public.resources USING btree (series_group, series_id, episode);

CREATE UNIQUE INDEX resources_slug_key ON public.resources USING btree (slug)
  WHERE (deleted_at IS NULL);

CREATE INDEX submission_attempts_at_idx ON public.submission_attempts USING btree (at);

CREATE INDEX submission_attempts_key_at_idx ON public.submission_attempts USING btree (key_hash, at DESC);

CREATE INDEX user_groups_group_id_idx ON public.user_groups USING btree (group_id);

CREATE TRIGGER on_auth_user_changed
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION private.on_auth_user_changed();

CREATE TRIGGER audit
  AFTER INSERT OR DELETE OR UPDATE ON public.albums
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_row();

CREATE TRIGGER guard_lists
  BEFORE INSERT OR UPDATE ON public.albums
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_list_menu('album', 'images_list_id');

CREATE TRIGGER guard
  BEFORE UPDATE ON public.albums
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_content('album');

CREATE TRIGGER stamp
  BEFORE INSERT OR UPDATE ON public.albums
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp();

CREATE TRIGGER audit
  AFTER INSERT OR DELETE OR UPDATE ON public.bulletins
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_row();

CREATE TRIGGER guard_lists
  BEFORE INSERT OR UPDATE ON public.bulletins
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_list_menu('bulletin', 'pages_list_id');

CREATE TRIGGER guard
  BEFORE UPDATE ON public.bulletins
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_content('bulletin');

CREATE TRIGGER stamp
  BEFORE INSERT OR UPDATE ON public.bulletins
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp();

CREATE TRIGGER audit
  AFTER INSERT OR DELETE OR UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_row();

CREATE TRIGGER guard
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_categories();

CREATE TRIGGER stamp
  BEFORE INSERT OR UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp();

CREATE TRIGGER audit
  AFTER INSERT OR DELETE OR UPDATE ON public.codes
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_row();

CREATE TRIGGER guard
  BEFORE INSERT OR UPDATE ON public.codes
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_codes();

CREATE TRIGGER stamp
  BEFORE INSERT OR UPDATE ON public.codes
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp();

CREATE TRIGGER audit
  AFTER INSERT OR DELETE OR UPDATE ON public.department_staff
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_row('department_id', 'departments');

CREATE TRIGGER guard_lists
  BEFORE INSERT OR UPDATE ON public.department_staff
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_list_menu('departments', 'photo_list_id');

CREATE TRIGGER stamp
  BEFORE INSERT OR UPDATE ON public.department_staff
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp();

CREATE TRIGGER audit
  AFTER INSERT OR DELETE OR UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_row();

CREATE TRIGGER guard_lists
  BEFORE INSERT OR UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_list_menu('departments', 'photos_list_id');

CREATE TRIGGER stamp
  BEFORE INSERT OR UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp();

CREATE TRIGGER stamp
  BEFORE INSERT ON public.file_lists
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp_created();

CREATE TRIGGER audit
  AFTER INSERT OR DELETE OR UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_row('list_id', 'file_lists');

CREATE TRIGGER stamp
  BEFORE INSERT OR UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp();

CREATE TRIGGER audit
  AFTER INSERT OR DELETE ON public.group_permissions
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_row('group_id', 'groups');

CREATE TRIGGER guard
  BEFORE INSERT OR UPDATE ON public.group_permissions
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_group_permissions();

CREATE TRIGGER stamp
  BEFORE INSERT ON public.group_permissions
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp_created();

CREATE TRIGGER audit
  AFTER INSERT OR DELETE OR UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_row();

CREATE TRIGGER guard
  BEFORE INSERT OR DELETE OR UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_groups();

CREATE TRIGGER stamp
  BEFORE INSERT OR UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp();

CREATE TRIGGER audit
  AFTER INSERT OR DELETE OR UPDATE ON public.home_hero
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_row();

CREATE TRIGGER guard_lists
  BEFORE INSERT OR UPDATE ON public.home_hero
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_list_menu('home-hero', 'photo_list_id');

CREATE TRIGGER stamp
  BEFORE INSERT OR UPDATE ON public.home_hero
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp();

CREATE TRIGGER audit
  AFTER INSERT OR DELETE OR UPDATE ON public.menus
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_row();

CREATE TRIGGER guard
  BEFORE UPDATE ON public.menus
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_menus();

CREATE TRIGGER prune_permissions
  AFTER UPDATE OF actions ON public.menus
  FOR EACH ROW
  EXECUTE FUNCTION private.prune_menu_permissions();

CREATE TRIGGER stamp
  BEFORE INSERT OR UPDATE ON public.menus
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp();

CREATE TRIGGER audit
  AFTER INSERT OR DELETE OR UPDATE ON public.newcomers
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_row('', '', 'name,phone,message,note');

CREATE TRIGGER stamp
  BEFORE INSERT OR UPDATE ON public.newcomers
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp();

CREATE TRIGGER audit
  AFTER INSERT OR DELETE OR UPDATE ON public.news_videos
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_row();

CREATE TRIGGER guard
  BEFORE UPDATE ON public.news_videos
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_content('');

CREATE TRIGGER stamp
  BEFORE INSERT OR UPDATE ON public.news_videos
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp();

CREATE TRIGGER audit
  AFTER INSERT OR DELETE OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_row();

CREATE CONSTRAINT TRIGGER ensure_admin_remains
  AFTER UPDATE OF is_active ON public.profiles DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION private.ensure_admin_remains();

CREATE TRIGGER guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_profiles();

CREATE TRIGGER stamp
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp();

CREATE TRIGGER audit
  AFTER INSERT OR DELETE ON public.resource_videos
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_row('resource_id', 'resources');

CREATE TRIGGER stamp
  BEFORE INSERT ON public.resource_videos
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp_created();

CREATE TRIGGER audit
  AFTER INSERT OR DELETE OR UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_row();

CREATE TRIGGER guard_lists
  BEFORE INSERT OR UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_list_menu('resources', 'file_list_id', 'pages_list_id');

CREATE TRIGGER guard
  BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_content('resources');

CREATE TRIGGER stamp
  BEFORE INSERT OR UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp();

CREATE TRIGGER audit
  AFTER INSERT OR DELETE ON public.user_groups
  FOR EACH ROW
  EXECUTE FUNCTION private.audit_row('user_id', 'profiles');

CREATE CONSTRAINT TRIGGER ensure_admin_remains
  AFTER DELETE ON public.user_groups DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION private.ensure_admin_remains();

CREATE TRIGGER guard
  BEFORE INSERT OR DELETE ON public.user_groups
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_user_groups();

CREATE TRIGGER stamp
  BEFORE INSERT ON public.user_groups
  FOR EACH ROW
  EXECUTE FUNCTION private.stamp_created();

CREATE POLICY "albums_delete" ON "public"."albums"
  FOR DELETE
  TO "authenticated"
  USING (((deleted_at IS NOT NULL) AND ( SELECT private.has_permission('album'::text, 'PURGE'::public.permission_action) AS has_permission)));

CREATE POLICY "albums_insert" ON "public"."albums"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT private.has_permission('album'::text, 'CREATE'::public.permission_action) AS has_permission));

CREATE POLICY "albums_select_anon" ON "public"."albums"
  FOR SELECT
  TO "anon"
  USING (((status = 'PUBLISHED'::public.content_status) AND (deleted_at IS NULL)));

CREATE POLICY "albums_select" ON "public"."albums"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.has_permission('album'::text, 'READ'::public.permission_action) AS has_permission));

CREATE POLICY "albums_update" ON "public"."albums"
  FOR UPDATE
  TO "authenticated"
  USING
    ((( SELECT private.has_permission('album'::text, 'UPDATE'::public.permission_action) AS has_permission) OR ( SELECT private.has_permission('album'::text,
    'DELETE'::public.permission_action) AS has_permission)))
  WITH
    CHECK
    ((( SELECT private.has_permission('album'::text, 'UPDATE'::public.permission_action) AS has_permission) OR ( SELECT private.has_permission('album'::text,
    'DELETE'::public.permission_action) AS has_permission)));

CREATE POLICY "audit_log_select" ON "public"."audit_log"
  FOR SELECT
  TO "authenticated"
  USING
    ((( SELECT private.has_permission('audit'::text, 'READ'::public.permission_action) AS has_permission) OR private.can_read_history(table_name, row_id, parent_table, parent_id)));

CREATE POLICY "bulletins_delete" ON "public"."bulletins"
  FOR DELETE
  TO "authenticated"
  USING (((deleted_at IS NOT NULL) AND ( SELECT private.has_permission('bulletin'::text, 'PURGE'::public.permission_action) AS has_permission)));

CREATE POLICY "bulletins_insert" ON "public"."bulletins"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT private.has_permission('bulletin'::text, 'CREATE'::public.permission_action) AS has_permission));

CREATE POLICY "bulletins_select_anon" ON "public"."bulletins"
  FOR SELECT
  TO "anon"
  USING (((status = 'PUBLISHED'::public.content_status) AND (deleted_at IS NULL)));

CREATE POLICY "bulletins_select" ON "public"."bulletins"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.has_permission('bulletin'::text, 'READ'::public.permission_action) AS has_permission));

CREATE POLICY "bulletins_update" ON "public"."bulletins"
  FOR UPDATE
  TO "authenticated"
  USING
    ((( SELECT private.has_permission('bulletin'::text, 'UPDATE'::public.permission_action) AS has_permission) OR ( SELECT private.has_permission('bulletin'::text,
    'DELETE'::public.permission_action) AS has_permission)))
  WITH
    CHECK
    ((( SELECT private.has_permission('bulletin'::text, 'UPDATE'::public.permission_action) AS has_permission) OR ( SELECT private.has_permission('bulletin'::text,
    'DELETE'::public.permission_action) AS has_permission)));

CREATE POLICY "categories_insert" ON "public"."categories"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT private.has_permission('categories'::text, 'CREATE'::public.permission_action) AS has_permission));

CREATE POLICY "categories_select" ON "public"."categories"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "categories_update" ON "public"."categories"
  FOR UPDATE
  TO "authenticated"
  USING (( SELECT private.has_permission('categories'::text, 'UPDATE'::public.permission_action) AS has_permission))
  WITH CHECK (( SELECT private.has_permission('categories'::text, 'UPDATE'::public.permission_action) AS has_permission));

CREATE POLICY "category_groups_select" ON "public"."category_groups"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "code_groups_select" ON "public"."code_groups"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "codes_insert" ON "public"."codes"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT private.has_permission('codes'::text, 'CREATE'::public.permission_action) AS has_permission));

CREATE POLICY "codes_select" ON "public"."codes"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "codes_update" ON "public"."codes"
  FOR UPDATE
  TO "authenticated"
  USING (( SELECT private.has_permission('codes'::text, 'UPDATE'::public.permission_action) AS has_permission))
  WITH CHECK (( SELECT private.has_permission('codes'::text, 'UPDATE'::public.permission_action) AS has_permission));

CREATE POLICY "department_staff_delete" ON "public"."department_staff"
  FOR DELETE
  TO "authenticated"
  USING (private.can_edit_department_id(department_id));

CREATE POLICY "department_staff_insert" ON "public"."department_staff"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (private.can_edit_department_id(department_id));

CREATE POLICY "department_staff_select" ON "public"."department_staff"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "department_staff_update" ON "public"."department_staff"
  FOR UPDATE
  TO "authenticated"
  USING (private.can_edit_department_id(department_id))
  WITH CHECK (private.can_edit_department_id(department_id));

CREATE POLICY "departments_select" ON "public"."departments"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "departments_update" ON "public"."departments"
  FOR UPDATE
  TO "authenticated"
  USING (private.can_edit_department(slug))
  WITH CHECK (private.can_edit_department(slug));

CREATE POLICY "files_delete" ON "public"."files"
  FOR DELETE
  TO "authenticated"
  USING (private.can_write_list(list_id));

CREATE POLICY "files_insert" ON "public"."files"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (private.can_write_list(list_id));

CREATE POLICY "files_select_anon" ON "public"."files"
  FOR SELECT
  TO "anon"
  USING (private.can_read_list(list_id));

CREATE POLICY "files_select" ON "public"."files"
  FOR SELECT
  TO "authenticated"
  USING (private.can_read_list(list_id));

CREATE POLICY "files_update" ON "public"."files"
  FOR UPDATE
  TO "authenticated"
  USING (private.can_write_list(list_id))
  WITH CHECK (private.can_write_list(list_id));

CREATE POLICY "group_permissions_delete" ON "public"."group_permissions"
  FOR DELETE
  TO "authenticated"
  USING (( SELECT private.has_permission('groups'::text, 'UPDATE'::public.permission_action) AS has_permission));

CREATE POLICY "group_permissions_insert" ON "public"."group_permissions"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT private.has_permission('groups'::text, 'UPDATE'::public.permission_action) AS has_permission));

CREATE POLICY "group_permissions_select" ON "public"."group_permissions"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.has_permission('groups'::text, 'READ'::public.permission_action) AS has_permission));

CREATE POLICY "groups_insert" ON "public"."groups"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT private.has_permission('groups'::text, 'CREATE'::public.permission_action) AS has_permission));

CREATE POLICY "groups_select" ON "public"."groups"
  FOR SELECT
  TO "authenticated"
  USING
    ((( SELECT private.has_permission('groups'::text, 'READ'::public.permission_action) AS has_permission) OR ( SELECT private.has_permission('users'::text,
    'READ'::public.permission_action) AS has_permission)));

CREATE POLICY "groups_update" ON "public"."groups"
  FOR UPDATE
  TO "authenticated"
  USING
    ((( SELECT private.has_permission('groups'::text, 'UPDATE'::public.permission_action) AS has_permission) OR ( SELECT private.has_permission('groups'::text,
    'DELETE'::public.permission_action) AS has_permission)))
  WITH
    CHECK
    ((( SELECT private.has_permission('groups'::text, 'UPDATE'::public.permission_action) AS has_permission) OR ( SELECT private.has_permission('groups'::text,
    'DELETE'::public.permission_action) AS has_permission)));

CREATE POLICY "home_hero_select" ON "public"."home_hero"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

CREATE POLICY "home_hero_update" ON "public"."home_hero"
  FOR UPDATE
  TO "authenticated"
  USING (( SELECT private.has_permission('home-hero'::text, 'UPDATE'::public.permission_action) AS has_permission))
  WITH CHECK (( SELECT private.has_permission('home-hero'::text, 'UPDATE'::public.permission_action) AS has_permission));

CREATE POLICY "menus_select_anon" ON "public"."menus"
  FOR SELECT
  TO "anon"
  USING ((area = 'SITE'::public.menu_area));

CREATE POLICY "menus_select" ON "public"."menus"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "menus_update" ON "public"."menus"
  FOR UPDATE
  TO "authenticated"
  USING (( SELECT private.has_permission('menus'::text, 'UPDATE'::public.permission_action) AS has_permission))
  WITH CHECK (( SELECT private.has_permission('menus'::text, 'UPDATE'::public.permission_action) AS has_permission));

CREATE POLICY "newcomers_delete" ON "public"."newcomers"
  FOR DELETE
  TO "authenticated"
  USING (( SELECT private.has_permission('newcomers'::text, 'PURGE'::public.permission_action) AS has_permission));

CREATE POLICY "newcomers_select" ON "public"."newcomers"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.has_permission('newcomers'::text, 'READ'::public.permission_action) AS has_permission));

CREATE POLICY "newcomers_update" ON "public"."newcomers"
  FOR UPDATE
  TO "authenticated"
  USING (( SELECT private.has_permission('newcomers'::text, 'UPDATE'::public.permission_action) AS has_permission))
  WITH CHECK (( SELECT private.has_permission('newcomers'::text, 'UPDATE'::public.permission_action) AS has_permission));

CREATE POLICY "news_videos_delete" ON "public"."news_videos"
  FOR DELETE
  TO "authenticated"
  USING (((deleted_at IS NOT NULL) AND
CASE feed
    WHEN 'ANNOUNCEMENTS'::public.news_feed THEN ( SELECT private.has_permission('announcements'::text, 'PURGE'::public.permission_action) AS has_permission)
    ELSE ( SELECT private.has_permission('garden'::text, 'PURGE'::public.permission_action) AS has_permission)
END));

CREATE POLICY "news_videos_insert" ON "public"."news_videos"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (
CASE feed
    WHEN 'ANNOUNCEMENTS'::public.news_feed THEN ( SELECT private.has_permission('announcements'::text, 'CREATE'::public.permission_action) AS has_permission)
    ELSE ( SELECT private.has_permission('garden'::text, 'CREATE'::public.permission_action) AS has_permission)
END);

CREATE POLICY "news_videos_select_anon" ON "public"."news_videos"
  FOR SELECT
  TO "anon"
  USING (((status = 'PUBLISHED'::public.content_status) AND (deleted_at IS NULL) AND (video_id IS NOT NULL)));

CREATE POLICY "news_videos_select" ON "public"."news_videos"
  FOR SELECT
  TO "authenticated"
  USING (
CASE feed
    WHEN 'ANNOUNCEMENTS'::public.news_feed THEN ( SELECT private.has_permission('announcements'::text, 'READ'::public.permission_action) AS has_permission)
    ELSE ( SELECT private.has_permission('garden'::text, 'READ'::public.permission_action) AS has_permission)
END);

CREATE POLICY "news_videos_update" ON "public"."news_videos"
  FOR UPDATE
  TO "authenticated"
  USING (
CASE feed
    WHEN 'ANNOUNCEMENTS'::public.news_feed THEN
      (( SELECT private.has_permission('announcements'::text, 'UPDATE'::public.permission_action) AS has_permission) OR ( SELECT private.has_permission('announcements'::text,
      'DELETE'::public.permission_action) AS has_permission))
    ELSE
      (( SELECT private.has_permission('garden'::text, 'UPDATE'::public.permission_action) AS has_permission) OR ( SELECT private.has_permission('garden'::text,
      'DELETE'::public.permission_action) AS has_permission))
END)
  WITH CHECK (
CASE feed
    WHEN 'ANNOUNCEMENTS'::public.news_feed THEN
      (( SELECT private.has_permission('announcements'::text, 'UPDATE'::public.permission_action) AS has_permission) OR ( SELECT private.has_permission('announcements'::text,
      'DELETE'::public.permission_action) AS has_permission))
    ELSE
      (( SELECT private.has_permission('garden'::text, 'UPDATE'::public.permission_action) AS has_permission) OR ( SELECT private.has_permission('garden'::text,
      'DELETE'::public.permission_action) AS has_permission))
END);

CREATE POLICY "profiles_select" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (((id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.has_permission('users'::text, 'READ'::public.permission_action) AS has_permission)));

CREATE POLICY "profiles_update" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING (((id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.has_permission('users'::text, 'UPDATE'::public.permission_action) AS has_permission)))
  WITH CHECK (((id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.has_permission('users'::text, 'UPDATE'::public.permission_action) AS has_permission)));

CREATE POLICY "resource_videos_select" ON "public"."resource_videos"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.has_permission('resources'::text, 'READ'::public.permission_action) AS has_permission));

CREATE POLICY "resources_delete" ON "public"."resources"
  FOR DELETE
  TO "authenticated"
  USING (((deleted_at IS NOT NULL) AND ( SELECT private.has_permission('resources'::text, 'PURGE'::public.permission_action) AS has_permission)));

CREATE POLICY "resources_insert" ON "public"."resources"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT private.has_permission('resources'::text, 'CREATE'::public.permission_action) AS has_permission));

CREATE POLICY "resources_select_anon" ON "public"."resources"
  FOR SELECT
  TO "anon"
  USING (((status = 'PUBLISHED'::public.content_status) AND (deleted_at IS NULL)));

CREATE POLICY "resources_select" ON "public"."resources"
  FOR SELECT
  TO "authenticated"
  USING (( SELECT private.has_permission('resources'::text, 'READ'::public.permission_action) AS has_permission));

CREATE POLICY "resources_update" ON "public"."resources"
  FOR UPDATE
  TO "authenticated"
  USING
    ((( SELECT private.has_permission('resources'::text, 'UPDATE'::public.permission_action) AS has_permission) OR ( SELECT private.has_permission('resources'::text,
    'DELETE'::public.permission_action) AS has_permission)))
  WITH
    CHECK
    ((( SELECT private.has_permission('resources'::text, 'UPDATE'::public.permission_action) AS has_permission) OR ( SELECT private.has_permission('resources'::text,
    'DELETE'::public.permission_action) AS has_permission)));

CREATE POLICY "user_groups_delete" ON "public"."user_groups"
  FOR DELETE
  TO "authenticated"
  USING (( SELECT private.has_permission('users'::text, 'UPDATE'::public.permission_action) AS has_permission));

CREATE POLICY "user_groups_insert" ON "public"."user_groups"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (( SELECT private.has_permission('users'::text, 'UPDATE'::public.permission_action) AS has_permission));

CREATE POLICY "user_groups_select" ON "public"."user_groups"
  FOR SELECT
  TO "authenticated"
  USING
    (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.has_permission('users'::text, 'READ'::public.permission_action) AS has_permission) OR ( SELECT
    private.has_permission('groups'::text, 'READ'::public.permission_action) AS has_permission)));

CREATE POLICY "media_delete" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'media'::text) AND private.can_write_storage_path(name)));

CREATE POLICY "media_insert" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'media'::text) AND private.can_write_storage_path(name)));

CREATE POLICY "media_select" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'media'::text) AND private.can_write_storage_path(name)));

CREATE POLICY "media_update" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'media'::text) AND private.can_write_storage_path(name)))
  WITH CHECK (((bucket_id = 'media'::text) AND private.can_write_storage_path(name)));

REVOKE ALL ON FUNCTION "private"."audit_row"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."can_edit_department"(public.department_slug) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."can_edit_department"(public.department_slug) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."can_edit_department_id"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."can_edit_department_id"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."can_read_history"(text, uuid, text, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."can_read_history"(text, uuid, text, uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."can_read_list"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."can_read_list"(uuid) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "private"."can_write_list"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."can_write_list"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."can_write_storage_path"(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."can_write_storage_path"(text) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."ensure_admin_remains"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."guard_categories"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."guard_codes"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."guard_content"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."guard_group_permissions"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."guard_groups"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."guard_list_menu"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."guard_menus"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."guard_profiles"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."guard_user_groups"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."has_permission"(text, public.permission_action) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."has_permission"(text, public.permission_action) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."is_full_admin"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."is_full_admin"() TO "authenticated";

REVOKE ALL ON FUNCTION "private"."news_menu"(public.news_feed) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."news_menu"(public.news_feed) TO "authenticated";

REVOKE ALL ON FUNCTION "private"."on_auth_user_changed"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."prune_menu_permissions"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."stamp"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."stamp_created"() FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."user_has_permission"(uuid, text, public.permission_action) FROM PUBLIC;

REVOKE ALL ON FUNCTION "private"."uuid_v7"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."uuid_v7"() TO "authenticated", "service_role";

GRANT EXECUTE ON FUNCTION "public"."actor_names"(uuid[]) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."actor_names"(uuid[]) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."actor_names"(uuid[]) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."actor_names"(uuid[]) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."can_manage_user"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."can_manage_user"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."can_manage_user"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."can_manage_user"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."my_permissions"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."my_permissions"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."my_permissions"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."my_permissions"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."newcomer_notify_emails"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."newcomer_notify_emails"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."newcomer_notify_emails"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."orphan_storage_objects"(integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."orphan_storage_objects"(integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."orphan_storage_objects"(integer) TO "service_role";

REVOKE ALL ON FUNCTION "public"."purge_expired"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."purge_expired"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."purge_expired"() TO "service_role";

GRANT USAGE ON SCHEMA "private" TO "anon", "authenticated", "service_role";

REVOKE ALL ON SEQUENCE "public"."albums_slug_seq" FROM "authenticated";

GRANT USAGE ON SEQUENCE "public"."albums_slug_seq" TO "authenticated";

REVOKE ALL ON SEQUENCE "public"."albums_slug_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."albums_slug_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."albums_slug_seq" TO "service_role";

REVOKE ALL ON SEQUENCE "public"."audit_log_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."audit_log_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."audit_log_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."audit_log_id_seq" TO "service_role";

REVOKE ALL ON SEQUENCE "public"."resources_slug_seq" FROM "authenticated";

GRANT USAGE ON SEQUENCE "public"."resources_slug_seq" TO "authenticated";

REVOKE ALL ON SEQUENCE "public"."resources_slug_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."resources_slug_seq" TO "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."resources_slug_seq" TO "service_role";

REVOKE ALL ON SEQUENCE "public"."submission_attempts_id_seq" FROM "postgres";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."submission_attempts_id_seq" TO "postgres";

REVOKE ALL ON SEQUENCE "public"."submission_attempts_id_seq" FROM "service_role";

GRANT SELECT, UPDATE, USAGE ON SEQUENCE "public"."submission_attempts_id_seq" TO "service_role";

REVOKE ALL ON TABLE "public"."albums" FROM "anon";

GRANT SELECT ON TABLE "public"."albums" TO "anon";

REVOKE ALL ON TABLE "public"."albums" FROM "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."albums" TO "authenticated";

REVOKE ALL ON TABLE "public"."albums" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."albums" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."albums" TO "service_role";

REVOKE ALL ON TABLE "public"."audit_log" FROM "authenticated";

REVOKE ALL ("action") ON TABLE "public"."audit_log" FROM "authenticated";

GRANT INSERT ("action") ON TABLE "public"."audit_log" TO "authenticated";

REVOKE ALL ("changes") ON TABLE "public"."audit_log" FROM "authenticated";

GRANT INSERT ("changes") ON TABLE "public"."audit_log" TO "authenticated";

REVOKE ALL ("table_name") ON TABLE "public"."audit_log" FROM "authenticated";

GRANT INSERT ("table_name") ON TABLE "public"."audit_log" TO "authenticated";

GRANT SELECT ON TABLE "public"."audit_log" TO "authenticated";

REVOKE ALL ON TABLE "public"."audit_log" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."audit_log" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."audit_log" TO "service_role";

REVOKE ALL ON TABLE "public"."bulletins" FROM "anon";

GRANT SELECT ON TABLE "public"."bulletins" TO "anon";

REVOKE ALL ON TABLE "public"."bulletins" FROM "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."bulletins" TO "authenticated";

REVOKE ALL ON TABLE "public"."bulletins" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."bulletins" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."bulletins" TO "service_role";

REVOKE ALL ON TABLE "public"."categories" FROM "anon";

GRANT SELECT ON TABLE "public"."categories" TO "anon";

REVOKE ALL ON TABLE "public"."categories" FROM "authenticated";

GRANT INSERT, SELECT, UPDATE ON TABLE "public"."categories" TO "authenticated";

REVOKE ALL ON TABLE "public"."categories" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "service_role";

REVOKE ALL ON TABLE "public"."category_groups" FROM "anon";

GRANT SELECT ON TABLE "public"."category_groups" TO "anon";

REVOKE ALL ON TABLE "public"."category_groups" FROM "authenticated";

GRANT SELECT ON TABLE "public"."category_groups" TO "authenticated";

REVOKE ALL ON TABLE "public"."category_groups" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."category_groups" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."category_groups" TO "service_role";

REVOKE ALL ON TABLE "public"."code_groups" FROM "anon";

GRANT SELECT ON TABLE "public"."code_groups" TO "anon";

REVOKE ALL ON TABLE "public"."code_groups" FROM "authenticated";

GRANT SELECT ON TABLE "public"."code_groups" TO "authenticated";

REVOKE ALL ON TABLE "public"."code_groups" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."code_groups" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."code_groups" TO "service_role";

REVOKE ALL ON TABLE "public"."codes" FROM "anon";

GRANT SELECT ON TABLE "public"."codes" TO "anon";

REVOKE ALL ON TABLE "public"."codes" FROM "authenticated";

GRANT INSERT, SELECT, UPDATE ON TABLE "public"."codes" TO "authenticated";

REVOKE ALL ON TABLE "public"."codes" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."codes" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."codes" TO "service_role";

REVOKE ALL ON TABLE "public"."department_staff" FROM "anon";

GRANT SELECT ON TABLE "public"."department_staff" TO "anon";

REVOKE ALL ON TABLE "public"."department_staff" FROM "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."department_staff" TO "authenticated";

REVOKE ALL ON TABLE "public"."department_staff" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."department_staff" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."department_staff" TO "service_role";

REVOKE ALL ON TABLE "public"."departments" FROM "anon";

GRANT SELECT ON TABLE "public"."departments" TO "anon";

REVOKE ALL ON TABLE "public"."departments" FROM "authenticated";

REVOKE ALL ("ages") ON TABLE "public"."departments" FROM "authenticated";

GRANT UPDATE ("ages") ON TABLE "public"."departments" TO "authenticated";

REVOKE ALL ("extra") ON TABLE "public"."departments" FROM "authenticated";

GRANT UPDATE ("extra") ON TABLE "public"."departments" TO "authenticated";

REVOKE ALL ("intro") ON TABLE "public"."departments" FROM "authenticated";

GRANT UPDATE ("intro") ON TABLE "public"."departments" TO "authenticated";

REVOKE ALL ("photos_list_id") ON TABLE "public"."departments" FROM "authenticated";

GRANT UPDATE ("photos_list_id") ON TABLE "public"."departments" TO "authenticated";

REVOKE ALL ("tagline") ON TABLE "public"."departments" FROM "authenticated";

GRANT UPDATE ("tagline") ON TABLE "public"."departments" TO "authenticated";

GRANT SELECT ON TABLE "public"."departments" TO "authenticated";

REVOKE ALL ON TABLE "public"."departments" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."departments" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."departments" TO "service_role";

REVOKE ALL ON TABLE "public"."file_lists" FROM "anon";

GRANT SELECT ON TABLE "public"."file_lists" TO "anon";

REVOKE ALL ON TABLE "public"."file_lists" FROM "authenticated";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."file_lists" TO "authenticated";

REVOKE ALL ON TABLE "public"."file_lists" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."file_lists" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."file_lists" TO "service_role";

REVOKE ALL ON TABLE "public"."files" FROM "anon";

GRANT SELECT ON TABLE "public"."files" TO "anon";

REVOKE ALL ON TABLE "public"."files" FROM "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."files" TO "authenticated";

REVOKE ALL ON TABLE "public"."files" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."files" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."files" TO "service_role";

REVOKE ALL ON TABLE "public"."group_permissions" FROM "authenticated";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."group_permissions" TO "authenticated";

REVOKE ALL ON TABLE "public"."group_permissions" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."group_permissions" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."group_permissions" TO "service_role";

REVOKE ALL ON TABLE "public"."groups" FROM "authenticated";

GRANT INSERT, SELECT, UPDATE ON TABLE "public"."groups" TO "authenticated";

REVOKE ALL ON TABLE "public"."groups" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."groups" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."groups" TO "service_role";

REVOKE ALL ON TABLE "public"."home_hero" FROM "anon";

GRANT SELECT ON TABLE "public"."home_hero" TO "anon";

REVOKE ALL ON TABLE "public"."home_hero" FROM "authenticated";

GRANT SELECT, UPDATE ON TABLE "public"."home_hero" TO "authenticated";

REVOKE ALL ON TABLE "public"."home_hero" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."home_hero" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."home_hero" TO "service_role";

REVOKE ALL ON TABLE "public"."menus" FROM "anon";

GRANT SELECT ON TABLE "public"."menus" TO "anon";

REVOKE ALL ON TABLE "public"."menus" FROM "authenticated";

GRANT SELECT, UPDATE ON TABLE "public"."menus" TO "authenticated";

REVOKE ALL ON TABLE "public"."menus" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."menus" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."menus" TO "service_role";

REVOKE ALL ON TABLE "public"."newcomers" FROM "authenticated";

GRANT DELETE, SELECT, UPDATE ON TABLE "public"."newcomers" TO "authenticated";

REVOKE ALL ON TABLE "public"."newcomers" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."newcomers" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."newcomers" TO "service_role";

REVOKE ALL ON TABLE "public"."news_videos" FROM "anon";

GRANT SELECT ON TABLE "public"."news_videos" TO "anon";

REVOKE ALL ON TABLE "public"."news_videos" FROM "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."news_videos" TO "authenticated";

REVOKE ALL ON TABLE "public"."news_videos" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."news_videos" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."news_videos" TO "service_role";

REVOKE ALL ON TABLE "public"."profiles" FROM "authenticated";

GRANT SELECT, UPDATE ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ON TABLE "public"."profiles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "service_role";

REVOKE ALL ON TABLE "public"."resource_videos" FROM "anon";

GRANT SELECT ON TABLE "public"."resource_videos" TO "anon";

REVOKE ALL ON TABLE "public"."resource_videos" FROM "authenticated";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."resource_videos" TO "authenticated";

REVOKE ALL ON TABLE "public"."resource_videos" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."resource_videos" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."resource_videos" TO "service_role";

REVOKE ALL ON TABLE "public"."resources" FROM "anon";

GRANT SELECT ON TABLE "public"."resources" TO "anon";

REVOKE ALL ON TABLE "public"."resources" FROM "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."resources" TO "authenticated";

REVOKE ALL ON TABLE "public"."resources" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."resources" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."resources" TO "service_role";

REVOKE ALL ON TABLE "public"."submission_attempts" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."submission_attempts" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."submission_attempts" TO "service_role";

REVOKE ALL ON TABLE "public"."user_groups" FROM "authenticated";

GRANT DELETE, INSERT, SELECT ON TABLE "public"."user_groups" TO "authenticated";

REVOKE ALL ON TABLE "public"."user_groups" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_groups" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_groups" TO "service_role";

ALTER TABLE "public"."albums"
  ADD COLUMN "id" uuid NOT NULL DEFAULT private.uuid_v7();

ALTER TABLE "public"."albums"
  ADD CONSTRAINT "albums_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."audit_log"
  ADD COLUMN "actor_id" uuid DEFAULT auth.uid();

CREATE INDEX audit_log_actor_idx ON public.audit_log USING btree (actor_id, id DESC)
  WHERE (actor_id IS NOT NULL);

CREATE POLICY "audit_log_insert" ON "public"."audit_log"
  FOR INSERT
  TO "authenticated"
  WITH
    CHECK
    (((action = 'EXPORT'::public.audit_action) AND (table_name = 'newcomers'::text) AND (actor_id = ( SELECT auth.uid() AS uid)) AND (row_id IS NULL) AND (parent_table IS NULL) AND
    ( SELECT private.has_permission('newcomers'::text, 'EXPORT'::public.permission_action) AS has_permission)));

ALTER TABLE "public"."bulletins"
  ADD COLUMN "id" uuid NOT NULL DEFAULT private.uuid_v7();

ALTER TABLE "public"."bulletins"
  ADD CONSTRAINT "bulletins_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."categories"
  ADD COLUMN "id" uuid NOT NULL DEFAULT private.uuid_v7();

ALTER TABLE "public"."categories"
  ADD CONSTRAINT "categories_group_key_id_key" UNIQUE (group_key, id);

ALTER TABLE "public"."albums"
  ADD CONSTRAINT "albums_category_group_category_id_fkey" FOREIGN KEY (category_group, category_id) REFERENCES public.categories(group_key, id);

ALTER TABLE "public"."categories"
  ADD CONSTRAINT "categories_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."news_videos"
  ADD CONSTRAINT "news_videos_category_group_category_id_fkey" FOREIGN KEY (category_group, category_id) REFERENCES public.categories(group_key, id);

ALTER TABLE "public"."resources"
  ADD CONSTRAINT "resources_series_group_series_id_fkey" FOREIGN KEY (series_group, series_id) REFERENCES public.categories(group_key, id);

ALTER TABLE "public"."codes"
  ADD COLUMN "id" uuid NOT NULL DEFAULT private.uuid_v7();

ALTER TABLE "public"."codes"
  ADD CONSTRAINT "codes_group_key_id_key" UNIQUE (group_key, id);

ALTER TABLE "public"."codes"
  ADD CONSTRAINT "codes_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."department_staff"
  ADD CONSTRAINT "department_staff_role_group_role_id_fkey" FOREIGN KEY (role_group, role_id) REFERENCES public.codes(group_key, id);

ALTER TABLE "public"."department_staff"
  ADD COLUMN "id" uuid NOT NULL DEFAULT private.uuid_v7();

ALTER TABLE "public"."department_staff"
  ADD CONSTRAINT "department_staff_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."departments"
  ADD COLUMN "id" uuid NOT NULL DEFAULT private.uuid_v7();

ALTER TABLE "public"."departments"
  ADD CONSTRAINT "departments_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."department_staff"
  ADD CONSTRAINT "department_staff_department_id_fkey" FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;

ALTER TABLE "public"."file_lists"
  ADD COLUMN "id" uuid NOT NULL DEFAULT private.uuid_v7();

ALTER TABLE "public"."file_lists"
  ADD CONSTRAINT "file_lists_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."albums"
  ADD CONSTRAINT "albums_images_list_id_fkey" FOREIGN KEY (images_list_id) REFERENCES public.file_lists(id);

ALTER TABLE "public"."bulletins"
  ADD CONSTRAINT "bulletins_pages_list_id_fkey" FOREIGN KEY (pages_list_id) REFERENCES public.file_lists(id);

ALTER TABLE "public"."department_staff"
  ADD CONSTRAINT "department_staff_photo_list_id_fkey" FOREIGN KEY (photo_list_id) REFERENCES public.file_lists(id);

ALTER TABLE "public"."departments"
  ADD CONSTRAINT "departments_photos_list_id_fkey" FOREIGN KEY (photos_list_id) REFERENCES public.file_lists(id);

ALTER TABLE "public"."files"
  ADD CONSTRAINT "files_list_id_fkey" FOREIGN KEY (list_id) REFERENCES public.file_lists(id) ON DELETE CASCADE;

ALTER TABLE "public"."home_hero"
  ADD CONSTRAINT "home_hero_photo_list_id_fkey" FOREIGN KEY (photo_list_id) REFERENCES public.file_lists(id);

ALTER TABLE "public"."resources"
  ADD CONSTRAINT "resources_file_list_id_fkey" FOREIGN KEY (file_list_id) REFERENCES public.file_lists(id);

ALTER TABLE "public"."resources"
  ADD CONSTRAINT "resources_pages_list_id_fkey" FOREIGN KEY (pages_list_id) REFERENCES public.file_lists(id);

CREATE POLICY "file_lists_delete" ON "public"."file_lists"
  FOR DELETE
  TO "authenticated"
  USING (private.can_write_list(id));

CREATE POLICY "file_lists_select_anon" ON "public"."file_lists"
  FOR SELECT
  TO "anon"
  USING (private.can_read_list(id));

CREATE POLICY "file_lists_select" ON "public"."file_lists"
  FOR SELECT
  TO "authenticated"
  USING (private.can_read_list(id));

ALTER TABLE "public"."files"
  ADD COLUMN "id" uuid NOT NULL DEFAULT private.uuid_v7();

ALTER TABLE "public"."files"
  ADD CONSTRAINT "files_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."groups"
  ADD COLUMN "id" uuid NOT NULL DEFAULT private.uuid_v7();

ALTER TABLE "public"."groups"
  ADD CONSTRAINT "groups_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."group_permissions"
  ADD CONSTRAINT "group_permissions_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE "public"."user_groups"
  ADD CONSTRAINT "user_groups_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE "public"."home_hero"
  ADD COLUMN "id" uuid NOT NULL DEFAULT private.uuid_v7();

ALTER TABLE "public"."home_hero"
  ADD CONSTRAINT "home_hero_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."menus"
  ADD COLUMN "id" uuid NOT NULL DEFAULT private.uuid_v7();

ALTER TABLE "public"."menus"
  ADD CONSTRAINT "menus_id_area_key" UNIQUE (id, area);

ALTER TABLE "public"."menus"
  ADD CONSTRAINT "menus_parent_id_area_fkey" FOREIGN KEY (parent_id, area) REFERENCES public.menus(id, area);

ALTER TABLE "public"."menus"
  ADD CONSTRAINT "menus_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."file_lists"
  ADD CONSTRAINT "file_lists_menu_id_fkey" FOREIGN KEY (menu_id) REFERENCES public.menus(id);

ALTER TABLE "public"."group_permissions"
  ADD CONSTRAINT "group_permissions_menu_id_fkey" FOREIGN KEY (menu_id) REFERENCES public.menus(id) ON DELETE CASCADE;

CREATE POLICY "file_lists_insert" ON "public"."file_lists"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.menus m
  WHERE
    ((m.id = file_lists.menu_id) AND (m.area = 'ADMIN'::public.menu_area) AND (private.has_permission(m.key, 'CREATE'::public.permission_action) OR private.has_permission(m.key,
    'UPDATE'::public.permission_action))))));

ALTER TABLE "public"."newcomers"
  ADD COLUMN "id" uuid NOT NULL DEFAULT private.uuid_v7();

ALTER TABLE "public"."newcomers"
  ADD CONSTRAINT "newcomers_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."news_videos"
  ADD COLUMN "id" uuid NOT NULL DEFAULT private.uuid_v7();

ALTER TABLE "public"."news_videos"
  ADD CONSTRAINT "news_videos_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."resources"
  ADD COLUMN "id" uuid NOT NULL DEFAULT private.uuid_v7();

ALTER TABLE "public"."resources"
  ADD CONSTRAINT "resources_pkey" PRIMARY KEY (id);

ALTER TABLE "public"."resource_videos"
  ADD CONSTRAINT "resource_videos_resource_id_fkey" FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;

CREATE VIEW "private"."file_list_owners" AS  SELECT bulletins.pages_list_id AS list_id,
    'bulletins'::text AS owner_table,
    bulletins.id AS owner_id,
    ((bulletins.status = 'PUBLISHED'::public.content_status) AND (bulletins.deleted_at IS NULL)) AS is_public,
    NULL::public.department_slug AS department,
        CASE
            WHEN ((bulletins.status = 'DRAFT'::public.content_status) AND (bulletins.deleted_at IS NULL)) THEN bulletins.created_by
            ELSE NULL::uuid
        END AS own_draft_by
   FROM public.bulletins
UNION ALL
 SELECT albums.images_list_id AS list_id,
    'albums'::text AS owner_table,
    albums.id AS owner_id,
    ((albums.status = 'PUBLISHED'::public.content_status) AND (albums.deleted_at IS NULL)) AS is_public,
    NULL::public.department_slug AS department,
        CASE
            WHEN ((albums.status = 'DRAFT'::public.content_status) AND (albums.deleted_at IS NULL)) THEN albums.created_by
            ELSE NULL::uuid
        END AS own_draft_by
   FROM public.albums
UNION ALL
 SELECT resources.file_list_id AS list_id,
    'resources'::text AS owner_table,
    resources.id AS owner_id,
    ((resources.status = 'PUBLISHED'::public.content_status) AND (resources.deleted_at IS NULL)) AS is_public,
    NULL::public.department_slug AS department,
        CASE
            WHEN ((resources.status = 'DRAFT'::public.content_status) AND (resources.deleted_at IS NULL)) THEN resources.created_by
            ELSE NULL::uuid
        END AS own_draft_by
   FROM public.resources
  WHERE (resources.file_list_id IS NOT NULL)
UNION ALL
 SELECT resources.pages_list_id AS list_id,
    'resources'::text AS owner_table,
    resources.id AS owner_id,
    ((resources.status = 'PUBLISHED'::public.content_status) AND (resources.deleted_at IS NULL)) AS is_public,
    NULL::public.department_slug AS department,
        CASE
            WHEN ((resources.status = 'DRAFT'::public.content_status) AND (resources.deleted_at IS NULL)) THEN resources.created_by
            ELSE NULL::uuid
        END AS own_draft_by
   FROM public.resources
UNION ALL
 SELECT home_hero.photo_list_id AS list_id,
    'home_hero'::text AS owner_table,
    home_hero.id AS owner_id,
    true AS is_public,
    NULL::public.department_slug AS department,
    NULL::uuid AS own_draft_by
   FROM public.home_hero
UNION ALL
 SELECT departments.photos_list_id AS list_id,
    'departments'::text AS owner_table,
    departments.id AS owner_id,
    true AS is_public,
    departments.slug AS department,
    NULL::uuid AS own_draft_by
   FROM public.departments
UNION ALL
 SELECT department_staff.photo_list_id AS list_id,
    'department_staff'::text AS owner_table,
    department_staff.id AS owner_id,
    true AS is_public,
    departments.slug AS department,
    NULL::uuid AS own_draft_by
   FROM (public.department_staff
     JOIN public.departments ON ((departments.id = department_staff.department_id)))
  WHERE (department_staff.photo_list_id IS NOT NULL);

CREATE VIEW "private"."orphan_file_lists" AS  SELECT id,
    menu_id,
    created_at
   FROM public.file_lists l
  WHERE ((created_at < (now() - '24:00:00'::interval)) AND (NOT (EXISTS ( SELECT 1
           FROM private.file_list_owners o
          WHERE (o.list_id = l.id)))));

CREATE POLICY "resource_videos_delete" ON "public"."resource_videos"
  FOR DELETE
  TO "authenticated"
  USING
    ((( SELECT private.has_permission('resources'::text, 'UPDATE'::public.permission_action) AS has_permission) OR (( SELECT private.has_permission('resources'::text,
    'CREATE'::public.permission_action) AS has_permission) AND (EXISTS ( SELECT 1
   FROM public.resources r
  WHERE ((r.id = resource_videos.resource_id) AND (r.status = 'DRAFT'::public.content_status) AND (r.deleted_at IS NULL) AND (r.created_by = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "resource_videos_insert" ON "public"."resource_videos"
  FOR INSERT
  TO "authenticated"
  WITH
    CHECK
    ((( SELECT private.has_permission('resources'::text, 'UPDATE'::public.permission_action) AS has_permission) OR (( SELECT private.has_permission('resources'::text,
    'CREATE'::public.permission_action) AS has_permission) AND (EXISTS ( SELECT 1
   FROM public.resources r
  WHERE ((r.id = resource_videos.resource_id) AND (r.status = 'DRAFT'::public.content_status) AND (r.deleted_at IS NULL) AND (r.created_by = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "resource_videos_select_anon" ON "public"."resource_videos"
  FOR SELECT
  TO "anon"
  USING ((EXISTS ( SELECT 1
   FROM public.resources r
  WHERE ((r.id = resource_videos.resource_id) AND (r.status = 'PUBLISHED'::public.content_status) AND (r.deleted_at IS NULL)))));
