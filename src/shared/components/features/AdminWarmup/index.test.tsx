import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ADMIN_SCREENS_READY,
  ADMIN_WARM_LIMIT,
  ADMIN_WARM_ORDER,
} from '@/shared/config/adminScreens';
import {
  ADMIN_WARM_HEADER,
  ADMIN_WARM_PATH,
  ADMIN_WARM_STORAGE_KEY,
  adminWarmPaths,
} from '@/shared/lib/adminWarmup';

import { AdminWarmup } from './index';

const fetchMock = vi.fn(async () => new Response(null));
const setCookie = (value: string) => {
  document.cookie = value;
};

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockClear();
  window.localStorage.clear();
  document.cookie = 'sb-abcd-auth-token=; max-age=0; path=/';
});

describe('AdminWarmup', () => {
  it('관리자 로그인 쿠키가 없으면(일반 방문자) 아무것도 부르지 않는다', () => {
    render(<AdminWarmup />);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('쿠키가 있으면 관리자 첫 화면을 한 번 그려 둔다 — 깨우기 표시를 달아(8시간 시각을 늘리지 않게), 넘겨 보내기는 따라가지 않는다', () => {
    setCookie('sb-abcd-auth-token=base64-x; path=/');
    render(<AdminWarmup />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(ADMIN_WARM_PATH, {
      cache: 'no-store',
      credentials: 'same-origin',
      redirect: 'manual',
      keepalive: true,
      headers: { [ADMIN_WARM_HEADER]: '1' },
    });
    // 부른 시각을 적어 둔다 — 다시 열어도(새로 고침 · 다른 페이지) 3분 안에는 부르지 않는다
    expect(Number(window.localStorage.getItem(ADMIN_WARM_STORAGE_KEY))).toBeGreaterThan(0);
    render(<AdminWarmup />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('첫 화면 다음으로 자주 쓰는 화면들을 하나씩 차례로(앞 요청이 끝난 뒤에) 화면 데이터로 불러 둔다', async () => {
    setCookie('sb-abcd-auth-token=base64-x; path=/');
    // 첫 요청을 붙잡아 둔다 — 끝나기 전에는 다음 화면을 부르지 않아야 한다
    let release = () => {};
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>(resolve => (release = () => resolve(new Response(null))))
    );
    render(<AdminWarmup />);
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    release();
    const paths = adminWarmPaths(ADMIN_SCREENS_READY, ADMIN_WARM_ORDER, ADMIN_WARM_LIMIT);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1 + paths.length));
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(calls.map(c => c[0])).toEqual([ADMIN_WARM_PATH, ...paths]);
    for (const [, init] of calls.slice(1))
      expect(init).toEqual({
        cache: 'no-store',
        credentials: 'same-origin',
        redirect: 'manual',
        keepalive: true,
        headers: { [ADMIN_WARM_HEADER]: '1', RSC: '1' },
      });
  });

  it('첫 화면이 그려지지 않으면(넘겨 보내기 · 오류) 나머지 화면은 부르지 않는다', async () => {
    setCookie('sb-abcd-auth-token=base64-x; path=/');
    fetchMock.mockImplementationOnce(async () => new Response(null, { status: 500 }));
    render(<AdminWarmup />);
    await new Promise(r => setTimeout(r, 20));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('깨운 지 얼마 안 됐으면 다시 부르지 않는다(다른 탭 · 다른 페이지에서도)', () => {
    setCookie('sb-abcd-auth-token=base64-x; path=/');
    window.localStorage.setItem(ADMIN_WARM_STORAGE_KEY, String(Date.now()));
    render(<AdminWarmup />);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
