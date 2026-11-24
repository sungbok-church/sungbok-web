import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { BulletinForm } from '@/domains/admin/components/widgets/BulletinForm';
import { isCalendarDate, seoulToday, upcomingSunday } from '@/domains/admin/lib/content';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 새 주보 — 날짜는 이번 주일로 채워 둔다(칸에서 바꿀 수 있다). 첫 화면 «이번 주 주보» 카드는 ?date= 로 날짜를 넘긴다.
export default async function AdminBulletinNewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ user }, sp] = await Promise.all([requirePermission('bulletin', 'CREATE'), searchParams]);
  const asked = typeof sp.date === 'string' && isCalendarDate(sp.date) ? sp.date : null;
  // 요청마다 지금 시각 기준(서버 컴포넌트)
  const date = asked ?? upcomingSunday(seoulToday(new Date().getTime()));
  return (
    <>
      <PageHeader title="새 주보" />
      <BulletinForm userId={user.id} initial={{ date, pages: [] }} />
    </>
  );
}
