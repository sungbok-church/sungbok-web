import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { actorNameMap } from '@/domains/admin/api/server/auditRows.server';
import { loadAlbum } from '@/domains/admin/api/server/album.server';
import { DetailList } from '@/domains/admin/components/features/Detail/DetailList';
import { ListNav } from '@/domains/admin/components/features/Detail/ListNav';
import { RecordMeta } from '@/domains/admin/components/features/Detail/RecordMeta';
import { IntentLink as Link } from '@/domains/admin/components/features/IntentLink';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { ContentStatusBadge } from '@/domains/admin/components/features/StatusBadge';
import { ContentDetailActions } from '@/domains/admin/components/widgets/ContentDetailActions';
import { can } from '@/domains/admin/lib/adminNav';
import { MEDIA_BUCKET } from '@/domains/admin/lib/fileUpload';
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

const PATH = '/admin/album';

// 앨범 상세(설계 6.10 «콘텐츠 상세») — 머리: [목록] · 이전/다음 · [복제해서 새로 쓰기] · (공개면) [사이트에서 보기] · [수정] · «더 보기».
export default async function AdminAlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  const [ctx, album] = await Promise.all([
    requirePermission('album', 'READ'),
    loadAlbum(supabase, id),
  ]);
  if (!album) notFound();
  const names = await actorNameMap(supabase, [album.createdBy, album.updatedBy]);
  const live = album.status === 'PUBLISHED' && !album.trashed;
  const baseUrl = readSupabaseEnv()?.url ?? '';

  return (
    <>
      <PageHeader
        title={album.title}
        badge={<ContentStatusBadge status={album.status} trashed={album.trashed} />}
        actions={
          <>
            <ListNav listPath={PATH} id={album.id} />
            <ContentDetailActions
              kind="album"
              id={album.id}
              subject={album.title}
              trashed={album.trashed}
              canCreate={can(ctx.permissions, 'album', 'CREATE')}
              canUpdate={can(ctx.permissions, 'album', 'UPDATE')}
              canTrash={can(ctx.permissions, 'album', 'DELETE')}
              canPurge={can(ctx.permissions, 'album', 'PURGE')}
              canHistory={can(ctx.permissions, 'album', 'HISTORY')}
            >
              {live && (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<a href={`/news/album/${album.slug}`} target="_blank" rel="noreferrer" />}
                >
                  <ExternalLinkIcon data-icon="inline-start" />
                  사이트에서 보기
                </Button>
              )}
              {!album.trashed && can(ctx.permissions, 'album', 'UPDATE') && (
                <Button nativeButton={false} render={<Link href={`${PATH}/${album.id}/edit`} />}>
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
              { label: '분류', value: album.categoryLabel },
              { label: '주소 번호', value: album.slug },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            그림
            <span className="text-muted-foreground ml-1.5 font-normal tabular-nums">
              {album.images.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-4">
            {album.images.map((p, i) => (
              <li key={p.path}>
                {/* eslint-disable-next-line @next/next/no-img-element -- Storage 에 올린 그대로(next/image 변환기를 쓰지 않는다, ADR 0013) */}
                <img
                  src={storagePublicUrl(baseUrl, MEDIA_BUCKET, p.path)}
                  alt={`${i + 1}번째 그림`}
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

      <RecordMeta
        createdAt={album.createdAt}
        createdBy={album.createdBy ? names[album.createdBy] : '시스템'}
        updatedAt={album.updatedAt}
        updatedBy={album.updatedBy ? names[album.updatedBy] : '시스템'}
      />
    </>
  );
}
