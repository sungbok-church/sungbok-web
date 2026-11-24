import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { loadSeriesBySection } from '@/domains/admin/api/server/resourceSeries.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { ResourceForm } from '@/domains/admin/components/widgets/ResourceForm';
import { can } from '@/domains/admin/lib/adminNav';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 새 설교 시트지 — 분류는 주일 강해로 채워 둔다(가장 자주 올린다)
export default async function AdminResourceNewPage() {
  const [ctx, seriesBySection] = await Promise.all([
    requirePermission('resources', 'CREATE'),
    loadSeriesBySection(),
  ]);
  return (
    <>
      <PageHeader title="새 시트지" />
      <ResourceForm
        userId={ctx.user.id}
        seriesBySection={seriesBySection}
        canAddSeries={can(ctx.permissions, 'categories', 'CREATE')}
        initial={{
          section: 'SUNDAY',
          seriesId: seriesBySection.SUNDAY.length === 1 ? seriesBySection.SUNDAY[0].value : '',
          episode: '',
          title: '',
          date: '',
          year: '',
          passage: '',
          file: [],
          pages: [],
          videos: '',
        }}
      />
    </>
  );
}
