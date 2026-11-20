import { type NextRequest } from 'next/server';

import { fetchSermonDescription } from '@/domains/worship-video/api/worshipVideo.server';
import { isVideoPage } from '@/domains/worship-video/config/worshipPages';
import { errorResponse, okResponse } from '@/shared/api/result';
import { upstreamErrorResponse } from '@/shared/api/upstreamStatus.server';

// 설교 한 편의 유튜브 설명 글 — 고른 영상 것만 받는다(목록에 다 실으면 페이지가 수백 KB 무거워진다).
// 목록과 같은 Data Cache(1시간)에서 꺼내므로 유튜브를 더 부르지 않고, 그 페이지 목록에 없는 영상은 404.
export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get('page');
  const videoId = req.nextUrl.searchParams.get('v');
  if (!isVideoPage(page))
    return errorResponse('INVALID_INPUT', { fields: { page: ['없는 페이지입니다.'] } });
  if (!videoId)
    return errorResponse('INVALID_INPUT', { fields: { v: ['영상 id 가 필요합니다.'] } });

  try {
    const body = await fetchSermonDescription(page, videoId);
    if (body === null) return errorResponse('NOT_FOUND');
    return okResponse({ body });
  } catch (e) {
    return upstreamErrorResponse(e);
  }
}
