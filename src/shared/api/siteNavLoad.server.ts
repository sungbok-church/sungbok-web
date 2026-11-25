// 홈페이지 메뉴 읽기(설계 6.5 · 6.9) — 코드 메뉴(siteNav)에 DB 의 이름 · 순서 · 사용 여부를 덮어쓴다. 공개 키로, 서버에서만.
// 서버 캐시에 태그(SITE_MENU_TAG)를 달아 관리자가 메뉴를 저장하면 바로 바뀐다. DB 를 못 읽으면 운영에서는 직전 페이지를 유지하고,
// 그것도 없을 때(빌드 · 개발 서버)는 코드 메뉴 그대로 그린다 — 메뉴 때문에 사이트가 깨지지 않는다.
import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다

import { loadForPage } from '@/shared/api/loadForPage.server';
import { failureCacheLife, settle, unwrap } from '@/shared/api/settled.server';
import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { createSupabaseReadClient } from '@/shared/api/supabase/readClient.server';
import { mergeSiteNav, SITE_MENU_TAG, type SiteMenuOverride } from '@/shared/config/siteMenu';
import { type NavSection, siteNav } from '@/shared/config/siteNav';
import { cacheLife, cacheTag } from 'next/cache';

const readOverrides = async (): Promise<SiteMenuOverride[]> => {
  const client = readSupabaseEnv() ? createSupabaseReadClient() : null;
  if (!client) return [];
  const { data, error } = await client
    .from('menus')
    .select('path, label, sort, is_active')
    .eq('area', 'SITE');
  if (error) throw new Error(`홈페이지 메뉴를 읽지 못했습니다: ${error.message}`);
  return (data ?? []).flatMap(r =>
    r.path ? [{ path: r.path, label: r.label, sort: r.sort, active: r.is_active }] : []
  );
};

// stale 300 — 30 이면 빠른 이동용 틀(App Shell)에서 빠진다(홈 히어로와 같다). 다시 읽기는 한 시간 — 모든 공개 페이지가 이 값을
// 레이아웃에서 읽으므로 짧으면 페이지마다 그만큼 자주 다시 그린다. 관리자 저장은 태그(updateTag)로 바로 바뀐다
const cachedOverrides = async () => {
  'use cache';
  cacheTag(SITE_MENU_TAG);
  const settled = await settle(readOverrides);
  cacheLife(settled.ok ? { stale: 300, revalidate: 3600 } : failureCacheLife(settled));
  return settled;
};

/** 공개 화면이 그릴 홈페이지 메뉴(끈 메뉴는 빠진다) */
export const loadSiteNav = async (): Promise<NavSection[]> =>
  mergeSiteNav(siteNav, (await loadForPage(async () => unwrap(await cachedOverrides()))) ?? []);
