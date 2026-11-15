import { FOCUS, OUTLINE_BTN } from '@/shared/components/ui/controlStyles';
import { VIDEO_PAGE_PROFILE } from '@/domains/worship-video/config/videoPageProfile';
import { sermonPath, type VideoPage } from '@/domains/worship-video/config/worshipPages';
import { cn } from '@/shared/lib/utils';
import Link from 'next/link';

/**
 * 목록에 없는 영상(지워졌거나 잘못된 주소)의 404 — 서브페이지 머리(SectionShell)는 그대로 두고 안내와 목록 링크만 보인다.
 * 문구는 화면이 직접 받았을 때의 안내(SermonWatchPage)와 같다. 각 영상 페이지의 `[videoId]/not-found.tsx` 가 쓴다.
 */
export const VideoNotFound = ({ page }: { page: VideoPage }) => {
  const { item, videoNoun } = VIDEO_PAGE_PROFILE[page];
  return (
    <div className="text-b1-sub flex flex-wrap items-center gap-x-4 gap-y-3 py-10">
      <p>이 {videoNoun}을 찾을 수 없습니다.</p>
      <Link href={sermonPath(page)} className={cn(OUTLINE_BTN, FOCUS, 'text-label min-h-11 px-4')}>
        {item} 목록
      </Link>
    </div>
  );
};
