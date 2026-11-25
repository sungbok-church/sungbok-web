import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { actorNameMap } from '@/domains/admin/api/server/auditRows.server';
import { loadBulletin } from '@/domains/admin/api/server/bulletin.server';
import { ListNav } from '@/domains/admin/components/features/Detail/ListNav';
import { RecordMeta } from '@/domains/admin/components/features/Detail/RecordMeta';
import { IntentLink as Link } from '@/domains/admin/components/features/IntentLink';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { ContentStatusBadge } from '@/domains/admin/components/features/StatusBadge';
import { ContentDetailActions } from '@/domains/admin/components/widgets/ContentDetailActions';
import { can } from '@/domains/admin/lib/adminNav';
import { MEDIA_BUCKET } from '@/domains/admin/lib/fileUpload';
import { issueLongDate } from '@/domains/news/api/bulletinList';
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

const PATH = '/admin/bulletin';

// 주보 상세(설계 6.10 «콘텐츠 상세») — 머리: [목록] · 이전/다음 · [복제해서 새로 쓰기] · (공개면) [사이트에서 보기] · [수정] · «더 보기».
// 본문: 쪽 그림(순서대로). 맨 아래 등록 · 수정 시각.
export default async function AdminBulletinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  const [ctx, bulletin] = await Promise.all([
    requirePermission('bulletin', 'READ'),
    loadBulletin(supabase, id),
  ]);
  if (!bulletin) notFound();
  const names = await actorNameMap(supabase, [bulletin.createdBy, bulletin.updatedBy]);
  const title = `${issueLongDate(bulletin.date)} 주보`;
  const live = bulletin.status === 'PUBLISHED' && !bulletin.trashed;
  const baseUrl = readSupabaseEnv()?.url ?? '';

  return (
    <>
      <PageHeader
        title={title}
        badge={<ContentStatusBadge status={bulletin.status} deletedAt={bulletin.deletedAt} />}
        actions={
          <>
            <ListNav listPath={PATH} id={bulletin.id} />
            <ContentDetailActions
              kind="bulletin"
              id={bulletin.id}
              subject={title}
              trashed={bulletin.trashed}
              canCreate={can(ctx.permissions, 'bulletin', 'CREATE')}
              canUpdate={can(ctx.permissions, 'bulletin', 'UPDATE')}
              canTrash={can(ctx.permissions, 'bulletin', 'DELETE')}
              canPurge={can(ctx.permissions, 'bulletin', 'PURGE')}
              canHistory={can(ctx.permissions, 'bulletin', 'HISTORY')}
            >
              {live && (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={
                    <a href={`/news/bulletin/${bulletin.date}`} target="_blank" rel="noreferrer" />
                  }
                >
                  <ExternalLinkIcon data-icon="inline-start" />
                  사이트에서 보기
                </Button>
              )}
              {!bulletin.trashed && can(ctx.permissions, 'bulletin', 'UPDATE') && (
                <Button nativeButton={false} render={<Link href={`${PATH}/${bulletin.id}/edit`} />}>
                  <PencilIcon data-icon="inline-start" />
                  수정
                </Button>
              )}
            </ContentDetailActions>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            쪽
            <span className="text-muted-foreground ml-1.5 font-normal tabular-nums">
              {bulletin.pages.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
            {bulletin.pages.map((p, i) => (
              <li key={p.path} className="flex flex-col gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- Storage 에 올린 그대로(next/image 변환기를 쓰지 않는다, ADR 0013) */}
                <img
                  src={storagePublicUrl(baseUrl, MEDIA_BUCKET, p.path)}
                  alt={`${i + 1}쪽`}
                  width={p.width ?? undefined}
                  height={p.height ?? undefined}
                  loading="lazy"
                  className="bg-muted h-auto w-full rounded-md border"
                />
                <span aria-hidden className="text-muted-foreground text-xs tabular-nums">
                  {i + 1}
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <RecordMeta
        createdAt={bulletin.createdAt}
        createdBy={bulletin.createdBy ? names[bulletin.createdBy] : '시스템'}
        updatedAt={bulletin.updatedAt}
        updatedBy={bulletin.updatedBy ? names[bulletin.updatedBy] : '시스템'}
      />
    </>
  );
}
