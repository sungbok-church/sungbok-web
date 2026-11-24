import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { actorNameMap } from '@/domains/admin/api/server/auditRows.server';
import { loadResource } from '@/domains/admin/api/server/resource.server';
import { DetailList } from '@/domains/admin/components/features/Detail/DetailList';
import { ListNav } from '@/domains/admin/components/features/Detail/ListNav';
import { RecordMeta } from '@/domains/admin/components/features/Detail/RecordMeta';
import { IntentLink as Link } from '@/domains/admin/components/features/IntentLink';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { ContentStatusBadge } from '@/domains/admin/components/features/StatusBadge';
import { ContentDetailActions } from '@/domains/admin/components/widgets/ContentDetailActions';
import { can } from '@/domains/admin/lib/adminNav';
import { MEDIA_BUCKET } from '@/domains/admin/lib/fileUpload';
import { SECTION_CONFIG } from '@/domains/admin/lib/resourceSection';
import { resourcePath } from '@/domains/resources/config/resourceSections';
import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { storagePublicUrl } from '@/shared/lib/storageUrl';
import { ExternalLinkIcon, PencilIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import { z } from 'zod';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

const PATH = '/admin/resources';

// 설교 시트지 상세(설계 6.10 «콘텐츠 상세») — 머리: [목록] · 이전/다음 · [복제해서 새로 쓰기] · (공개면) [사이트에서 보기] · [수정] · «더 보기».
// 본문: 분류 · 묶음 · 날짜 · 본문 · 원본 · 설교 영상, 쪽 그림.
export default async function AdminResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  const [ctx, r] = await Promise.all([
    requirePermission('resources', 'READ'),
    loadResource(supabase, id),
  ]);
  if (!r) notFound();
  const names = await actorNameMap(supabase, [r.createdBy, r.updatedBy]);
  const live = r.status === 'PUBLISHED' && !r.trashed;
  const baseUrl = readSupabaseEnv()?.url ?? '';
  const original = r.file[0];

  return (
    <>
      <PageHeader
        title={r.title}
        badge={<ContentStatusBadge status={r.status} trashed={r.trashed} />}
        actions={
          <>
            <ListNav listPath={PATH} id={r.id} />
            <ContentDetailActions
              kind="resources"
              id={r.id}
              subject={r.title}
              trashed={r.trashed}
              canCreate={can(ctx.permissions, 'resources', 'CREATE')}
              canUpdate={can(ctx.permissions, 'resources', 'UPDATE')}
              canTrash={can(ctx.permissions, 'resources', 'DELETE')}
              canPurge={can(ctx.permissions, 'resources', 'PURGE')}
              canHistory={can(ctx.permissions, 'resources', 'HISTORY')}
            >
              {live && (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={
                    <a
                      href={resourcePath(SECTION_CONFIG[r.section].publicSection, r.slug)}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  <ExternalLinkIcon data-icon="inline-start" />
                  사이트에서 보기
                </Button>
              )}
              {!r.trashed && can(ctx.permissions, 'resources', 'UPDATE') && (
                <Button nativeButton={false} render={<Link href={`${PATH}/${r.id}/edit`} />}>
                  <PencilIcon data-icon="inline-start" />
                  수정
                </Button>
              )}
            </ContentDetailActions>
          </>
        }
      />

      <Card>
        <CardContent>
          <DetailList
            items={[
              { label: '분류', value: SECTION_CONFIG[r.section].label },
              { label: '묶음', value: `${r.seriesLabel}${r.episode ? ` ${r.episode}회` : ''}` },
              { label: '날짜', value: r.date || (r.year ? `${r.year}년` : '없음') },
              ...(r.passage ? [{ label: '본문', value: r.passage }] : []),
              {
                label: '원본',
                value: original ? (
                  <a
                    href={storagePublicUrl(baseUrl, MEDIA_BUCKET, original.path)}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all underline-offset-4 hover:underline"
                  >
                    {original.originalName}
                  </a>
                ) : (
                  '없음'
                ),
              },
              {
                label: '설교 영상',
                value: r.videoIds.length ? (
                  <span className="flex flex-col gap-0.5">
                    {r.videoIds.map(v => (
                      <a
                        key={v}
                        href={`https://www.youtube.com/watch?v=${v}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline-offset-4 hover:underline"
                      >
                        youtu.be/{v}
                      </a>
                    ))}
                  </span>
                ) : (
                  '없음'
                ),
              },
              { label: '주소 번호', value: r.slug },
            ]}
          />
        </CardContent>
      </Card>

      {r.pages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              쪽 그림
              <span className="text-muted-foreground ml-1.5 font-normal tabular-nums">
                {r.pages.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-4">
              {r.pages.map((p, i) => (
                <li key={p.path}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Storage 에 올린 그대로(next/image 변환기를 쓰지 않는다, ADR 0013) */}
                  <img
                    src={storagePublicUrl(baseUrl, MEDIA_BUCKET, p.path)}
                    alt={`${i + 1}쪽`}
                    width={p.width ?? undefined}
                    height={p.height ?? undefined}
                    loading="lazy"
                    className="bg-muted h-auto w-full rounded-md border"
                  />
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <RecordMeta
        createdAt={r.createdAt}
        createdBy={r.createdBy ? names[r.createdBy] : '시스템'}
        updatedAt={r.updatedAt}
        updatedBy={r.updatedBy ? names[r.updatedBy] : '시스템'}
      />
    </>
  );
}
