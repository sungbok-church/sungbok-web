import { fetchSermonLibrary } from '@/domains/worship-video/api/worshipVideo.server';
import { SermonListPage } from '@/domains/worship-video/components/features/SermonListPage';
import type { VideoPage } from '@/domains/worship-video/config/worshipPages';
import { loadForPage } from '@/shared/api/loadForPage.server';

// 설교 목록 페이지 — 서버가 받은 목록(서버 캐시, ADR 0024)을 넘겨 HTML 에 그린다(첫 화면에 목록이 들어 있다 — 검색엔진).
// 실패 규칙은 loadForPage — 운영 중 다시 그리다 실패하면 던져 직전 페이지를 유지하고,
// 빌드(쿼터가 바닥난 날 포함)·개발 서버에서는 화면이 직접 받는다.
export default async function SermonLibrary({ page }: { page: VideoPage }) {
  const sermons = await loadForPage(() => fetchSermonLibrary(page));
  return <SermonListPage page={page} sermons={sermons} />;
}
