import { loadSiteNav } from '@/shared/api/siteNavLoad.server';
import { menuLabel } from '@/shared/config/siteMenu';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * 홈페이지 메뉴 한 칸의 레이아웃(설계 6.5) — 메뉴 페이지 폴더마다 둔다(`about/staff/layout.tsx` 등, siteNav.test 가 잠근다).
 *  · 그 메뉴가 꺼져 있으면 없는 페이지(404) — 그 아래 글 페이지(주보 한 호 등)도 함께.
 *  · 브라우저 제목은 메뉴 이름(관리자에서 바꾼 이름) — 글 페이지는 자기 제목이 이것을 덮는다.
 */
export const siteMenuRoute = (path: string) => ({
  generateMetadata: async (): Promise<Metadata> => {
    const label = menuLabel(await loadSiteNav(), path);
    return label ? { title: `${label} | 성복교회` } : {};
  },
  Layout: async ({ children }: { children: ReactNode }) => {
    if (!menuLabel(await loadSiteNav(), path)) notFound();
    return children;
  },
});
