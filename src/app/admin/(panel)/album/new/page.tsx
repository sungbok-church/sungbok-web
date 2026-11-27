import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { PermissionGate } from '@/domains/admin/components/features/PermissionGate';
import {
  type AlbumNewData,
  AlbumNewForm,
} from '@/domains/admin/components/widgets/AlbumForm/AlbumNewForm';
import { can } from '@/domains/admin/lib/adminNav';
import { categoryOptions } from '@/shared/api/codeBook';
import { getCategoryBook } from '@/shared/api/codeBook.server';
import { Suspense } from 'react';

// 미리 만든 틀로 누르는 즉시 보이고 바로 쓴다(ADR 0027) — 제목 · 폼은 틀에, 서버에서 받을 것은 약속으로 넘겨 오는 대로 채우고,
// 권한 확인은 Suspense 안의 PermissionGate 가 한다(없으면 «없음»)
export const instant = true;

/** 사용자 · 앨범 분류 · 분류 더하기 권한 — 기다리지 않고 약속으로 넘긴다. 권한을 확인한 뒤에만 내보낸다(없으면 «없음») */
const loadNewAlbum = async (): Promise<AlbumNewData> => {
  const [ctx, book] = await Promise.all([requirePermission('album', 'CREATE'), getCategoryBook()]);
  return {
    userId: ctx.user.id,
    categories: categoryOptions(book, 'ALBUM_CATEGORY'),
    canAddCategory: can(ctx.permissions, 'categories', 'CREATE'),
  };
};

// 새 앨범
export default function AdminAlbumNewPage() {
  return (
    <>
      <PageHeader title="새 앨범" />
      <Suspense fallback={null}>
        <PermissionGate menuKey="album" action="CREATE" />
      </Suspense>
      <AlbumNewForm data={loadNewAlbum()} />
    </>
  );
}
