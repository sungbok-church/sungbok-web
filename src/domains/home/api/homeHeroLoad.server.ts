// 홈 히어로 읽기(설계 6.12 · 6.9) — 관리자가 고른 종류 · 대표 사진을 공개 키로, 서버에서만 읽는다. 서버 캐시에 태그(HOME_HERO_TAG)를
// 달아 관리자가 저장하면 바로 바뀐다. DB 를 못 읽으면 운영에서는 직전 홈을 유지하고, 그것도 없을 때(첫 빌드 실패 등)만 레포에
// 남겨 둔 사진 한 장으로 그린다 — 장애 대비용이지 설정값이 아니다(설계 6.12 · 11절 23번).
import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다

import { loadForPage } from '@/shared/api/loadForPage.server';
import { failureCacheLife, settle, unwrap } from '@/shared/api/settled.server';
import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { createSupabaseReadClient } from '@/shared/api/supabase/readClient.server';
import { cacheLife, cacheTag } from 'next/cache';

import mainExterior from '@/assets/images/main/main01.webp';

import { type HomeHeroData, type HomeHeroRow, rowToHomeHero } from './homeHero';
import { HOME_HERO_TAG } from './homeTags';

/** 장애 대비 — DB 를 한 번도 읽지 못했을 때만 */
export const HOME_HERO_FALLBACK: HomeHeroData = {
  kind: 'photo',
  photo: mainExterior,
  alt: '성복교회 전경',
  videoId: null,
};

const readHomeHero = async (): Promise<HomeHeroData | null> => {
  const env = readSupabaseEnv();
  const client = env ? createSupabaseReadClient() : null;
  if (!env || !client) return null;
  const { data, error } = await client
    .from('home_hero')
    .select(
      'kind, youtube_video_id, photo:file_lists(files(path, kind, width, height, alt, sort, variants))'
    )
    .maybeSingle();
  if (error) throw new Error(`홈 히어로를 읽지 못했습니다: ${error.message}`);
  return data ? rowToHomeHero(env.url, data as unknown as HomeHeroRow) : null;
};

// stale 300 — 30 이면 빠른 이동용 틀(App Shell)에서 빠진다(주보와 같다)
const cachedHomeHero = async () => {
  'use cache';
  cacheTag(HOME_HERO_TAG);
  const settled = await settle(readHomeHero);
  cacheLife(settled.ok ? { stale: 300, revalidate: 60 } : failureCacheLife(settled));
  return settled;
};

export const loadHomeHero = async (): Promise<HomeHeroData> =>
  (await loadForPage(async () => unwrap(await cachedHomeHero()))) ?? HOME_HERO_FALLBACK;
