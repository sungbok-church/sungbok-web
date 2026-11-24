// 주일광고 · 성복의 뜰(패키지 B2) — 한 표(news_videos)를 두 메뉴가 feed 로 나눠 쓴다. 메뉴마다 다른 값을 여기 한곳에.
import { upcomingSunday } from './content';

export const NEWS_FEEDS = {
  announcements: {
    feed: 'ANNOUNCEMENTS',
    menuKey: 'announcements',
    label: '주일광고',
    categoryGroup: 'ANNOUNCEMENTS_CATEGORY',
    adminPath: '/admin/announcements',
    publicPath: '/news/announcements',
    /** 공개 영상 화면의 서버 캐시 태그(worshipVideo.server 의 `video-page-<page>`) */
    cacheTag: 'video-page-announcements',
  },
  garden: {
    feed: 'GARDEN',
    menuKey: 'garden',
    label: '성복의 뜰',
    categoryGroup: 'GARDEN_CATEGORY',
    adminPath: '/admin/garden',
    publicPath: '/news/garden',
    cacheTag: 'video-page-garden',
  },
} as const;

export type NewsFeedKey = keyof typeof NEWS_FEEDS;

export const NEWS_FEED_KEYS = Object.keys(NEWS_FEEDS) as NewsFeedKey[];

/** 새 글의 날짜 기본값 — 주일광고는 이번 주일, 성복의 뜰은 오늘(칸에서 바꿀 수 있다) */
export const defaultNewsDate = (key: NewsFeedKey, today: string): string =>
  key === 'announcements' ? upcomingSunday(today) : today;

/** 유튜브가 주는 썸네일 · 표지 주소 — 큰 그림(maxresdefault)은 없는 영상이 있어 있을 때만 표지로 */
export const youtubeImages = (videoId: string, hasMaxres: boolean) => {
  const base = `https://i.ytimg.com/vi/${videoId}`;
  return {
    thumbnail: `${base}/hqdefault.jpg`,
    poster: `${base}/${hasMaxres ? 'maxresdefault' : 'hqdefault'}.jpg`,
  };
};
