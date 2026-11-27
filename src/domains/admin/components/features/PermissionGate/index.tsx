import type { PermissionAction } from '@/domains/admin/lib/adminNav';
import { requirePermission } from '@/domains/admin/api/server/adminContext.server';

/**
 * 그 메뉴 · 기능 권한을 확인만 한다 — 그리는 것은 없고, 권한이 없으면 «없음»(notFound)이다. 화면은 미리 만든 틀로 즉시 보이고
 * 권한 확인은 뒤따라 오도록 <Suspense> 안에 둔다(ADR 0027). 데이터는 지금처럼 권한을 확인하는 쪽(RLS)이 막는다.
 */
export const PermissionGate = async ({
  menuKey,
  action,
}: {
  menuKey: string;
  action: PermissionAction;
}) => {
  await requirePermission(menuKey, action);
  return null;
};
