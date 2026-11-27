import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { loadSeriesBySection } from '@/domains/admin/api/server/resourceSeries.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { ResourceForm } from '@/domains/admin/components/widgets/ResourceForm';
import { can } from '@/domains/admin/lib/adminNav';
import {
  RESOURCE_SECTION_KEYS,
  type ResourceSectionKey,
} from '@/domains/admin/lib/resourceSection';
import { Suspense } from 'react';

// 미리 만든 틀로 누르는 즉시 보인다(ADR 0027) — 제목과 같은 모양의 폼은 틀에, 권한 확인 · 묶음 목록은 Suspense 안에서
export const instant = true;

type Series = Record<ResourceSectionKey, { value: string; label: string }[]>;

// 새 시트지 — 분류는 주일 강해로 채워 둔다(가장 자주 올린다)
const initialFor = (series: Series) => ({
  section: 'SUNDAY' as const,
  seriesId: series.SUNDAY.length === 1 ? series.SUNDAY[0].value : '',
  episode: '',
  title: '',
  date: '',
  year: '',
  passage: '',
  file: [],
  pages: [],
  videos: '',
});

const NO_SERIES = Object.fromEntries(RESOURCE_SECTION_KEYS.map(k => [k, []])) as unknown as Series;

export default function AdminResourceNewPage() {
  return (
    <>
      <PageHeader title="새 시트지" />
      <Suspense
        fallback={
          <ResourceForm
            pending
            userId=""
            seriesBySection={NO_SERIES}
            canAddSeries={false}
            initial={initialFor(NO_SERIES)}
          />
        }
      >
        <NewResourceForm />
      </Suspense>
    </>
  );
}

/** 권한을 확인하고(없으면 «없음») 묶음 목록을 읽어 진짜 폼을 그린다 */
const NewResourceForm = async () => {
  const [ctx, seriesBySection] = await Promise.all([
    requirePermission('resources', 'CREATE'),
    loadSeriesBySection(),
  ]);
  return (
    <ResourceForm
      userId={ctx.user.id}
      seriesBySection={seriesBySection}
      canAddSeries={can(ctx.permissions, 'categories', 'CREATE')}
      initial={initialFor(seriesBySection)}
    />
  );
};
