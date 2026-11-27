import { loadGroupMatrix } from '@/domains/admin/api/server/groupMatrix.server';
import { requireFullAdmin } from '@/domains/admin/api/server/myGroups.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { PermissionGate } from '@/domains/admin/components/features/PermissionGate';
import {
  type GroupNewData,
  GroupNewForm,
} from '@/domains/admin/components/widgets/GroupCreateForm/GroupNewForm';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Suspense } from 'react';

// 미리 만든 틀로 누르는 즉시 보이고 바로 쓴다(ADR 0027) — 제목 · 1단계 폼은 틀에, 권한 표는 약속으로 넘겨 오는 대로 채우고,
// 권한 확인(«전체 관리» 만 — 설계 6.4)은 Suspense 안의 PermissionGate 가 한다(아니면 «없음»)
export const instant = true;

/** 사용자 · 체크 없는 권한 표 — 기다리지 않고 약속으로 넘긴다. «전체 관리» 를 확인한 뒤에만 내보낸다(아니면 «없음») */
const loadNewGroup = async (): Promise<GroupNewData> => {
  const [ctx, matrix] = await Promise.all([
    requireFullAdmin('groups', 'CREATE'),
    createSupabaseServerClient().then(loadGroupMatrix),
  ]);
  return { userId: ctx.user.id, matrix };
};

// 그룹 등록 — 1 이름 · 설명 → 2 메뉴 권한, 만들 때 한 번에 저장한다
export default function AdminGroupNewPage() {
  return (
    <>
      <PageHeader title="새 그룹" />
      <Suspense fallback={null}>
        <PermissionGate menuKey="groups" action="CREATE" fullAdmin />
      </Suspense>
      <GroupNewForm data={loadNewGroup()} />
    </>
  );
}
