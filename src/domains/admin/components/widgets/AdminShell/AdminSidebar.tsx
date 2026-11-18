'use client';

import { activeNavItem, type AdminNavItem } from '@/domains/admin/api/adminNav';
import type { AdminUser } from '@/domains/admin/api/session.server';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/shared/components/ui/sidebar';
import { ChurchIcon, CircleIcon, LayoutDashboardIcon, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { UserMenu } from './UserMenu';

// 메뉴 key → 아이콘. 메뉴 목록은 서버가 넘기고(패키지 2 부터 DB), 아이콘은 화면 코드가 key 로 고른다.
const MENU_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboardIcon,
};

interface Props {
  items: AdminNavItem[];
  user: AdminUser;
}

/**
 * 관리자 왼쪽 메뉴 — 위: 교회 표시, 가운데: 메뉴, 아래: 로그인한 계정(로그아웃).
 * md(768) 이상에서는 아이콘만 남기고 접을 수 있고(Ctrl/⌘+B), 그 아래에서는 시트로 열린다(ui/sidebar — shadcn 원본).
 */
export const AdminSidebar = ({ items, user }: Props) => {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const active = activeNavItem(pathname, items);
  // 좁은 화면의 시트는 항목을 누르면 닫는다
  const closeSheet = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="관리자 첫 화면"
              render={<Link href="/admin" onClick={closeSheet} />}
            >
              <span className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-md">
                <ChurchIcon aria-hidden />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-semibold">성복교회</span>
                <span className="text-sidebar-foreground/70 truncate text-xs">관리자</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label="관리자 메뉴">
              <SidebarMenu>
                {items.map(item => {
                  const Icon = MENU_ICONS[item.key] ?? CircleIcon;
                  const isActive = item.key === active?.key;
                  return (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        render={
                          <Link
                            href={item.href}
                            onClick={closeSheet}
                            aria-current={isActive ? 'page' : undefined}
                          />
                        }
                      >
                        <Icon aria-hidden />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
