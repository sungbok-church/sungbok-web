// 영상 한 편 페이지(`…/[videoId]/page.tsx`)의 탭 제목 — 서버 전용. 예배·주일광고·성복의 뜰 페이지가 같이 쓴다.

import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다 — 키·쿼터는 서버에만

import type { VideoPage } from '../config/worshipPages';
import { fetchSermonLibrary } from './worshipVideo.server';

/**
 * «영상 제목 | 페이지 이름 | 성복교회». 목록에 없는 영상이거나 목록을 못 받았으면 «페이지 이름 | 성복교회» —
 * 제목 때문에 페이지가 실패하지 않게 던지지 않는다(화면은 SermonWatch 의 규칙을 따른다).
 */
export const videoPageTitle = async (
  page: VideoPage,
  videoId: string,
  pageLabel: string
): Promise<string> => {
  const fallback = `${pageLabel} | 성복교회`;
  try {
    const video = (await fetchSermonLibrary(page)).find(s => s.id === videoId);
    return video ? `${video.title} | ${fallback}` : fallback;
  } catch {
    return fallback;
  }
};
