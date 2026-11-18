import { requireAdminUser } from '@/domains/admin/api/session.server';
import { AdminShell } from '@/domains/admin/components/widgets/AdminShell';
import { cookies } from 'next/headers';

// 로그인해야 보이는 관리자 화면의 틀. proxy 가 먼저 걸러 내지만 여기서 한 번 더 확인한다.
export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAdminUser();
  // 왼쪽 메뉴를 접어 뒀으면 접힌 채로 그린다(ui/sidebar 가 접을 때 적는 쿠키)
  const sidebarOpen = (await cookies()).get('sidebar_state')?.value !== 'false';
  return (
    <AdminShell user={user} defaultOpen={sidebarOpen}>
      {children}
    </AdminShell>
  );
}
