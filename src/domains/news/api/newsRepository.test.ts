import { describe, expect, it } from 'vitest';

import type { Album, BulletinIssue, NewsVideo } from './news.types';
import { createNewsRepository, newsRepository } from './newsRepository';

const video = (over: Partial<NewsVideo>): NewsVideo => ({
  id: 'v',
  status: 'published',
  feed: 'announcements',
  title: '주일 광고',
  category: '주일광고',
  date: '2026-10-25',
  dateFrom: 'event',
  videoId: 'abcdefghijk',
  thumbnail: 't',
  poster: 'p',
  ...over,
});
const issue = (over: Partial<BulletinIssue>): BulletinIssue => ({
  id: over.date ?? 'i',
  status: 'published',
  date: '2026-10-25',
  pages: [{ src: '/a.webp', width: 1200, height: 854 }],
  ...over,
});
const album = (over: Partial<Album>): Album => ({
  id: 'a',
  status: 'published',
  title: '행사',
  category: '교회행사',
  images: [{ src: '/a.webp', width: 700, height: 990 }],
  ...over,
});

const repo = createNewsRepository({
  videos: async () => [
    video({ id: 'old', date: '2026-09-06' }),
    video({ id: 'new', date: '2026-10-25' }),
    video({ id: 'draft', status: 'draft', date: '2026-11-08' }),
    video({ id: 'no-video', date: '2026-11-01', videoId: '' }),
    video({ id: 'garden', feed: 'garden', category: '부흥집회' }),
  ],
  issues: async () => [
    issue({ date: '2026-10-04' }),
    issue({ date: '2026-11-08' }),
    issue({ date: '2026-11-15', status: 'draft' }),
    issue({ date: '2026-11-22', pages: [] }),
  ],
  albums: async () => [
    album({ id: '1' }),
    album({ id: '2', status: 'draft' }),
    album({ id: '3', images: [] }),
  ],
});

describe('newsRepository', () => {
  it('영상 소식 — 그 메뉴의 공개 글만 최신순. 임시저장과 영상 id 가 빈 글은 싣지 않는다', async () => {
    expect((await repo.videos('announcements')).map(v => v.id)).toEqual(['new', 'old']);
    expect((await repo.videos('garden')).map(v => v.id)).toEqual(['garden']);
  });

  it('주보 — 공개된 호만 최신 주일부터. 그림이 없는 호는 싣지 않는다', async () => {
    expect((await repo.issues()).map(i => i.date)).toEqual(['2026-11-08', '2026-10-04']);
  });

  it('앨범 — 공개된 것만, 그림이 없는 것은 싣지 않는다', async () => {
    expect((await repo.albums()).map(a => a.id)).toEqual(['1']);
  });

  it('시드: 주일광고 87편 · 성복의 뜰 30편 · 주보 90호 · 앨범 4건', async () => {
    expect((await newsRepository.videos('announcements')).length).toBe(87);
    expect((await newsRepository.videos('garden')).length).toBe(30);
    const issues = await newsRepository.issues();
    expect(issues.length).toBe(90);
    expect(issues[0].date).toBe('2026-11-15');
    expect(issues.at(-1)?.date).toBe('2025-03-02');
    // 호마다 날짜가 하나씩 — 주소(/news/bulletin/날짜)가 겹치지 않는다
    expect(new Set(issues.map(i => i.id)).size).toBe(90);
    expect((await newsRepository.albums()).length).toBe(4);
  });
});
