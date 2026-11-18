'use client';

import { signOut } from '@/domains/admin/api/authActions';
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
import { ChevronsUpDownIcon, LogOutIcon } from 'lucide-react';
import { useTransition } from 'react';

/** 왼쪽 메뉴 맨 아래의 로그인한 계정 — 누르면 «로그아웃» 이 나온다(스타터의 nav-user 와 같은 구조). */
export const UserMenu = ({ user }: { user: AdminUser }) => {
  const { isMobile } = useSidebar();
  const [pending, startTransition] = useTransition();
  // 이름 칸은 패키지 2(profiles)에서 생긴다 — 그때까지는 이메일의 첫 글자와 이메일을 보여 준다.
  const initial = (user.email[0] ?? '?').toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                aria-label={`계정 메뉴 (${user.email})`}
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-left text-sm">{user.email}</span>
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
              {/* 폼으로 감싸지 않고 누른 순간 액션을 부른다 — 메뉴는 고르면 닫히며 DOM 에서 빠지는데,
                  폼 제출이 그 뒤에 일어나면 취소된다 */}
              <DropdownMenuItem disabled={pending} onClick={() => startTransition(() => signOut())}>
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
