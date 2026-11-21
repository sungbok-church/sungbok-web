import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/domains/home/api/homeVideoFeed.server', () => ({ fetchHomeVideoFeed: vi.fn() }));
// 요청 때마다 답한다(connection) — 테스트는 Next 요청 밖이라 기다림만 흉내 낸다
const connection = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('next/server', async importOriginal => ({
  ...(await importOriginal<typeof import('next/server')>()),
  connection,
}));

import { fetchHomeVideoFeed } from '@/domains/home/api/homeVideoFeed.server';
import { YoutubeApiError } from '@/shared/api/youtubeApi.server';

import { GET } from './route';

beforeEach(() => vi.mocked(fetchHomeVideoFeed).mockReset());

describe('GET /api/home-video', () => {
  it('피드를 돌려준다', async () => {
    vi.mocked(fetchHomeVideoFeed).mockResolvedValue({
      live: null,
      sermon: null,
      notices: [],
      staleMs: 0,
    });
    const r = await GET();
    expect(r.status).toBe(200);
  });

  it('유튜브 실패는 종류대로 — 쿼터 소진 429, 일시 장애 503', async () => {
    vi.mocked(fetchHomeVideoFeed).mockRejectedValueOnce(
      new YoutubeApiError('videos', 403, 'quotaExceeded')
    );
    expect((await GET()).status).toBe(429);
    vi.mocked(fetchHomeVideoFeed).mockRejectedValueOnce(new YoutubeApiError('videos', 503));
    expect((await GET()).status).toBe(503);
  });

  it('성공 응답은 Vercel CDN 이 30초 들고 있는다 — 방문자 · 매크로가 몰려도 함수는 30초에 한 번만 돈다', async () => {
    vi.mocked(fetchHomeVideoFeed).mockResolvedValue({
      live: null,
      sermon: null,
      notices: [],
      staleMs: 0,
    });
    const r = await GET();
    expect(r.headers.get('Vercel-CDN-Cache-Control')).toBe('max-age=30');
    expect(r.headers.get('Cache-Control')).toBeNull(); // 브라우저는 따로 담아 두지 않는다(60초 확인은 화면이 정한다)
  });

  it('실패 응답은 CDN 에 담지 않는다 — 유튜브가 돌아오면 바로 다음 요청부터 정상', async () => {
    vi.mocked(fetchHomeVideoFeed).mockRejectedValueOnce(new YoutubeApiError('videos', 503));
    const r = await GET();
    expect(r.headers.get('Vercel-CDN-Cache-Control')).toBeNull();
  });

  it('미리 만들어 두지 않고 요청 때마다 답한다(connection)', async () => {
    vi.mocked(fetchHomeVideoFeed).mockResolvedValue({
      live: null,
      sermon: null,
      notices: [],
      staleMs: 0,
    });
    await GET();
    expect(connection).toHaveBeenCalled();
  });
});
