import { beforeEach, describe, expect, it, vi } from 'vitest';

const server = vi.hoisted(() => ({ fetchSermonLibrary: vi.fn() }));
vi.mock('./worshipVideo.server', () => server);

import { sermonLinkFor } from './sermonLink.server';

beforeEach(() => {
  server.fetchSermonLibrary.mockReset().mockResolvedValue([{ id: 'YYW0D6JNrGQ' }, { id: 'old' }]);
});

describe('sermonLinkFor — 유튜브 영상 id → 그 영상을 볼 주소', () => {
  it('예배 페이지 목록에 있는 영상은 사이트 안의 그 설교 페이지로(같은 창)', async () => {
    expect(await sermonLinkFor('YYW0D6JNrGQ')).toEqual({
      videoId: 'YYW0D6JNrGQ',
      href: '/worship/sunday/YYW0D6JNrGQ',
      external: false,
    });
  });

  it('목록을 받았는데 없는 영상은 유튜브로 — 사이트에 없는 페이지로 보내지 않는다', async () => {
    expect(await sermonLinkFor('MAruTjv3Fes')).toEqual({
      videoId: 'MAruTjv3Fes',
      href: 'https://www.youtube.com/watch?v=MAruTjv3Fes',
      external: true,
    });
  });

  it('목록을 못 받았으면(쿼터 소진·키 없음) 없다고 단정하지 않고 사이트 안 주소로 — 그 페이지가 이어서 확인한다', async () => {
    server.fetchSermonLibrary.mockRejectedValue(new Error('quota'));
    expect(await sermonLinkFor('MAruTjv3Fes')).toEqual({
      videoId: 'MAruTjv3Fes',
      href: '/worship/sunday/MAruTjv3Fes',
      external: false,
    });
  });
});
