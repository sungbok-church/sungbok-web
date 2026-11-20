import { fetchHomeVideoFeed } from '@/domains/home/api/homeVideoFeed.server';
import { okResponse } from '@/shared/api/result';
import { upstreamErrorResponse } from '@/shared/api/upstreamStatus.server';
import { connection } from 'next/server';

// 브라우저가 60초마다 묻는 최신 피드 — 요청 때마다 답한다(미리 만들어 두지 않는다, ADR 0024). 유튜브 쿼터는 안쪽 fetch 의
// Data Cache(60초)가 지킨다.
export async function GET() {
  await connection();
  try {
    return okResponse(await fetchHomeVideoFeed());
  } catch (e) {
    // 쿼터 소진 429 / 유튜브 일시 장애 503 / 그 밖 502 — 화면은 503 만 다시 시도한다
    return upstreamErrorResponse(e);
  }
}
