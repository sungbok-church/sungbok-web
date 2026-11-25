import { syncVideoPageIfDue } from '@/domains/worship-video/api/youtubeSync.server';
import { mayWriteSharedDb } from '@/shared/api/sharedDbWrites.server';
import { connection } from 'next/server';

// 임시 점검(2026-11-26) — 운영에서 유튜브 받기가 시작되지 않는 까닭을 본다. 비밀 값은 싣지 않고 있다 · 없다만. 확인 뒤 지운다.
export async function GET() {
  await connection();
  const result = await syncVideoPageIfDue('sunday');
  return Response.json({
    writesAllowed: mayWriteSharedDb(),
    hasSecretKey: !!process.env.SUPABASE_SECRET_KEY,
    hasYoutubeKey: !!process.env.YOUTUBE_API_KEY,
    phase: process.env.NEXT_PHASE ?? null,
    status: result.status,
    ...(result.status === 'failed' && {
      error: String(result.error instanceof Error ? result.error.message : result.error).slice(
        0,
        200
      ),
    }),
  });
}
