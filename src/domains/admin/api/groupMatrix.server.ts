// 그룹 상세 · 등록 · 수정 화면이 쓰는 «메뉴 × 기능» 권한 표를 DB 에서 읽어 만든다(permissionMatrix.buildMatrix).
import type { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';

import type { Permission } from './adminNav';
import { buildMatrix, type MatrixRow } from './permissionMatrix';

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** groupId 가 없으면(새 그룹) 체크 없는 표. mine — 로그인한 사람의 권한(줄 수 있는 칸을 가린다) */
export const loadGroupMatrix = async (
  supabase: Client,
  me: { userId: string; mine: readonly Permission[] },
  groupId?: string
): Promise<MatrixRow[]> => {
  const [{ data: menus }, granted, { data: mySystem }] = await Promise.all([
    supabase
      .from('menus')
      .select('id, key, parent_id, label, default_label, sort, actions')
      .eq('area', 'ADMIN')
      .order('sort'),
    groupId
      ? supabase.from('group_permissions').select('action, menus(key)').eq('group_id', groupId)
      : Promise.resolve({ data: [] }),
    supabase
      .from('user_groups')
      .select('groups!inner(is_system)')
      .eq('user_id', me.userId)
      .eq('groups.is_system', true),
  ]);
  const keyOf = new Map((menus ?? []).map(m => [m.id, m.key]));
  return buildMatrix(
    (menus ?? []).map(m => ({
      key: m.key,
      label: m.label ?? m.default_label,
      parentKey: m.parent_id ? (keyOf.get(m.parent_id) ?? null) : null,
      sort: m.sort,
      actions: m.actions,
    })),
    (granted.data ?? []).flatMap((g): Permission[] =>
      g.menus ? [{ menuKey: g.menus.key, action: g.action }] : []
    ),
    me.mine,
    (mySystem ?? []).length > 0
  );
};
