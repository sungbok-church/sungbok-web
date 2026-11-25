// 상위 메뉴 주소(`/about`)의 넘김(설계 6.5 · ADR 0026) — 켜진 첫 하위로 307, 섹션이 통째로 꺼졌으면 404.
// 페이지가 아니라 경로 처리기(route.ts)다: 페이지에서 넘기면 미리 그린 틀 뒤에 흘려보내는 부분에서 넘겨 200 + 브라우저 넘김이
// 되고(검색 로봇 · 스크립트 없는 브라우저는 못 따라간다), 미리 그린 넘김은 메뉴가 바뀌어도 다시 그려지지 않았다(2026-11-25
// 로컬 실측). 메뉴 읽기는 캐시라 요청마다 DB 를 읽지는 않는다. DB 를 못 읽으면 코드 메뉴의 첫 하위로.
import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다

import { sectionLanding } from '@/shared/config/siteMenu';
import { sections } from '@/shared/config/siteNav';

import { loadSiteNav } from './siteNavLoad.server';

// 메뉴를 못 읽으면(운영에서 loadSiteNav 는 던진다 — 페이지라면 직전 페이지가 남지만 경로 처리기에는 남길 응답이 없다) 코드 메뉴로.
const navOrCode = () =>
  loadSiteNav().catch(error => {
    console.error('[sectionLanding]', error);
    return sections;
  });

export const sectionLandingRoute = (slug: string) =>
  async function GET(request: Request) {
    const href = sectionLanding(await navOrCode(), slug);
    if (!href) return new Response(null, { status: 404 });
    // 쿼리는 이어 준다(예전 next.config 넘김과 같게 — 공유 링크의 utm 등)
    const target = new URL(href, request.url);
    target.search = new URL(request.url).search;
    return Response.redirect(target, 307);
  };
