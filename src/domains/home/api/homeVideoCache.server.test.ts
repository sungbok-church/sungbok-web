import { cacheLife, cacheTag } from 'next/cache';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./homeVideoFeed.server', () => ({ fetchHomeVideoFeed: vi.fn() }));

import type { HomeVideoFeedData } from './homeVideoFeed';
import { fetchHomeVideoFeed } from './homeVideoFeed.server';
import { loadHomeVideoFeed } from './homeVideoCache.server';

const DATA: HomeVideoFeedData = { live: null, sermon: null, notices: [], staleMs: 0 };

describe('loadHomeVideoFeed — 홈을 미리 그릴 때 쓰는 영상 피드(서버 캐시, ADR 0024)', () => {
  it('서버에서 받은 피드를 준다', async () => {
    vi.mocked(fetchHomeVideoFeed).mockResolvedValue(DATA);
    expect(await loadHomeVideoFeed()).toEqual(DATA);
  });

  it('시각 값(staleMs)은 빼고 담는다 — 60초마다 다시 만들어도 영상이 같으면 같은 홈이라 ISR 쓰기가 생기지 않는다', async () => {
    vi.mocked(fetchHomeVideoFeed).mockResolvedValue({ ...DATA, staleMs: 42_000 });
    expect(await loadHomeVideoFeed()).toEqual(DATA);
  });

  it('60초마다 다시 확인하고 만료는 없다 — stale 30초 이상이어야 미리 그린 홈에 들어간다', async () => {
    vi.mocked(fetchHomeVideoFeed).mockResolvedValue(DATA);
    await loadHomeVideoFeed();
    expect(vi.mocked(cacheLife)).toHaveBeenCalledWith({ stale: 30, revalidate: 60 });
    expect(vi.mocked(cacheTag)).toHaveBeenCalledWith('home-video');
  });

  it('실패는 캐시 밖에서 던진다 — 받는 쪽(loadForPage)이 직전 홈을 유지하거나 브라우저가 받게 한다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetchHomeVideoFeed).mockRejectedValue(new Error('videos 403'));
    await expect(loadHomeVideoFeed()).rejects.toThrow('videos 403');
  });

  it('실패는 만료 없이 1분 뒤 다시 해 본다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fetchHomeVideoFeed).mockRejectedValue(new Error('videos 403'));
    vi.mocked(cacheLife).mockClear();
    await loadHomeVideoFeed().catch(() => {});
    expect(vi.mocked(cacheLife)).toHaveBeenCalledWith({ stale: 30, revalidate: 60 });
  });
});
