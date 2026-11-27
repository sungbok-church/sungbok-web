import { loadAdminContext, PASSWORD_PATH } from '@/domains/admin/api/server/adminContext.server';
import { AdminShell } from '@/domains/admin/components/widgets/AdminShell';
import { prefillPaths } from '@/domains/admin/lib/screenPrefill';
import { Toaster } from '@/shared/components/ui/toast';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// 로그인해야 보이는 관리자 화면의 틀. proxy 가 먼저 걸러 내지만 여기서 한 번 더 확인한다.
// 왼쪽 메뉴는 DB 메뉴 중 권한이 있는 것만(adminContext.server). 페이지는 각자 requirePermission 으로 다시 확인한다.
export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, profile, permissions, nav } = await loadAdminContext();
  // 첫 로그인 · 비밀번호 초기화 뒤에는 비밀번호부터 바꾼다(그 화면은 이 묶음 밖에 있다)
  if (profile.mustChangePassword) redirect(PASSWORD_PATH);
  // 왼쪽 메뉴를 접어 뒀으면 접힌 채로 그린다(ui/sidebar 가 접을 때 적는 쿠키)
  const sidebarOpen = (await cookies()).get('sidebar_state')?.value !== 'false';
  return (
    // 저장 · 삭제 결과 알림(notifyResult)이 뜨는 자리
    <Toaster>
      <AdminShell
        user={user}
        userName={profile.name}
        nav={nav}
        defaultOpen={sidebarOpen}
        prefill={{
          // Vercel 이 배포마다 주는 값(실행 중에도 읽힌다 — 같은 커밋을 다시 배포해도 바뀐다). 로컬에는 없다
          deployId: process.env.VERCEL_DEPLOYMENT_ID ?? '',
          paths: prefillPaths(nav, permissions),
        }}
      >
        {children}
      </AdminShell>
    </Toaster>
  );
}
