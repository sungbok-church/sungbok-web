import {
  fetchSermonDescription,
  fetchSermonLibrary,
} from '@/domains/worship-video/api/worshipVideo.server';
import { SermonWatchPage } from '@/domains/worship-video/components/features/SermonWatchPage';
import type { VideoPage } from '@/domains/worship-video/config/worshipPages';
import { resourceRepository } from '@/domains/resources/api/resourceRepository';
import { toSheetLinks } from '@/domains/resources/api/sheetLinks';
import { loadForPage } from '@/shared/api/loadForPage.server';
import { notFound } from 'next/navigation';

// 영상 한 편 페이지 — 목록(옆 목록·이전/다음)과 이 영상의 설명 글을 서버가 받아(서버 캐시, ADR 0024) 넘긴다(HTML 에 들어간다).
// 예배 설교(/worship/…)와 교회소식 영상(/news/announcements·garden)이 같이 쓴다.
// 목록에 없는 영상(지워졌거나 잘못된 주소)이면 404. 목록을 못 받았으면 없다고 단정하지 않고 화면이 직접 받게 한다 —
// 설교 페이지는 빌드 때 거의 만들지 않고 처음 열릴 때 만들므로 «직전 페이지» 가 없다: 실패해도 던지지 않는다(keepPrevious: false).
// 설명 글은 그 한 편만 싣는다(전부 실으면 수백 KB).
export default async function SermonWatch({ page, videoId }: { page: VideoPage; videoId: string }) {
  const [data, sheets] = await Promise.all([
    loadForPage(
      async () => {
        const sermons = await fetchSermonLibrary(page);
        const found = sermons.some(s => s.id === videoId);
        const description = found
          ? ((await fetchSermonDescription(page, videoId)) ?? '')
          : undefined;
        return { sermons, found, description };
      },
      { keepPrevious: false }
    ),
    // 이 영상에 연결된 공개 자료(설교 시트지) — 자료실과 같은 자료를 유튜브 영상 id 로 찾는다.
    // 연결된 것이 없으면 빈 배열이라 카드가 나오지 않는다. 임시저장 자료는 저장소가 거른다.
    resourceRepository.forVideo(videoId).then(toSheetLinks),
  ]);
  if (data && !data.found) notFound();
  return (
    <SermonWatchPage
      page={page}
      videoId={videoId}
      sheets={sheets}
      sermons={data?.sermons}
      description={data?.description}
    />
  );
}
