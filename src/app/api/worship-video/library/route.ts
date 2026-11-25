import { type NextRequest } from 'next/server';

import { fetchSermonLibrary } from '@/domains/worship-video/api/worshipVideo.server';
import { isVideoPage } from '@/domains/worship-video/config/worshipPages';
import { errorResponse, okResponse } from '@/shared/api/result';
import { upstreamErrorResponse } from '@/shared/api/upstreamStatus.server';

// 예배 페이지의 설교 목록 — 서버가 미리 싣지 못했을 때(빌드 중 실패 등) 화면이 직접 받는다.
// 목록은 서버 캐시(받아 둔 DB 사본 — 묶음 E)에서 오므로 방문자 수만큼 유튜브를 부르지 않는다.
// page 는 설정(config/worshipPages)에 있는 이름만 — 임의 재생목록으로 쿼터를 쓰지 못하게.
export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get('page');
  if (!isVideoPage(page))
    return errorResponse('INVALID_INPUT', { fields: { page: ['없는 페이지입니다.'] } });

  try {
    return okResponse(await fetchSermonLibrary(page));
  } catch (e) {
    // 쿼터 소진 429 / 유튜브 일시 장애 503 / 그 밖 502 — 화면은 503 만 다시 시도한다
    return upstreamErrorResponse(e);
  }
}
