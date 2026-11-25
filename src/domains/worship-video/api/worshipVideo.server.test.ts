import { beforeEach, describe, expect, it, vi } from 'vitest';

// 재생목록 설정은 시험용으로 — 실제 id 에 묶이지 않게
vi.mock('../config/worshipPages', () => ({
  isWorshipPage: (page: string) => page !== 'announcements',
}));
// 받기(동기화)와 DB 읽기는 가짜로 — 줄 → 설교 바꾸기(videoRows)는 실제 것을 쓴다
const sync = vi.hoisted(() => ({ ifDue: vi.fn() }));
vi.mock('./youtubeSync.server', () => ({ syncVideoPageIfDue: sync.ifDue }));
const db = vi.hoisted(() => ({
  rows: [] as unknown[],
  error: null as null | { message: string },
  calls: [] as [string, unknown][],
}));
vi.mock('@/shared/api/supabase/readClient.server', () => ({
  createSupabaseReadClient: () => ({
    from: (table: string) => {
      db.calls.push(['from', table]);
      const c = {
        select: () => c,
        eq: (col: string, v: unknown) => (db.calls.push([col, v]), c),
        order: async (col: string) => (
          db.calls.push(['order', col]),
          { data: db.error ? null : db.rows, error: db.error }
        ),
      };
      return c;
    },
  }),
}));
// 교회소식 영상(등록한 게시글)은 저장소에서 온다
const news = vi.hoisted(() => ({ videos: vi.fn() }));
vi.mock('@/domains/news/api/newsRepository', () => ({ newsRepository: news }));

import { cacheLife, cacheTag } from 'next/cache';

import { upstreamStatus } from '@/shared/api/upstreamStatus.server';

import { fetchSermonDescription, fetchSermonLibrary } from './worshipVideo.server';

const row = (id: string, over: Record<string, unknown> = {}) => ({
  video_id: id,
  position: 0,
  title: `시리즈 1 | 제목 ${id} | 요한복음 3:16 | 이요셉 목사`,
  description: '2026년 10월 25일 성복교회 주일예배\n\n본문 내용',
  published_at: '2026-10-26T03:00:00Z',
  added_at: null,
  thumbnail: `h/${id}`,
  poster: `x/${id}`,
  ...over,
});

beforeEach(() => {
  sync.ifDue.mockReset().mockResolvedValue({ status: 'skipped' });
  db.rows = [];
  db.error = null;
  db.calls = [];
});

describe('fetchSermonLibrary — 예배 페이지는 받아 둔 사본(DB)에서', () => {
  it('받을 때가 됐으면 먼저 받고, 그 페이지의 줄을 재생목록 순서로 읽어 설교 목록으로', async () => {
    db.rows = [row('a')];
    const [a] = await fetchSermonLibrary('sunday');
    expect(sync.ifDue).toHaveBeenCalledWith('sunday');
    expect(db.calls).toEqual([
      ['from', 'youtube_videos'],
      ['page', 'sunday'],
      ['order', 'position'],
    ]);
    expect(a).toMatchObject({
      id: 'a',
      series: '시리즈',
      no: 1,
      date: '2026-10-25',
      poster: 'x/a',
    });
  });

  it('유튜브를 못 받아도(쿼터 소진 등) DB 의 마지막 목록을 그대로 쓴다', async () => {
    sync.ifDue.mockResolvedValue({ status: 'failed', error: new Error('quota') });
    db.rows = [row('a')];
    expect((await fetchSermonLibrary('sunday')).map(s => s.id)).toEqual(['a']);
  });

  it('한 번도 받지 못해 DB 가 비었으면 빈 목록이 아니라 실패(운영에서는 직전 페이지 유지)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('quota');
    sync.ifDue.mockResolvedValue({ status: 'failed', error });
    await expect(fetchSermonLibrary('sunday')).rejects.toThrow('유튜브에서도 받지 못했습니다');
  });

  it('DB 가 비었는데 지금 받지 않았으면(다른 곳이 받는 중 · 설정 없음) 빈 목록이 아니라 «잠시 뒤 풀릴» 실패 — 5초 캐시 · 화면이 다시 시도(503)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    sync.ifDue.mockResolvedValue({ status: 'skipped' });
    vi.mocked(cacheLife).mockClear();
    const error = await fetchSermonLibrary('sunday').catch(e => e);
    expect(upstreamStatus(error)).toBe(503);
    expect(vi.mocked(cacheLife)).toHaveBeenCalledWith({ stale: 30, revalidate: 5 });
  });

  it('방금 받았는데 재생목록이 정말 비었으면 빈 목록', async () => {
    sync.ifDue.mockResolvedValue({ status: 'synced', count: 0 });
    await expect(fetchSermonLibrary('sunday')).resolves.toEqual([]);
  });

  it('DB 를 못 읽으면 실패', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    db.error = { message: 'down' };
    await expect(fetchSermonLibrary('sunday')).rejects.toThrow('영상을 읽지 못했습니다');
  });
});

