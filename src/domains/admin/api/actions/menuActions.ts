'use server';

import type { Database } from '@/shared/api/supabase/database.types';
import { SITE_MENU_TAG } from '@/shared/config/siteMenu';
import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath, updateTag } from 'next/cache';

import { menuUpdateSchema } from '../../lib/input/menuInput';
import { siteMenuLabelProblem } from '../../lib/siteMenuLimits';
import { saveRow, saveRowOrder } from '../server/rowActions.server';

// 메뉴 관리(설계 6.5)의 Server Action. 몸통은 분류 · 코드와 같다(rowActions.server).
// 왼쪽 메뉴에 바로 반영되도록 관리자 전체를 다시 그린다 — 지금 화면만(refresh()) 다시 그리면 «뒤로» 로 돌아간 화면에
// 옛 메뉴 이름이 남는다(브라우저에 남은 화면은 지우지 않는다). 홈페이지 메뉴도 같은 표라 공개 메뉴 캐시도 함께 갱신한다.
const menus = {
  table: 'menus',
  menuKey: 'menus',
  revalidate: () => {
    revalidatePath('/admin', 'layout');
    updateTag(SITE_MENU_TAG);
  },
} as const;

/**
 * 메뉴 이름 · 사용 여부. 이름을 비우면 기본 이름으로 돌아간다. 잠긴 메뉴는 끌 수 없고,
 * 그 밖의 칸(주소 · 기능 · 상위)은 DB 가 막는다(guard_menus).
 */
export const updateMenu = async (raw: unknown) =>
  saveRow({ ...menus, schema: menuUpdateSchema, precheck: siteMenuLimit }, raw);

/**
 * 홈페이지 메뉴 이름 한도(siteMenuLimits) — 한 칸(대메뉴 8 · 하위 20자)과 켜진 대메뉴 이름의 합(28자). 한 칸은 DB check 도 막지만
 * 그 오류는 문장이 없어서 여기서 먼저 본다. 관리자 메뉴는 보지 않는다.
 */
const siteMenuLimit = async (
  supabase: SupabaseClient<Database>,
  patch: { id: string; label: string | null; isActive: boolean }
) => {
  const { data: row } = await supabase
    .from('menus')
    .select('area, parent_id, default_label, label, is_active')
    .eq('id', patch.id)
    .maybeSingle();
  if (!row || row.area !== 'SITE') return null;
  const isTop = row.parent_id === null;
  const { data: others } = isTop
    ? await supabase
        .from('menus')
        .select('label, default_label, is_active')
        .eq('area', 'SITE')
        .is('parent_id', null)
        .neq('id', patch.id)
    : { data: [] };
  return siteMenuLabelProblem(
    { label: patch.label, defaultLabel: row.default_label, isActive: patch.isActive, isTop },
    (others ?? []).map(o => ({
      label: o.label,
      defaultLabel: o.default_label,
      isActive: o.is_active,
    })),
    // 고치기 전 — 이미 넘은 상태에서도 줄이는 저장은 되게
    { label: row.label, defaultLabel: row.default_label, isActive: row.is_active }
  );
};

/** 같은 영역 · 같은 상위 메뉴 안에서 끌어서 옮긴 순서를 한 번에(다른 상위로 옮기기는 없다 — 설계 11-5). */
export const reorderMenus = async (raw: unknown) => saveRowOrder(menus, raw);
