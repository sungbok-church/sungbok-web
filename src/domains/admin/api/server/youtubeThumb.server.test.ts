import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { hasMaxresThumbnail } from './youtubeThumb.server';

describe('hasMaxresThumbnail', () => {
  it('큰 표지(maxresdefault)를 HEAD 로 물어 200 이면 참', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }));
    expect(await hasMaxresThumbnail('Cm0wL9_z9uM', fetchImpl)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://i.ytimg.com/vi/Cm0wL9_z9uM/maxresdefault.jpg',
      expect.objectContaining({ method: 'HEAD' })
    );
  });
  it('404 · 연결 실패면 거짓(표지는 작은 썸네일로) — 저장을 막지 않는다', async () => {
    expect(await hasMaxresThumbnail('x', async () => new Response(null, { status: 404 }))).toBe(
      false
    );
    expect(
      await hasMaxresThumbnail('x', async () => {
        throw new Error('network');
      })
    ).toBe(false);
  });
});
