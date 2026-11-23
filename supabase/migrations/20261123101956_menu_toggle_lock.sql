SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.guard_menus()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if (to_jsonb(new) - array['label', 'is_active', 'sort', 'updated_at', 'updated_by'])
     is distinct from (to_jsonb(old) - array['label', 'is_active', 'sort', 'updated_at', 'updated_by']) then
    raise exception '메뉴는 이름 · 사용 여부 · 순서만 바꿀 수 있습니다' using errcode = '42501';
  end if;
  if new.is_active is distinct from old.is_active and not private.is_full_admin() then
    raise exception '메뉴 켜기 · 끄기는 «전체 관리» 만 합니다' using errcode = '42501';
  end if;
  return new;
end
$function$;
