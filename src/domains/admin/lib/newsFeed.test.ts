import { describe, expect, it } from 'vitest';

import { defaultNewsDate, NEWS_FEEDS, youtubeImages } from './newsFeed';

describe('NEWS_FEEDS', () => {
  it('두 메뉴가 한 표를 feed 로 나눈다 — 분류 묶음 · 주소 · 공개 캐시 태그', () => {
    expect(NEWS_FEEDS.announcements).toMatchObject({
      feed: 'ANNOUNCEMENTS',
      menuKey: 'announcements',
      categoryGroup: 'ANNOUNCEMENTS_CATEGORY',
      adminPath: '/admin/announcements',
      publicPath: '/news/announcements',
      cacheTag: 'video-page-announcements',
    });
    expect(NEWS_FEEDS.garden).toMatchObject({
      feed: 'GARDEN',
      categoryGroup: 'GARDEN_CATEGORY',
      cacheTag: 'video-page-garden',
    });
  });
});

describe('defaultNewsDate', () => {
  it('주일광고는 이번 주일, 성복의 뜰은 오늘', () => {
    expect(defaultNewsDate('announcements', '2026-11-24')).toBe('2026-11-29');
    expect(defaultNewsDate('garden', '2026-11-24')).toBe('2026-11-24');
  });
});

describe('youtubeImages', () => {
  it('썸네일은 hqdefault, 표지는 큰 그림이 있을 때만 maxresdefault', () => {
    expect(youtubeImages('Cm0wL9_z9uM', true)).toEqual({
      thumbnail: 'https://i.ytimg.com/vi/Cm0wL9_z9uM/hqdefault.jpg',
      poster: 'https://i.ytimg.com/vi/Cm0wL9_z9uM/maxresdefault.jpg',
    });
    expect(youtubeImages('Cm0wL9_z9uM', false).poster).toBe(
      'https://i.ytimg.com/vi/Cm0wL9_z9uM/hqdefault.jpg'
    );
  });
});
