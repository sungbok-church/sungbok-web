import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { loadAlbum } from '@/domains/admin/api/server/album.server';
import { Deferred } from '@/domains/admin/components/features/Deferred';
import { FormScreenSkeleton } from '@/domains/admin/components/features/ScreenSkeleton';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { AlbumForm } from '@/domains/admin/components/widgets/AlbumForm';
import { can } from '@/domains/admin/lib/adminNav';
import { categoryOptions } from '@/shared/api/codeBook';
import { getCategoryBook } from '@/shared/api/codeBook.server';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { notFound } from 'next/navigation';
import { z } from 'zod';

// 수정 폼은 원래 값이 있어야 그릴 수 있어 화면 전체를 서버에서 오는 대로 그린다 — 오기 전에는 폼 뼈대(Deferred — ADR 0027)
export const instant = true;

type Params = Promise<{ id: string }>;

// 앨범 수정 — 휴지통에 든 앨범은 고치지 않는다(복구한 뒤에)
export default function AdminAlbumEditPage({ params }: { params: Params }) {
  return <Deferred content={albumEdit(params)} fallback={<FormScreenSkeleton />} />;
}

/** 화면 전체(머리 · 수정 폼) — 권한을 확인하고(없으면 «없음») 읽어 그린다 */
const albumEdit = async (params: Params) => {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  const [ctx, album, book] = await Promise.all([
    requirePermission('album', 'UPDATE'),
    loadAlbum(supabase, id),
    getCategoryBook(),
  ]);
  if (!album || album.trashed) notFound();
  return (
    <>
      <PageHeader title={album.title} />
      <AlbumForm
        key={album.updatedAt}
        userId={ctx.user.id}
        categories={categoryOptions(book, 'ALBUM_CATEGORY', album.categoryId)}
        canAddCategory={can(ctx.permissions, 'categories', 'CREATE')}
        initial={{ title: album.title, categoryId: album.categoryId, images: album.images }}
        editing={{ id: album.id, updatedAt: album.updatedAt, status: album.status }}
      />
    </>
  );
};
