'use client';

import {
  activeNavItem,
  type AdminNavGroup,
  type AdminNavItem,
  flattenNav,
} from '@/domains/admin/lib/adminNav';
import type { AdminUser } from '@/domains/admin/api/server/session.server';
import { MENU_ICONS } from '@/domains/admin/components/features/MenuIcon';
import { IntentLink } from '@/domains/admin/components/features/IntentLink';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/shared/components/ui/sidebar';
import { ChevronRightIcon, ChurchIcon, CircleIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { UserMenu } from './UserMenu';

interface Props {
  nav: AdminNavGroup[];
  user: AdminUser;
  /** 사용자 정보의 이름(없으면 이메일을 보여 준다) */
  userName: string;
}

/**
 * 관리자 왼쪽 메뉴 — 대메뉴(콘텐츠 · 사이트 화면 · 접수 · 시스템) › 세부 메뉴(스타터 `next-shadcn-dashboard-starter` 의
 * app-sidebar 와 같은 구조, ADR 0017). 펼친 상태: 대메뉴를 눌러 접고 펼친다(Collapsible). 아이콘만 남긴 상태: 대메뉴를 누르면
 * 세부 메뉴가 오른쪽에 뜬다(DropdownMenu). 지금 화면만 강조하고, 그 대메뉴는 글씨만 굵게(한 화면에 강조 하나).
 * md(768) 아래에서는 시트로 열린다(ui/sidebar — shadcn 원본).
 */
export const AdminSidebar = ({ nav, user, userName }: Props) => {
  const pathname = usePathname();
  const { isMobile, state, setOpenMobile } = useSidebar();
  const active = activeNavItem(pathname, flattenNav(nav));
  const collapsed = state === 'collapsed' && !isMobile;
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
              render={<IntentLink href="/admin" onClick={closeSheet} />}
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
        <nav aria-label="관리자 메뉴" className="contents">
          <SidebarGroup>
            <SidebarGroupLabel>메뉴</SidebarGroupLabel>
            <SidebarMenu>
              {nav.map(group => {
                // 묶음 밖의 화면(첫 화면)은 바로 가는 항목
                if (!group.label) {
                  return group.items.map(item => (
                    <LeafItem
                      key={item.key}
                      item={item}
                      active={item.key === active?.key}
                      onNavigate={closeSheet}
                    />
                  ));
                }
                const Icon = MENU_ICONS[group.key] ?? CircleIcon;
                const hasActive = group.items.some(i => i.key === active?.key);
                if (collapsed) {
                  return (
                    <SidebarMenuItem key={group.key}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <SidebarMenuButton
                              tooltip={group.label}
                              className={hasActive ? 'font-medium' : undefined}
                            />
                          }
                        >
                          <Icon aria-hidden />
                          <span>{group.label}</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          side="right"
                          align="start"
                          sideOffset={16}
                          className="min-w-56"
                        >
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                          </DropdownMenuGroup>
                          <DropdownMenuGroup>
                            {group.items.map(item => {
                              const ItemIcon = MENU_ICONS[item.key] ?? CircleIcon;
                              return (
                                <DropdownMenuItem
                                  key={item.key}
                                  render={<IntentLink href={item.href} />}
                                >
                                  <ItemIcon aria-hidden />
                                  {item.label}
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  );
                }
                return (
                  <Collapsible key={group.key} defaultOpen render={<SidebarMenuItem />}>
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          tooltip={group.label}
                          className={
                            hasActive ? 'group/collapsible font-medium' : 'group/collapsible'
                          }
                        />
                      }
                    >
                      <Icon aria-hidden />
                      <span>{group.label}</span>
                      <ChevronRightIcon
                        aria-hidden
                        className="ml-auto transition-transform duration-200 group-data-panel-open/collapsible:rotate-90"
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {group.items.map(item => {
                          const isActive = item.key === active?.key;
                          return (
                            <SidebarMenuSubItem key={item.key}>
                              <SidebarMenuSubButton
                                isActive={isActive}
                                render={
                                  <IntentLink
                                    href={item.href}
                                    onClick={closeSheet}
                                    aria-current={isActive ? 'page' : undefined}
                                  />
                                }
                              >
                                <span>{item.label}</span>
                                <CountBadge count={item.badge} />
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </nav>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu user={user} name={userName} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

const LeafItem = ({
  item,
  active,
  onNavigate,
}: {
  item: AdminNavItem;
  active: boolean;
  onNavigate: () => void;
}) => {
  const Icon = MENU_ICONS[item.key] ?? CircleIcon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={item.label}
        render={
          <IntentLink
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
          />
        }
      >
        <Icon aria-hidden />
        <span>{item.label}</span>
      </SidebarMenuButton>
      {item.badge ? (
        <SidebarMenuBadge aria-label={`처리할 것 ${item.badge}건`}>{item.badge}</SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
};

/** 처리할 건수(하위 메뉴용 — 원본 SidebarMenuBadge 는 대메뉴 단추 옆 자리라 하위 메뉴에서는 줄 끝 글자로) */
const CountBadge = ({ count }: { count?: number }) =>
  count ? (
    <span
      aria-label={`처리할 것 ${count}건`}
      className="bg-primary text-primary-foreground ml-auto rounded-full px-1.5 text-xs font-medium tabular-nums"
    >
      {count}
    </span>
  ) : null;
