'use client';

import { signOut } from '@/domains/admin/api/authActions';
import { clearDrafts } from '@/domains/admin/api/formDraft';
import { clearRecentSearches } from '@/domains/admin/api/recentSearches';
import type { AdminUser } from '@/domains/admin/api/session.server';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/shared/components/ui/sidebar';
import { ChevronsUpDownIcon, KeyRoundIcon, LogOutIcon } from 'lucide-react';
import Link from 'next/link';
import { useTransition } from 'react';

/** 왼쪽 메뉴 맨 아래의 로그인한 계정 — 누르면 «로그아웃» 이 나온다(스타터의 nav-user 와 같은 구조). */
export const UserMenu = ({ user, name }: { user: AdminUser; name: string }) => {
  const { isMobile } = useSidebar();
  const [pending, startTransition] = useTransition();
  const shown = name || user.email;
  const initial = (shown[0] ?? '?').toUpperCase();
  const logout = () =>
    startTransition(() => {
      // 쓰던 내용 임시 보관 · 최근 검색 조건은 공용 PC 에 남지 않게 로그아웃 때 지운다(설계 6.10)
      clearDrafts(window.localStorage, user.id);
      clearRecentSearches(window.localStorage, user.id);
      return signOut();
    });

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                aria-label={`계정 메뉴 (${shown})`}
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-left text-sm">{shown}</span>
            <ChevronsUpDownIcon className="ml-auto" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--anchor-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            {/* Base UI 의 메뉴 라벨은 그룹 안에 있어야 한다 */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="truncate font-normal">{user.email}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/admin/password" />}>
                <KeyRoundIcon aria-hidden />
                비밀번호 바꾸기
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {/* 폼으로 감싸지 않고 누른 순간 액션을 부른다 — 메뉴는 고르면 닫히며 DOM 에서 빠지는데,
                  폼 제출이 그 뒤에 일어나면 취소된다 */}
              <DropdownMenuItem disabled={pending} onClick={logout}>
                <LogOutIcon aria-hidden />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
