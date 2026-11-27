import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { loadResource } from '@/domains/admin/api/server/resource.server';
import { loadSeriesBySection } from '@/domains/admin/api/server/resourceSeries.server';
import { Deferred } from '@/domains/admin/components/features/Deferred';
import { FormScreenSkeleton } from '@/domains/admin/components/features/ScreenSkeleton';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { ResourceForm } from '@/domains/admin/components/widgets/ResourceForm';
import { can } from '@/domains/admin/lib/adminNav';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { notFound } from 'next/navigation';
import { z } from 'zod';

// 수정 폼은 원래 값이 있어야 그릴 수 있어 화면 전체를 서버에서 오는 대로 그린다 — 오기 전에는 폼 뼈대(Deferred — ADR 0027)
export const instant = true;

type Params = Promise<{ id: string }>;

// 시트지 수정 — 휴지통에 든 자료는 고치지 않는다(복구한 뒤에)
export default function AdminResourceEditPage({ params }: { params: Params }) {
  return <Deferred content={resourceEdit(params)} fallback={<FormScreenSkeleton />} />;
}

/** 화면 전체(머리 · 수정 폼) — 권한을 확인하고(없으면 «없음») 읽어 그린다 */
const resourceEdit = async (params: Params) => {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  const [ctx, resource] = await Promise.all([
    requirePermission('resources', 'UPDATE'),
    loadResource(supabase, id),
  ]);
  if (!resource || resource.trashed) notFound();
  const seriesBySection = await loadSeriesBySection(resource.seriesId);
  return (
    <>
      <PageHeader title={resource.title} />
      <ResourceForm
        key={resource.updatedAt}
        userId={ctx.user.id}
        seriesBySection={seriesBySection}
        canAddSeries={can(ctx.permissions, 'categories', 'CREATE')}
        initial={{
          section: resource.section,
          seriesId: resource.seriesId,
          episode: resource.episode,
          title: resource.title,
          date: resource.date,
          year: resource.year,
          passage: resource.passage,
          file: resource.file,
          pages: resource.pages,
          videos: resource.videoIds.join('\n'),
        }}
        editing={{ id: resource.id, updatedAt: resource.updatedAt, status: resource.status }}
      />
    </>
  );
};
