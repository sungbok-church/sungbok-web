// 유튜브 재생목록 → DB 동기화(묶음 E — .md/specs/2026-11-25-videos-from-youtube-plan.md). 서버 전용.
// 영상은 유튜브만 관리한다. 사이트는 재생목록을 DB(youtube_videos)에 받아 두고 DB 만 읽는다 — 쿼터 · 유튜브 장애가 화면에 닿지 않게.
// 언제: 영상 페이지의 서버 캐시가 다시 그려질 때(방문이 있을 때 — 10분 간격) · 하루 한 번 예약 작업(간격 없이).
// 여러 서버가 동시에 불러도 한 번만 받고(claim_youtube_sync), 받은 재생목록 전체로 한 트랜잭션에 바꾼다(replace_youtube_videos).
// 쓰기는 만능 키로만 — 공개 쪽에서 만능 키를 쓰는 곳 중 하나(lint 예외).

import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다

import { mayWriteSharedDb } from '@/shared/api/sharedDbWrites.server';
import { createSupabaseAdminClient } from '@/shared/api/supabase/adminClient.server';

import { PLAYLIST_PAGES, WORSHIP_PAGES, type WorshipPage } from '../config/worshipPages';
import { fetchPlaylistRows } from './youtubePlaylist.server';

type Db = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

export type SyncResult =
  | { status: 'synced'; count: number }
  | { status: 'skipped' }
  | { status: 'failed'; error: unknown };

/** 페이지가 다시 그려질 때 받는 간격 */
const EVERY = '10 minutes';

/** 한 페이지 — every 안에 받았거나 다른 곳이 받는 중이면 건너뛴다. 실패는 던지지 않고 결과로(로그는 부르는 쪽) */
export const syncVideoPage = async (
  db: Db,
  page: WorshipPage,
  every: string
): Promise<SyncResult> => {
  try {
    const claim = await db.rpc('claim_youtube_sync', { p_page: page, p_every: every });
    if (claim.error) throw new Error(claim.error.message);
    if (!claim.data) return { status: 'skipped' };
    const rows = await fetchPlaylistRows(WORSHIP_PAGES[page]);
    // 0편이면 바꾸지 않는다 — 재생목록을 실수로 비웠거나 유튜브 응답 모양이 바뀌어 모두 걸러졌을 때 사이트 목록이 통째로
    // 지워지지 않게(한두 편 빠짐은 반영한다). DB 함수도 빈 목록을 거절한다
    if (rows.length === 0) throw new Error(`재생목록에서 받은 영상이 없습니다(${page})`);
    const replaced = await db.rpc('replace_youtube_videos', { p_page: page, p_rows: rows });
    if (replaced.error) throw new Error(replaced.error.message);
    return { status: 'synced', count: rows.length };
  } catch (error) {
    return { status: 'failed', error };
  }
};

/**
 * 영상 페이지가 다시 그려질 때 — 10분이 지났으면 받는다. 받지 않는 때:
 *  · 운영도 로컬 개발도 아닐 때(mayWriteSharedDb — preview 배포 · 운영 키로 띄운 로컬 서버는 읽기만 한다)
 *  · 빌드 중 — 빌드는 캐시 설정이 없는 fetch 를 몰래 캐시해 worker 끼리 나눈다(Next): 차례 잡기 · 바꾸기 RPC 가 실제로
 *    돌지 않고 캐시된 답만 받을 수 있다. 빌드는 DB 에 있는 줄(또는 15분 안 이전 빌드가 읽은 응답 — 같은 몰래 캐시)로
 *    그리고, 받기는 첫 다시 그리기 · 예약 작업이 한다
 *  · 서버 설정(만능 키)이 없을 때(개발 · 시험)
 */
export const syncVideoPageIfDue = async (page: WorshipPage): Promise<SyncResult> => {
  if (!mayWriteSharedDb()) return { status: 'skipped' };
  if (process.env.NEXT_PHASE === 'phase-production-build') return { status: 'skipped' };
  const db = createSupabaseAdminClient();
  if (!db) return { status: 'skipped' };
  const result = await syncVideoPage(db, page, EVERY);
  if (result.status === 'failed') console.error('[youtube sync]', page, result.error);
  return result;
};

/** 하루 한 번 예약 작업 — 간격과 상관없이 모든 재생목록 페이지. 한 페이지가 실패해도 다음 페이지는 받는다 */
export const syncAllVideoPages = async (db: Db): Promise<Record<string, SyncResult['status']>> => {
  const out: Record<string, SyncResult['status']> = {};
  for (const page of PLAYLIST_PAGES) {
    const result = await syncVideoPage(db, page, '0');
    if (result.status === 'failed') console.error('[youtube sync]', page, result.error);
    out[page] = result.status;
  }
  return out;
};
