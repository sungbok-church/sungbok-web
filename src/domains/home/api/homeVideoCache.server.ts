// 홈을 미리 그릴 때 쓰는 영상 피드 — 서버 캐시('use cache', ADR 0024). 서버 전용(`src/app/(site)/page.tsx` 만 import).
// 미리 그린 홈 HTML 에 영상이 들어 있어 첫 화면부터 차 있다(회색 자리표시 · 그게 빠지며 생기는 레이아웃 튐이 없다).
// 60초마다 다시 확인하고 만료는 없다 — 유튜브가 막혀도 마지막 피드로 그린 홈을 계속 보여 준다.
// 페이지를 연 뒤에는 useHomeVideoFeed 가 지금처럼 60초마다 `/api/home-video` 를 다시 확인한다.

import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다 — 키·쿼터는 서버에만

import { cacheLife, cacheTag } from 'next/cache';

import { failureCacheLife, settle, type Settled, unwrap } from '@/shared/api/settled.server';

import type { HomeVideoFeedData } from './homeVideoFeed';
import { fetchHomeVideoFeed } from './homeVideoFeed.server';

// 실패는 던지지 않고 값으로 담는다(settled.server — 캐시 안에서 던지면 빌드가 멈춘다). 실패는 짧게(5초 · 1분) 붙든다.
const cachedFeed = async (): Promise<Settled<HomeVideoFeedData>> => {
  'use cache';
  cacheTag('home-video');
  const settled = await settle(fetchHomeVideoFeed);
  // stale 30초 미만이면 미리 그리기에서 빠진다(cacheLife 문서 «Prerendering behavior») — 그러면 요청마다 그리게 된다
  cacheLife(settled.ok ? { stale: 30, revalidate: 60 } : failureCacheLife(settled));
  return settled;
};

/** 홈 영상 피드 — 실패하면 원래 종류의 오류로 던진다(받는 쪽 loadForPage 가 규칙대로 처리) */
export const loadHomeVideoFeed = async (): Promise<HomeVideoFeedData> => unwrap(await cachedFeed());
