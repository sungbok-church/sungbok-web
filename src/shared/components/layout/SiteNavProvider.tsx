'use client';

import { type NavSection, sections } from '@/shared/config/siteNav';
import { createContext, type PropsWithChildren, useContext } from 'react';

// 공개 화면이 그릴 홈페이지 메뉴(설계 6.5) — `(site)` 레이아웃이 서버에서 한 번 읽어(loadSiteNav — DB 덮어쓰기 · 끈 메뉴 빠짐)
// 넘기고, 독 · 휴대폰 메뉴 · 섹션 머리가 같은 값을 쓴다. 바깥(관리자 미리보기 · 시험)에서는 코드 메뉴 그대로.
const SiteNavContext = createContext<readonly NavSection[]>(sections);

export const SiteNavProvider = ({
  nav,
  children,
}: PropsWithChildren<{ nav: readonly NavSection[] }>) => (
  <SiteNavContext value={nav}>{children}</SiteNavContext>
);

export const useSiteNav = () => useContext(SiteNavContext);
