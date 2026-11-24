import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { AlbumForm } from '@/domains/admin/components/widgets/AlbumForm';
import { can } from '@/domains/admin/lib/adminNav';
import { categoryOptions } from '@/shared/api/codeBook';
import { getCategoryBook } from '@/shared/api/codeBook.server';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 새 앨범
export default async function AdminAlbumNewPage() {
  const [ctx, book] = await Promise.all([requirePermission('album', 'CREATE'), getCategoryBook()]);
  return (
    <>
      <PageHeader title="새 앨범" />
      <AlbumForm
        userId={ctx.user.id}
        categories={categoryOptions(book, 'ALBUM_CATEGORY')}
        canAddCategory={can(ctx.permissions, 'categories', 'CREATE')}
        initial={{ title: '', categoryId: '', images: [] }}
      />
    </>
  );
}
