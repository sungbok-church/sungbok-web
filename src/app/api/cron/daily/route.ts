import { syncAllVideoPages } from '@/domains/worship-video/api/youtubeSync.server';
import { runDailyCleanup } from '@/shared/api/dailyCleanup.server';
import { createSupabaseAdminClient } from '@/shared/api/supabase/adminClient.server';
import { timingSafeEqual } from 'node:crypto';
import { connection } from 'next/server';

// 하루 한 번 예약 작업(설계 6.9) — vercel.json 의 crons 가 매일 03:00(한국)에 부른다. Vercel 이 환경변수 CRON_SECRET 을
// `Authorization: Bearer …` 로 붙여 부르므로 그 값이 맞을 때만 돈다(값이 없으면 아무도 못 부른다). 만능 키를 쓰는 공개 쪽 파일 중 하나다
// (lint 예외). 정리 뒤 유튜브 재생목록도 받아 둔다(묶음 E). 결과는 함수 로그에 남는다.

const authorized = (header: string | null) => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !header) return false;
  const a = Buffer.from(header.trim());
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function GET(request: Request) {
  await connection();
  if (!authorized(request.headers.get('authorization'))) {
    return Response.json({ ok: false }, { status: 401 });
  }
  // preview 배포도 운영 DB 를 본다 — 브랜치 코드로 운영 행 · 파일 · 영상을 지우거나 바꾸지 않게 운영에서만 돈다
  if (process.env.VERCEL_ENV === 'preview') return Response.json({ ok: true, skipped: 'preview' });
  const db = createSupabaseAdminClient();
  if (!db) {
    console.error('[cron daily] 만능 키가 설정되지 않았습니다');
    return Response.json({ ok: false }, { status: 500 });
  }
  const result = await runDailyCleanup(db);
  // 유튜브 재생목록 → DB(묶음 E) — 방문이 없던 날도 하루 한 번은 받는다(간격과 상관없이). 정리가 실패해도 받는다
  const videos = await syncAllVideoPages(db);
  const videosOk = Object.values(videos).every(s => s !== 'failed');
  if (!result.ok) console.error('[cron daily]', result.error);
  console.info(
    '[cron daily]',
    JSON.stringify({ ...(result.ok && { rows: result.rows, files: result.files }), videos })
  );
  // 하나라도 실패하면 500 — Vercel 의 예약 작업 기록에 실패로 남는다(남은 것은 다음 날 다시)
  if (!result.ok || !videosOk) return Response.json({ ok: false, videos }, { status: 500 });
  return Response.json({ ...result, videos });
}
