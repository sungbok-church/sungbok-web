import { runDailyCleanup } from '@/shared/api/dailyCleanup.server';
import { createSupabaseAdminClient } from '@/shared/api/supabase/adminClient.server';
import { timingSafeEqual } from 'node:crypto';
import { connection } from 'next/server';

// 하루 한 번 예약 작업(설계 6.9) — vercel.json 의 crons 가 매일 03:00(한국)에 부른다. Vercel 이 환경변수 CRON_SECRET 을
// `Authorization: Bearer …` 로 붙여 부르므로 그 값이 맞을 때만 돈다(값이 없으면 아무도 못 부른다). 만능 키는 여기서만 쓴다
// (lint 예외 — 공개 쪽에서 만능 키를 쓰는 곳은 이 파일과 새가족 접수뿐). 결과는 함수 로그에 남는다.

const authorized = (header: string | null) => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function GET(request: Request) {
  await connection();
  if (!authorized(request.headers.get('authorization'))) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const db = createSupabaseAdminClient();
  if (!db) {
    console.error('[cron daily] 만능 키가 설정되지 않았습니다');
    return Response.json({ ok: false }, { status: 500 });
  }
  const result = await runDailyCleanup(db);
  if (!result.ok) {
    console.error('[cron daily]', result.error);
    return Response.json({ ok: false }, { status: 500 });
  }
  console.info('[cron daily]', JSON.stringify({ rows: result.rows, files: result.files }));
  return Response.json(result);
}
