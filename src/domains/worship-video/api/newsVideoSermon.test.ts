import { describe, expect, it } from 'vitest';

import type { NewsVideo } from '@/domains/news/api/news.types';

import { newsVideosToSermons } from './newsVideoSermon';

const video = (over: Partial<NewsVideo>): NewsVideo => ({
  id: 'p1',
  status: 'published',
  feed: 'announcements',
  title: '10월 25일 주일 광고',
  category: '주일광고',
  date: '2026-10-25',
  dateFrom: 'event',
  videoId: '0pqWUN2ekzg',
  thumbnail: 'https://i.ytimg.com/vi/0pqWUN2ekzg/hqdefault.jpg',
  poster: 'https://i.ytimg.com/vi/0pqWUN2ekzg/maxresdefault.jpg',
  ...over,
});

describe('newsVideosToSermons — 등록한 영상 게시글 → 영상 화면이 쓰는 모양', () => {
  it('영상 id 가 화면의 id(주소)가 되고 분류가 묶음 이름이 된다', () => {
    expect(newsVideosToSermons([video({})])).toEqual([
      {
        id: '0pqWUN2ekzg',
        title: '10월 25일 주일 광고',
        series: '주일광고',
        date: '2026-10-25',
        dateFrom: 'sermon',
        thumbnail: 'https://i.ytimg.com/vi/0pqWUN2ekzg/hqdefault.jpg',
        poster: 'https://i.ytimg.com/vi/0pqWUN2ekzg/maxresdefault.jpg',
      },
    ]);
  });

  it('행사 날짜를 몰라 업로드 날짜를 쓴 글은 «업로드» 로 표시되게 넘긴다', () => {
    expect(newsVideosToSermons([video({ dateFrom: 'upload' })])[0].dateFrom).toBe('upload');
  });

  it('같은 영상을 두 번 등록했으면 앞의 것만 — 주소가 겹치지 않게. 순서는 그대로', () => {
    const list = newsVideosToSermons([
      video({ id: 'a', videoId: 'aaaaaaaaaaa' }),
      video({ id: 'b', videoId: 'bbbbbbbbbbb' }),
      video({ id: 'c', videoId: 'aaaaaaaaaaa', title: '중복' }),
    ]);
    expect(list.map(s => s.id)).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
  });
});
