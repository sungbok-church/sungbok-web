import { ADMIN_NAV } from '@/domains/admin/api/adminNav';
import type { AdminUser } from '@/domains/admin/api/session.server';
import { Separator } from '@/shared/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/shared/components/ui/sidebar';
import { TooltipProvider } from '@/shared/components/ui/tooltip';
import type { ReactNode } from 'react';

import { AdminSidebar } from './AdminSidebar';
import { HeaderTitle } from './HeaderTitle';

interface Props {
  user: AdminUser;
  /** 왼쪽 메뉴를 펼친 채로 시작할지 — 지난번에 접어 뒀으면 false(쿠키 `sidebar_state`) */
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * 관리자 화면의 틀 — shadcn 의 sidebar 부품과 dashboard 배치(왼쪽 메뉴 + 위쪽 막대 + 본문)를 원본 값 그대로 쓰고
 * 색만 이 사이트의 팔레트다(ADR 0016). md(768) 이상은 접을 수 있는 왼쪽 메뉴, 그 아래는 시트.
 * 공개 사이트의 헤더·푸터·부드러운 스크롤은 없다.
 */
export const AdminShell = ({ user, defaultOpen = true, children }: Props) => (
  // 접힌 메뉴에 올리면 이름이 바로 뜨게 한다 — 제공자가 없으면 Base UI 기본값(600ms 뒤)이 쓰인다
  <TooltipProvider>
    <SidebarProvider defaultOpen={defaultOpen}>
      <AdminSidebar items={ADMIN_NAV} user={user} />
      <SidebarInset className="min-w-0">
        <header className="bg-card flex h-12 shrink-0 items-center gap-1 border-b px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
          <HeaderTitle items={ADMIN_NAV} />
        </header>
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  </TooltipProvider>
);
