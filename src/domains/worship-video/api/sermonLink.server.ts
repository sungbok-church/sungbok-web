// 유튜브 영상 id → 그 영상을 볼 주소 — 서버 전용. 자료실의 «설교 영상 보기» 가 쓴다.
// 자료와 영상은 유튜브 영상 id 로만 이어져 있다(자료실 resource.types). 그 영상이 사이트의 어느 예배 페이지에 있는지는
// 여기서 찾는다 — 예배 페이지 목록은 1시간 Data Cache 라 유튜브를 더 부르지 않는다.

import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다 — 키·쿼터는 서버에만

import { PLAYLIST_PAGES, sermonPath } from '../config/worshipPages';
import { fetchSermonLibrary } from './worshipVideo.server';

export type SermonLink = {
  videoId: string;
  href: string;
  /** true 면 유튜브(새 창), false 면 사이트 안의 설교 페이지(같은 창) */
  external: boolean;
};

/**
 * 영상이 예배 페이지 목록에 있으면 그 설교 페이지, 목록을 다 받았는데 없으면 유튜브.
 * 목록을 못 받았으면(쿼터 소진·개발 서버) 없다고 단정하지 않고 첫 예배 페이지 주소를 준다 —
 * 그 페이지가 직접 받아 보고, 정말 없으면 «찾을 수 없습니다» 와 목록 링크를 보인다.
 */
export const sermonLinkFor = async (videoId: string): Promise<SermonLink> => {
  let unknown = false;
  for (const page of PLAYLIST_PAGES) {
    try {
      if ((await fetchSermonLibrary(page)).some(s => s.id === videoId)) {
        return { videoId, href: sermonPath(page, videoId), external: false };
      }
    } catch {
      unknown = true;
    }
  }
  return unknown
    ? { videoId, href: sermonPath(PLAYLIST_PAGES[0], videoId), external: false }
    : {
        videoId,
        href: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
        external: true,
      };
};
