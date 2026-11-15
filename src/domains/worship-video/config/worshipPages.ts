import type { NewsVideoFeed } from '@/domains/news/api/news.types';

// 예배 페이지 ↔ 유튜브 재생목록 — 어느 재생목록의 영상을 어느 페이지에 보일지 여기서 정한다(2026-11-12 결정).
// 관리자는 지금처럼 예배별 재생목록에 올리기만 한다. 페이지 안의 분류(설교 목록 칩)는 영상 제목의
// «시리즈 N» 에서 자동으로 나온다(sermonParse). 여기 없는 재생목록(예배 찬양·장별 마태복음 등)은 어디에도 나오지 않는다.
//
// 다른 예배 페이지를 만들 때 한 줄씩 더한다 — 채널 재생목록 후보(2026-11 확인, 구현 때 다시 확인):
//   friday : PLE3XUsm60vXReuAeLlqN54aIFNDyQl8yZ(4. 금요 생수의 강) · PLE3XUsm60vXQS7HcbZ2unTf-nZfjLWXsQ(월삭 새벽예배)
//   special: PLE3XUsm60vXQIhfSvF57R--X8IP4EfWOh(특별집회 및 행사)
//   weekday: PLE3XUsm60vXTx8rr94k4rogJT49esdsAy(새벽예배 설교) · PLE3XUsm60vXTP1fQoyGAlSCyGlHHQKnc7(수요, 금요, 주일 5부 교구목사설교)
export const WORSHIP_PAGES = {
  // 주일 예배 설교
  sunday: ['PLE3XUsm60vXSn-fvZtoUk-VrDlESt0jDJ'],
} as const satisfies Record<string, readonly string[]>;

export type WorshipPage = keyof typeof WORSHIP_PAGES;

/** 재생목록에서 오는 예배 페이지 이름들 — 영상 id 로 설교 페이지를 찾을 때 돈다(sermonLink.server). */
export const PLAYLIST_PAGES = Object.keys(WORSHIP_PAGES) as WorshipPage[];

// 교회소식의 영상 메뉴(주일광고·성복의 뜰)도 예배와 같은 영상 화면을 쓴다(2026-11-13). 영상은 재생목록이 아니라
// 관리자가 등록한 게시글(게시글 하나 = 유튜브 영상 하나, domains/news)에서 온다 — 재생목록 전체가 아니라 영상 id 로 잇는다.
// 영상 메뉴를 더하면(NewsVideoFeed) 아래 BASE_PATH 와 videoPageProfile 에 그 이름을 적어야 타입이 통과한다.

/** 영상 화면(목록 + 한 편)을 쓰는 페이지 — 예배(재생목록) + 교회소식 영상(등록한 게시글). */
export type VideoPage = WorshipPage | NewsVideoFeed;

// 페이지의 목록 주소. 메뉴(shared/config/siteNav)에 있는 주소여야 한다 — 테스트가 잠근다
const BASE_PATH: Record<VideoPage, string> = {
  sunday: '/worship/sunday',
  announcements: '/news/announcements',
  garden: '/news/garden',
};

/** 재생목록에서 오는 예배 페이지 이름인지 — 아니면(VideoPage 안에서) 등록한 게시글에서 오는 교회소식 영상 메뉴다. */
export const isWorshipPage = (v: unknown): v is WorshipPage =>
  typeof v === 'string' && Object.hasOwn(WORSHIP_PAGES, v);

/** 주소에서 온 값이 설정에 있는 영상 페이지 이름인지 — Route Handler 가 임의 값으로 유튜브를 부르지 않게. */
export const isVideoPage = (v: unknown): v is VideoPage =>
  typeof v === 'string' && Object.hasOwn(BASE_PATH, v);

/** 영상 페이지 주소 — 영상 id 가 없으면 목록(/worship/sunday), 있으면 그 한 편(/worship/sunday/영상id). */
export const sermonPath = (page: VideoPage, videoId?: string): string =>
  videoId ? `${BASE_PATH[page]}/${encodeURIComponent(videoId)}` : BASE_PATH[page];
