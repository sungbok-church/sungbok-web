// 영상 페이지마다 다른 것 — 화면 문구와 묶는 방식. 화면 부품은 같고(예배와 통일) 이 값만 다르다.
import type { VideoPage } from './worshipPages';

export type VideoPageProfile = {
  /** 영상 한 편을 부르는 말 — «설교 목록»·«설교 검색»·«설교 더보기»·«이전 설교» */
  item: string;
  /** «이 설교 영상을 찾을 수 없습니다»·플레이어 제목에 쓰는 말 */
  videoNoun: string;
  /** 목록 페이지 맨 위 한 편의 머리표 */
  latest: string;
  /** 그 한 편의 시청 버튼 */
  watch: string;
  searchPlaceholder: string;
  /** 목록 페이지의 칩 — series: 시리즈·분류 이름, year: 연도 */
  chips: 'series' | 'year';
  /** 칩 묶음의 이름(화면낭독기) */
  chipsLabel: string;
  /** 날짜로도 찾는다(«10.25») — 주일마다 올리는 영상용 */
  searchDate: boolean;
  /**
   * true 면 한 편 페이지의 옆 목록과 이전·다음이 묶음(시리즈)으로 나뉘지 않고 전체 날짜순이다 —
   * 회차가 없는 영상(주일광고·행사 영상)용.
   */
  flat: boolean;
};

export const VIDEO_PAGE_PROFILE: Record<VideoPage, VideoPageProfile> = {
  sunday: {
    item: '설교',
    videoNoun: '설교 영상',
    latest: '최신 설교',
    watch: '설교 시청하기',
    searchPlaceholder: '제목·본문 검색',
    chips: 'series',
    chipsLabel: '시리즈',
    searchDate: false,
    flat: false,
  },
  announcements: {
    item: '주일광고',
    videoNoun: '주일광고 영상',
    latest: '최근 주일광고',
    watch: '광고 영상 시청하기',
    searchPlaceholder: '주일 날짜·제목 검색',
    chips: 'year',
    chipsLabel: '연도',
    searchDate: true,
    flat: true,
  },
  garden: {
    item: '영상',
    videoNoun: '영상',
    latest: '최근 영상',
    watch: '영상 시청하기',
    searchPlaceholder: '영상 제목·행사 검색',
    chips: 'series',
    chipsLabel: '분류',
    searchDate: true,
    flat: true,
  },
};