describe('fetchSermonDescription', () => {
  it('설명 본문을 준다 — 설교일 줄은 뺀 것. 목록에 없는 id 는 null', async () => {
    db.rows = [
      row('a', { description: '2026년 10월 25일 주일예배\n\n[사도행전 강해 66]\n#성복교회' }),
    ];
    await expect(fetchSermonDescription('sunday', 'a')).resolves.toBe(
      '[사도행전 강해 66]\n#성복교회'
    );
    await expect(fetchSermonDescription('sunday', 'nope')).resolves.toBeNull();
  });
});

describe('교회소식 영상(주일광고·성복의 뜰) — 등록한 게시글에서', () => {
  const post = (videoId: string, date: string, description?: string) => ({
    id: `p-${videoId}`,
    status: 'published',
    feed: 'announcements',
    title: `${date} 주일 광고`,
    category: '주일광고',
    date,
    dateFrom: 'event',
    videoId,
    thumbnail: `t/${videoId}`,
    poster: `p/${videoId}`,
    ...(description !== undefined && { description }),
  });
  beforeEach(() => {
    news.videos
      .mockReset()
      .mockResolvedValue([post('new', '2026-10-25', '광고 내용'), post('old', '2026-10-18')]);
  });

  it('저장소의 공개 게시글을 영상 목록으로 — 유튜브를 부르지 않는다', async () => {
    const list = await fetchSermonLibrary('announcements');
    expect(news.videos).toHaveBeenCalledWith('announcements');
    expect(list.map(x => x.id)).toEqual(['new', 'old']);
    expect(list[0]).toMatchObject({ series: '주일광고', date: '2026-10-25', dateFrom: 'sermon' });
    expect(sync.ifDue).not.toHaveBeenCalled();
  });

  it('설명 글 — 적어 둔 글, 없으면 빈 글. 목록에 없는 영상은 null', async () => {
    expect(await fetchSermonDescription('announcements', 'new')).toBe('광고 내용');
    expect(await fetchSermonDescription('announcements', 'old')).toBe('');
    expect(await fetchSermonDescription('announcements', 'nope')).toBeNull();
    expect(sync.ifDue).not.toHaveBeenCalled();
  });

  it('같은 영상을 두 번 등록했으면 목록도 설명도 앞의 글 것을 쓴다', async () => {
    news.videos.mockResolvedValue([
      post('same', '2026-10-25', '앞 글'),
      post('same', '2026-10-18', '뒤 글'),
    ]);
    expect((await fetchSermonLibrary('announcements')).map(x => x.date)).toEqual(['2026-10-25']);
    expect(await fetchSermonDescription('announcements', 'same')).toBe('앞 글');
  });
});

describe('서버 캐시(ADR 0024)', () => {
  it('영상 페이지마다 10분마다 다시 확인하고 만료는 두지 않는다', async () => {
    db.rows = [row('a')];
    await fetchSermonLibrary('sunday');
    expect(vi.mocked(cacheLife)).toHaveBeenCalledWith({ stale: 300, revalidate: 600 });
    expect(vi.mocked(cacheLife).mock.calls[0][0]).not.toHaveProperty('expire');
    expect(vi.mocked(cacheTag)).toHaveBeenCalledWith('video-page-sunday');
  });

  it('읽기가 실패하면 그 실패도 1분 캐시되고, 캐시 밖에서 원래 오류로 던진다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    db.error = { message: 'down' };
    vi.mocked(cacheLife).mockClear();
    await expect(fetchSermonLibrary('sunday')).rejects.toThrow('down');
    expect(vi.mocked(cacheLife)).toHaveBeenCalledWith({ stale: 30, revalidate: 60 });
  });
});
