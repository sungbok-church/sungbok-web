// 그룹 상세 · 등록 · 수정 화면이 쓰는 «메뉴 × 기능» 권한 표를 DB 에서 읽어 만든다(permissionMatrix.buildMatrix).
import type { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';

import type { Permission } from '../../lib/adminNav';
import { buildMatrix, type MatrixRow } from '../../lib/permissionMatrix';

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** groupId 가 없으면(새 그룹) 체크 없는 표 */
export const loadGroupMatrix = async (supabase: Client, groupId?: string): Promise<MatrixRow[]> => {
  const [{ data: menus }, granted] = await Promise.all([
    supabase
      .from('menus')
      .select('id, key, parent_id, label, default_label, sort, actions')
      .eq('area', 'ADMIN')
      .order('sort'),
    groupId
      ? supabase.from('group_permissions').select('action, menus(key)').eq('group_id', groupId)
      : Promise.resolve({ data: [] }),
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
    )
  );
};
