import { describe, expect, it } from 'vitest';

import { toNewsVideos } from './newsVideosLoad.server';

describe('toNewsVideos', () => {
  it('DB 의 글을 공개 화면 모양으로 — 메뉴 · 날짜 출처는 소문자, 분류는 이름, 빈 그림은 영상 id 로', () => {
    expect(
      toNewsVideos([
        {
          id: 'r1',
          feed: 'GARDEN',
          title: '부흥집회',
          date: '2026-11-13',
          date_from: 'UPLOAD',
          video_id: 'Cm0wL9_z9uM',
          thumbnail: null,
          poster: null,
          description: null,
          categories: { label: '부흥집회' },
        },
      ])
    ).toEqual([
      {
        id: 'r1',
        status: 'published',
        feed: 'garden',
        title: '부흥집회',
        category: '부흥집회',
        date: '2026-11-13',
        dateFrom: 'upload',
        videoId: 'Cm0wL9_z9uM',
        thumbnail: 'https://i.ytimg.com/vi/Cm0wL9_z9uM/hqdefault.jpg',
        poster: 'https://i.ytimg.com/vi/Cm0wL9_z9uM/hqdefault.jpg',
      },
    ]);
  });

  it('영상이 없는 글은 싣지 않는다', () => {
    expect(
      toNewsVideos([
        {
          id: 'r1',
          feed: 'ANNOUNCEMENTS',
          title: 't',
          date: '2026-11-29',
          date_from: 'EVENT',
          video_id: null,
          thumbnail: null,
          poster: null,
          description: '설명',
          categories: null,
        },
      ])
    ).toEqual([]);
  });
});
