import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { loadBulletin } from '@/domains/admin/api/server/bulletin.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { BulletinForm } from '@/domains/admin/components/widgets/BulletinForm';
import { issueLongDate } from '@/domains/news/api/bulletinList';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { notFound } from 'next/navigation';
import { z } from 'zod';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 주보 수정 — 상세에서 [수정] 으로 들어온다. 저장하면 상세로. 휴지통에 든 주보는 고치지 않는다(복구한 뒤에).
export default async function AdminBulletinEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  // 권한 확인과 함께 읽는다 — 권한이 없으면 404 로 끊고 읽은 값은 버린다(막는 것은 RLS)
  const [{ user }, bulletin] = await Promise.all([
    requirePermission('bulletin', 'UPDATE'),
    loadBulletin(supabase, id),
  ]);
  if (!bulletin || bulletin.trashed) notFound();

  return (
    <>
      <PageHeader title={`${issueLongDate(bulletin.date)} 주보`} />
      <BulletinForm
        key={bulletin.updatedAt}
        userId={user.id}
        initial={{ date: bulletin.date, pages: bulletin.pages }}
        editing={{ id: bulletin.id, updatedAt: bulletin.updatedAt, status: bulletin.status }}
      />
    </>
  );
}
