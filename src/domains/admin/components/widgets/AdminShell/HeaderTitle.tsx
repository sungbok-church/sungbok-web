'use client';

import { activeNavItem, type AdminNavItem } from '@/domains/admin/api/adminNav';
import { usePathname } from 'next/navigation';

/** 위쪽 막대의 화면 제목 — 지금 메뉴의 이름이다(shadcn dashboard 의 머리와 같은 자리). 페이지는 제목을 따로 그리지 않는다. */
export const HeaderTitle = ({ items }: { items: AdminNavItem[] }) => {
  const label = activeNavItem(usePathname(), items)?.label ?? '관리자';
  return <h1 className="text-foreground m-0 truncate text-base font-medium">{label}</h1>;
};
