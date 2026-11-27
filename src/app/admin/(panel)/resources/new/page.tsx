import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { loadSeriesBySection } from '@/domains/admin/api/server/resourceSeries.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { PermissionGate } from '@/domains/admin/components/features/PermissionGate';
import {
  type ResourceNewData,
  ResourceNewForm,
} from '@/domains/admin/components/widgets/ResourceForm/ResourceNewForm';
import { can } from '@/domains/admin/lib/adminNav';
import { Suspense } from 'react';

// 미리 만든 틀로 누르는 즉시 보이고 바로 쓴다(ADR 0027) — 제목 · 폼은 틀에, 서버에서 받을 것은 약속(Promise)으로 넘겨 오는 대로
// 채우고, 권한 확인은 Suspense 안의 PermissionGate 가 한다(없으면 «없음»)
export const instant = true;

/** 사용자 · 묶음 목록 · 묶음 더하기 권한 — 기다리지 않고 약속으로 넘긴다. 권한을 확인한 뒤에만 내보낸다(없으면 «없음») */
const loadNewResource = async (): Promise<ResourceNewData> => {
  const [ctx, seriesBySection] = await Promise.all([
    requirePermission('resources', 'CREATE'),
    loadSeriesBySection(),
  ]);
  return {
    userId: ctx.user.id,
    seriesBySection,
    canAddSeries: can(ctx.permissions, 'categories', 'CREATE'),
  };
};

// 새 시트지
export default function AdminResourceNewPage() {
  return (
    <>
      <PageHeader title="새 시트지" />
      <Suspense fallback={null}>
        <PermissionGate menuKey="resources" action="CREATE" />
      </Suspense>
      <ResourceNewForm data={loadNewResource()} />
    </>
  );
}
