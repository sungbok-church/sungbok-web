import { describe, expect, it } from 'vitest';

import type { NewsVideo } from './news.types';
import { mergeVideosWithSeed, toNewsVideos } from './newsVideosLoad.server';

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

const v = (
  feed: 'announcements' | 'garden',
  date: string,
  videoId: string,
  src: string
): NewsVideo => ({
  id: src + videoId,
  status: 'published',
  feed,
  title: src,
  category: '',
  date,
  dateFrom: 'event',
  videoId,
  thumbnail: '',
  poster: '',
});

describe('mergeVideosWithSeed — 메뉴마다, 옮기기 전까지(시드를 지우면 함께 없앤다)', () => {
  const seed = [
    v('announcements', '2026-11-15', 'a1', 'seed'),
    v('announcements', '2026-11-08', 'a2', 'seed'),
    v('garden', '2026-10-01', 'g1', 'seed'),
  ];
  it('그 메뉴를 아직 안 옮겼으면 DB 글 + 시드(같은 영상은 DB 것) — 시드 기간 날짜로 새로 올린 글이 있어도', () => {
    const merged = mergeVideosWithSeed(
      [v('announcements', '2026-11-29', 'a3', 'db'), v('announcements', '2026-11-08', 'a2', 'db')],
      seed,
      new Set()
    );
    expect(merged.map(x => `${x.feed}:${x.videoId}:${x.title}`)).toEqual([
      'announcements:a3:db',
      'announcements:a1:seed',
      'announcements:a2:db',
      'garden:g1:seed',
    ]);
  });
  it('옮긴 메뉴(기존 글번호가 있는 글이 DB 에 있음)는 DB 만 — 내린 글이 시드로 되살아나지 않는다', () => {
    const merged = mergeVideosWithSeed(
      [v('announcements', '2026-11-08', 'a2', 'db')],
      seed,
      new Set(['announcements'])
    );
    expect(merged.map(x => `${x.feed}:${x.videoId}:${x.title}`)).toEqual([
      'announcements:a2:db',
      'garden:g1:seed',
    ]);
  });
});
