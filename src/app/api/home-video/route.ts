import { fetchHomeVideoFeed } from '@/domains/home/api/homeVideoFeed.server';
import { okResponse } from '@/shared/api/result';
import { upstreamErrorResponse } from '@/shared/api/upstreamStatus.server';
import { connection } from 'next/server';

// 브라우저가 60초마다 묻는 최신 피드 — 미리 만들어 두지 않고 요청 때 답한다(ADR 0024). 유튜브 쿼터는 안쪽 fetch 의
// Data Cache(60초)가 지킨다.
// 성공 응답은 Vercel CDN 이 30초 들고 있는다 — 방문자가 많거나 누가 매크로로 두드려도 함수는 지역마다 30초에 한 번만 돈다
// (Hobby 의 함수 호출 · CPU 한도를 방문자 수와 무관하게 지킨다). 대신 라이브 시작 · 종료가 최대 30초 늦게 보인다.
// 이 헤더는 Vercel CDN 만 읽고 브라우저에는 가지 않는다.
const CDN_CACHE = { 'Vercel-CDN-Cache-Control': 'max-age=30' };

export async function GET() {
  await connection();
  try {
    return okResponse(await fetchHomeVideoFeed(), { headers: CDN_CACHE });
  } catch (e) {
    // 쿼터 소진 429 / 유튜브 일시 장애 503 / 그 밖 502 — 화면은 503 만 다시 시도한다. 실패는 CDN 에 담지 않는다.
    return upstreamErrorResponse(e);
  }
}
