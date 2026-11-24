import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { loadResource } from '@/domains/admin/api/server/resource.server';
import { loadSeriesBySection } from '@/domains/admin/api/server/resourceSeries.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { ResourceForm } from '@/domains/admin/components/widgets/ResourceForm';
import { can } from '@/domains/admin/lib/adminNav';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { notFound } from 'next/navigation';
import { z } from 'zod';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 시트지 수정 — 휴지통에 든 자료는 고치지 않는다(복구한 뒤에)
export default async function AdminResourceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
}
