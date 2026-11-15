import { prefetchSermonWatch } from '@/domains/worship-video/api/worshipVideoPrefetch.server';
import { SermonWatchPage } from '@/domains/worship-video/components/features/SermonWatchPage';
import type { VideoPage } from '@/domains/worship-video/config/worshipPages';
import { resourceRepository } from '@/domains/resources/api/resourceRepository';
import { toSheetLinks } from '@/domains/resources/api/sheetLinks';
import { HydrationBoundary } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

// 영상 한 편 페이지 — 목록(옆 목록·이전/다음)과 이 영상의 설명 글을 서버에서 미리 받아 실어 보낸다.
// 예배 설교(/worship/…)와 교회소식 영상(/news/announcements·garden)이 같이 쓴다.
// 목록에 없는 영상(지워졌거나 잘못된 주소)이면 404. 목록을 못 받았으면(빌드 중 실패·개발 서버) 없다고 단정하지 않고
// 화면이 직접 받게 한다 — 실패 규칙은 prefetchSermonWatch 참고.
export default async function SermonWatch({ page, videoId }: { page: VideoPage; videoId: string }) {
  const [{ state, found }, sheets] = await Promise.all([
    prefetchSermonWatch(page, videoId),
    // 이 영상에 연결된 공개 자료(설교 시트지) — 자료실과 같은 자료를 유튜브 영상 id 로 찾는다.
    // 연결된 것이 없으면 빈 배열이라 카드가 나오지 않는다. 임시저장 자료는 저장소가 거른다.
    resourceRepository.forVideo(videoId).then(toSheetLinks),
  ]);
  if (found === false) notFound();
  return (
    <HydrationBoundary state={state}>
      <SermonWatchPage page={page} videoId={videoId} sheets={sheets} />
    </HydrationBoundary>
  );
}
