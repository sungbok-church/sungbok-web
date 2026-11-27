import type { AdminNavGroup, Permission } from '@/domains/admin/lib/adminNav';
import { AdminSessionProvider } from '@/domains/admin/components/features/AdminSession';
import type { AdminUser } from '@/domains/admin/api/server/session.server';
import { Separator } from '@/shared/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/shared/components/ui/sidebar';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import { type ReactNode, Suspense } from 'react';

import { CommandMenu } from '@/domains/admin/components/features/CommandMenu';
import { NavigationProgress } from '@/domains/admin/components/features/NavigationProgress';
import { PendingScreen } from '@/domains/admin/components/features/PendingScreen';
import { ScreenPrefill } from '@/domains/admin/components/features/ScreenPrefill';

import { AdminSidebar } from './AdminSidebar';
import { HeaderBreadcrumbs } from './HeaderTitle';

interface Props {
  user: AdminUser;
  /** 왼쪽 메뉴 — 권한이 있는 화면만(서버가 DB 메뉴와 권한으로 만든다, adminContext.server) */
  nav: AdminNavGroup[];
  /** 로그인한 사람의 권한 — 화면의 미리 만든 틀이 머리 단추를 보일지 정한다(AdminSession, 막는 것은 서버) */
  permissions: Permission[];
  userName: string;
  /** 왼쪽 메뉴를 펼친 채로 시작할지 — 지난번에 접어 뒀으면 false(쿠키 `sidebar_state`) */
  defaultOpen?: boolean;
  /**
   * 배포마다 한 번 미리 받을 화면(ScreenPrefill) — deployId 는 이 배포의 표시(없으면 로컬 개발이라 받지 않는다),
   * paths 는 메뉴 화면 · 등록 화면(prefillPaths)
   */
  prefill: { deployId: string; paths: string[] };
  children: ReactNode;
}

/**
 * 관리자 화면의 틀 — shadcn 의 sidebar 부품과 dashboard 배치(왼쪽 메뉴 + 위쪽 막대 + 본문)를 원본 값 그대로 쓰고
 * 색만 이 사이트의 팔레트다(ADR 0016). md(768) 이상은 접을 수 있는 왼쪽 메뉴, 그 아래는 시트.
 * 공개 사이트의 헤더·푸터·부드러운 스크롤은 없다.
 */
export const AdminShell = ({
  user,
  userName,
  nav,
  permissions,
  defaultOpen = true,
  prefill,
  children,
}: Props) => (
  // 접힌 메뉴에 올리면 이름이 바로 뜨게 한다 — 제공자가 없으면 Base UI 기본값(600ms 뒤)이 쓰인다
  <AdminSessionProvider value={{ userId: user.id, nav, permissions }}>
    <TooltipProvider>
      {/* 화면 이동 중 위쪽 진행 표시줄 — 주소 조건(useSearchParams)을 읽으므로 Suspense 안에 둔다 */}
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <ScreenPrefill deployId={prefill.deployId} paths={prefill.paths} />
      <SidebarProvider defaultOpen={defaultOpen}>
        <AdminSidebar nav={nav} user={user} userName={userName} />
        <SidebarInset className="min-w-0">
          <header className="bg-card flex h-14 shrink-0 items-center gap-3 border-b px-3 md:px-4">
            <div className="flex min-w-0 flex-1 items-center">
              <SidebarTrigger />
              <Separator
                orientation="vertical"
                className="mr-3 ml-1.5 data-vertical:h-4 data-vertical:self-center"
              />
              <HeaderBreadcrumbs nav={nav} />
            </div>
            <CommandMenu nav={nav} />
          </header>
          <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6">
            {/* 다른 화면으로 가는 동안 누르는 순간 뼈대를 그린다(서버의 loading.tsx 대신) */}
            <PendingScreen>{children}</PendingScreen>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  </AdminSessionProvider>
);
