import { beforeEach, describe, expect, it, vi } from 'vitest';

const server = vi.hoisted(() => ({ fetchSermonLibrary: vi.fn() }));
vi.mock('./worshipVideo.server', () => server);

import { videoPageTitle } from './videoMetadata.server';

beforeEach(() => {
  server.fetchSermonLibrary.mockReset().mockResolvedValue([{ id: 'abc', title: '도장 깨기' }]);
});

describe('videoPageTitle — 영상 한 편 페이지의 탭 제목', () => {
  it('«영상 제목 | 페이지 이름 | 성복교회»', async () => {
    expect(await videoPageTitle('sunday', 'abc', '주일예배')).toBe(
      '도장 깨기 | 주일예배 | 성복교회'
    );
    expect(server.fetchSermonLibrary).toHaveBeenCalledWith('sunday');
  });

  it('목록에 없는 영상이면 페이지 이름만', async () => {
    expect(await videoPageTitle('garden', 'nope', '성복의 뜰')).toBe('성복의 뜰 | 성복교회');
  });

  it('목록을 못 받아도 던지지 않고 페이지 이름만 — 화면은 화면의 규칙을 따른다', async () => {
    server.fetchSermonLibrary.mockRejectedValue(new Error('quota'));
    expect(await videoPageTitle('sunday', 'abc', '주일예배')).toBe('주일예배 | 성복교회');
  });
});
