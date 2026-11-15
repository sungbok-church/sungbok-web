import { afterEach, describe, expect, it, vi } from 'vitest';

import { idFromPath, syncAddress } from './syncAddress';

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('syncAddress — 페이지를 옮기지 않고 주소만 맞춘다', () => {
  it('기록을 쌓지 않고(replaceState) 주소를 바꾼다', () => {
    const replace = vi.spyOn(window.history, 'replaceState');
    const push = vi.spyOn(window.history, 'pushState');
    syncAddress('/news/bulletin', '2026-10-25');
    expect(replace).toHaveBeenCalledWith(null, '', '/news/bulletin/2026-10-25');
    expect(push).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/news/bulletin/2026-10-25');
  });

  it('주소에 못 쓰는 글자는 인코딩한다', () => {
    syncAddress('/news/album', 'a/b c');
    expect(window.location.pathname).toBe('/news/album/a%2Fb%20c');
  });
});

describe('idFromPath — 주소에서 고른 항목을 읽는다', () => {
  it('`${basePath}/id` 의 id', () => {
    expect(idFromPath('/news/bulletin/2026-10-25', '/news/bulletin')).toBe('2026-10-25');
    expect(idFromPath('/news/album/5/', '/news/album')).toBe('5');
    expect(idFromPath('/news/album/a%2Fb%20c', '/news/album')).toBe('a/b c');
  });

  it('목록 주소·다른 메뉴·더 깊은 주소는 undefined', () => {
    expect(idFromPath('/news/bulletin', '/news/bulletin')).toBeUndefined();
    expect(idFromPath('/news/bulletin/', '/news/bulletin')).toBeUndefined();
    expect(idFromPath('/news/bulletin-archive/2027-01-03', '/news/bulletin')).toBeUndefined();
    expect(idFromPath('/news/album/5', '/news/bulletin')).toBeUndefined();
    expect(idFromPath('/news/album/5/extra', '/news/album')).toBeUndefined();
  });

  it('깨진 인코딩은 undefined — 던지지 않는다', () => {
    expect(idFromPath('/news/album/%E0%A4%A', '/news/album')).toBeUndefined();
  });
});
