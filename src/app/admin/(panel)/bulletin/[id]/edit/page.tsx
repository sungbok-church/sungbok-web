import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { loadBulletin } from '@/domains/admin/api/server/bulletin.server';
import { Deferred } from '@/domains/admin/components/features/Deferred';
import { FormScreenSkeleton } from '@/domains/admin/components/features/ScreenSkeleton';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { BulletinForm } from '@/domains/admin/components/widgets/BulletinForm';
import { issueLongDate } from '@/domains/news/api/bulletinList';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { notFound } from 'next/navigation';
import { z } from 'zod';

// 수정 폼은 원래 값이 있어야 그릴 수 있어 화면 전체를 서버에서 오는 대로 그린다 — 오기 전에는 폼 뼈대(Deferred — ADR 0027)
export const instant = true;

type Params = Promise<{ id: string }>;

// 주보 수정 — 상세에서 [수정] 으로 들어온다. 저장하면 상세로. 휴지통에 든 주보는 고치지 않는다(복구한 뒤에).
export default function AdminBulletinEditPage({ params }: { params: Params }) {
  return <Deferred content={bulletinEdit(params)} fallback={<FormScreenSkeleton />} />;
}

/** 화면 전체(머리 · 수정 폼) — 권한을 확인하고(없으면 «없음») 읽어 그린다 */
const bulletinEdit = async (params: Params) => {
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
};
