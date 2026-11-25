// 영상 페이지의 목록 · 설명 — 서버 전용. 예배 페이지(`/worship/sunday` 등) · 교회소식 영상 페이지와 Route Handler(`/api/worship-video/*`)만 import.
// 예배 페이지(재생목록에서 오는 페이지)는 유튜브를 직접 부르지 않고 DB(youtube_videos — 재생목록을 받아 둔 사본, 묶음 E)를 읽는다.
// 다시 그릴 때 10분이 지났으면 먼저 재생목록을 받아 둔다(youtubeSync.server). 목록 페이지는 뒤에서 다시 그려 방문자가 기다리지
// 않지만, 서버 캐시가 비어 요청 안에서 채울 때(빌드 때 안 만든 설교 한 편의 첫 방문 · /api · 자료실 링크가 새로 뜬 서버에
// 닿을 때)는 받는 시간(유튜브 몇 쪽 + DB)을 기다릴 수 있다.
// 분류 · 날짜는 제목 · 설명에서 읽는다(videoRows · sermonParse).

import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다

import { cacheLife, cacheTag } from 'next/cache';

import { failureCacheLife, settle, type Settled, unwrap } from '@/shared/api/settled.server';
import { createSupabaseReadClient } from '@/shared/api/supabase/readClient.server';
import { YoutubeNetworkError } from '@/shared/api/youtubeApi.server';

import type { NewsVideoFeed } from '@/domains/news/api/news.types';
import { newsRepository } from '@/domains/news/api/newsRepository';

import { isWorshipPage, type VideoPage, type WorshipPage } from '../config/worshipPages';
import { newsVideosToSermons } from './newsVideoSermon';
import { rowsToLibrary, type VideoLibrary, type VideoRow } from './videoRows';
import type { Sermon } from './worshipVideo.types';
import { syncVideoPageIfDue } from './youtubeSync.server';

const readRows = async (page: WorshipPage): Promise<VideoRow[]> => {
  const client = createSupabaseReadClient();
  if (!client) throw new Error('DB 설정이 없어 영상을 읽지 못했습니다');
  const { data, error } = await client
    .from('youtube_videos')
    .select('video_id, position, title, description, published_at, added_at, thumbnail, poster')
    .eq('page', page)
    // PostgREST 한 번에 1000줄까지(supabase/config.toml max_rows) — 주일예배 199편. 큰 재생목록을 붙이면 쪽으로 나눠 읽는다
    .order('position');
  if (error) throw new Error(`영상을 읽지 못했습니다: ${error.message}`);
  return data ?? [];
};

// 예배 페이지 — 받을 때가 됐으면 받아 두고, DB 를 읽는다. 유튜브를 못 받아도 DB 의 마지막 목록을 그대로 쓴다.
// DB 가 비었으면(첫 배포에 다른 서버가 받는 중 · 받기 실패 · 설정 없음) 빈 목록이 아니라 실패로 —
// 빈 목록을 10분 캐시하지 않게(운영에서는 직전 페이지 유지, 빌드 때는 화면이 브라우저에서 받는다 — loadForPage).
const collect = async (page: WorshipPage): Promise<VideoLibrary> => {
  const sync = await syncVideoPageIfDue(page);
  const rows = await readRows(page);
  // 받기는 0편이면 바꾸지 않으므로(youtubeSync.server) 비었다면 아직 한 번도 받지 못한 것이다.
  if (rows.length === 0) {
    // 받기 실패는 이미 로그에 남았다(syncVideoPageIfDue) — 같은 오류를 다시 남기지 않게 짧게
    // 받지 않았으면(다른 서버가 받는 중 — 첫 배포 · 새 페이지, 몇 초면 풀린다) «잠시 뒤 풀릴» 실패로: 실패 캐시 5초 · 화면이 다시 시도(503)
    if (sync.status !== 'failed') throw new YoutubeNetworkError('youtube_videos', undefined);
    throw new Error(`받아 둔 영상이 없고 유튜브에서도 받지 못했습니다(${page})`);
  }
  return rowsToLibrary(rows);
};

// 교회소식 영상(주일광고·성복의 뜰)은 유튜브 재생목록이 아니라 등록한 게시글에서 온다 — 유튜브를 부르지 않는다.
const collectNews = async (feed: NewsVideoFeed): Promise<VideoLibrary> => {
  const videos = await newsRepository.videos(feed);
  return {
    sermons: newsVideosToSermons(videos),
    // 같은 영상을 두 번 등록했으면 목록처럼 앞의 글 것을 쓴다(Map 은 뒤의 값이 이긴다 — 그래서 뒤집어 넣는다)
    descriptions: new Map([...videos].reverse().map(v => [v.videoId, v.description ?? ''])),
  };
};

// 영상 페이지의 목록 · 설명은 서버 캐시('use cache')에 둔다(ADR 0024) — 미리 그린 페이지 · /api · 자료실 링크가 같이 쓴다.
// 10분마다 다시 확인하고 만료는 없다. 다시 읽기가 실패하면 그 실패도 짧게(5초 · 1분) 캐시된다 — 옛 목록을 지키는 것은
// DB 의 받아 둔 사본과 페이지 쪽 규칙(loadForPage: 운영 중 실패면 직전 페이지 유지)이다.
// 새 영상은 대개 20분 안에 보인다(두 시계 — 페이지 확인 10분 + 받기 간격 10분, 방문이 있을 때).
export const VIDEO_PAGE_CACHE = { stale: 300, revalidate: 600 } as const;

// 실패는 던지지 않고 값으로 담는다(settled.server — 캐시 안에서 던지면 빌드가 멈춘다). 실패는 짧게(5초 · 1분) 붙든다.
const cachedPage = async (page: VideoPage): Promise<Settled<VideoLibrary>> => {
  'use cache';
  cacheTag(`video-page-${page}`);
  const settled = await settle(() => (isWorshipPage(page) ? collect(page) : collectNews(page)));
  cacheLife(settled.ok ? VIDEO_PAGE_CACHE : failureCacheLife(settled));
  return settled;
};

const collectPage = async (page: VideoPage): Promise<VideoLibrary> =>
  unwrap(await cachedPage(page));

/** 영상 페이지의 영상 전체 — 날짜 최신순. 설명 본문은 무거워 싣지 않는다(fetchSermonDescription). */
export const fetchSermonLibrary = async (page: VideoPage): Promise<Sermon[]> =>
  (await collectPage(page)).sermons;

/**
 * 영상 한 편의 설명 본문(예배 설교는 유튜브 설명에서 설교일 줄을 뺀 것). 그 페이지 목록에 없는 id 는 null —
 * 임의 id 를 퍼부어도 유튜브 · DB 를 더 부르지 않는다(목록과 같은 캐시).
 */
export const fetchSermonDescription = async (
  page: VideoPage,
  videoId: string
): Promise<string | null> => (await collectPage(page)).descriptions.get(videoId) ?? null;
