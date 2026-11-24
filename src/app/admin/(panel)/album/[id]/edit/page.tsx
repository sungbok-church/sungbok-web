import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { loadAlbum } from '@/domains/admin/api/server/album.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { AlbumForm } from '@/domains/admin/components/widgets/AlbumForm';
import { can } from '@/domains/admin/lib/adminNav';
import { categoryOptions } from '@/shared/api/codeBook';
import { getCategoryBook } from '@/shared/api/codeBook.server';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { notFound } from 'next/navigation';
import { z } from 'zod';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 앨범 수정 — 휴지통에 든 앨범은 고치지 않는다(복구한 뒤에)
export default async function AdminAlbumEditPage({ params }: { params: Promise<{ id: string }> }) {
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
}
