import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { PermissionGate } from '@/domains/admin/components/features/PermissionGate';
import {
  type BulletinNewData,
  BulletinNewForm,
} from '@/domains/admin/components/widgets/BulletinForm/BulletinNewForm';
import { isCalendarDate, seoulToday, upcomingSunday } from '@/domains/admin/lib/content';
import { Suspense } from 'react';

// 미리 만든 틀로 누르는 즉시 보이고 바로 쓴다(ADR 0027) — 제목 · 폼은 틀에, 날짜 · 사용자는 약속으로 넘겨 오는 대로 채우고,
// 권한 확인은 Suspense 안의 PermissionGate 가 한다(없으면 «없음»)
export const instant = true;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** 사용자 · 날짜(주소의 ?date= — 첫 화면 «이번 주 할 일» 이 단다, 없으면 이번 주일 · 요청 때의 서버 시각) */
const loadNewBulletin = async (searchParams: SearchParams): Promise<BulletinNewData> => {
  const [ctx, sp] = await Promise.all([requirePermission('bulletin', 'CREATE'), searchParams]);
  const asked = typeof sp.date === 'string' && isCalendarDate(sp.date) ? sp.date : null;
  return {
    userId: ctx.user.id,
    date: asked ?? upcomingSunday(seoulToday(new Date().getTime())),
  };
};

// 새 주보
export default function AdminBulletinNewPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageHeader title="새 주보" />
      <Suspense fallback={null}>
        <PermissionGate menuKey="bulletin" action="CREATE" />
      </Suspense>
      <BulletinNewForm data={loadNewBulletin(searchParams)} />
    </>
  );
}
