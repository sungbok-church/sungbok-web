// 하루 한 번 예약 작업의 몸통(설계 6.9) — 부르는 곳은 /api/cron/daily(만능 키 클라이언트를 넘긴다).
//  ① DB 를 한 번 읽는다(무료 요금제라면 오래 쉬어 멈추는 것을 막는다 — 아래 호출이 그 읽기다. 지금 운영은 Pro)
//  ② purge_expired — 휴지통 30일 · 새가족 1년 · 횟수 제한 기록 하루 · 어느 글에도 붙지 않은 지 8일 넘은 묶음(파일 줄도 함께)
//  ③ orphan_storage_objects — 어느 파일 줄도 가리키지 않는 Storage 파일(8일 지난 것)을 Storage API 로 지운다.
//     한 번에 1000개까지, 100개씩 나눠 지운다. 남으면 다음 날 이어서.
import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다

import type { createSupabaseReadClient } from './supabase/readClient.server';

// 클라이언트 모양(SupabaseClient<Database>) — 라이브러리를 여기서 직접 가져오지 않는다(공개 쪽 lint 경계). 실제로는 만능 키 클라이언트
type Db = NonNullable<ReturnType<typeof createSupabaseReadClient>>;

const BUCKET = 'media';
const LIMIT = 1000;
const CHUNK = 100;

export type CleanupResult =
  { ok: true; rows: Record<string, number>; files: number } | { ok: false; error: string };

export const runDailyCleanup = async (db: Db): Promise<CleanupResult> => {
  const purged = await db.rpc('purge_expired');
  // 행 지우기가 실패하면 파일은 건드리지 않는다
  if (purged.error) return { ok: false, error: purged.error.message };

  const orphans = await db.rpc('orphan_storage_objects', { p_limit: LIMIT });
  if (orphans.error) return { ok: false, error: orphans.error.message };
  const paths = (orphans.data ?? []) as string[];
  for (let i = 0; i < paths.length; i += CHUNK) {
    const { error } = await db.storage.from(BUCKET).remove(paths.slice(i, i + CHUNK));
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true, rows: (purged.data ?? {}) as Record<string, number>, files: paths.length };
};
