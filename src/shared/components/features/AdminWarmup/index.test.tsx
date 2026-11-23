import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_WARM_PATH, ADMIN_WARM_STORAGE_KEY } from '@/shared/lib/adminWarmup';

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

  it('쿠키가 있으면 로그인 화면을 쿠키 없이 한 번 부른다 — 8시간 시각을 늘리지 않게', () => {
    setCookie('sb-abcd-auth-token=base64-x; path=/');
    render(<AdminWarmup />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(ADMIN_WARM_PATH, {
      cache: 'no-store',
      credentials: 'omit',
    });
    // 부른 시각을 적어 둔다 — 다시 열어도(새로 고침 · 다른 페이지) 3분 안에는 부르지 않는다
    expect(Number(window.localStorage.getItem(ADMIN_WARM_STORAGE_KEY))).toBeGreaterThan(0);
    render(<AdminWarmup />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('깨운 지 얼마 안 됐으면 다시 부르지 않는다(다른 탭 · 다른 페이지에서도)', () => {
    setCookie('sb-abcd-auth-token=base64-x; path=/');
    window.localStorage.setItem(ADMIN_WARM_STORAGE_KEY, String(Date.now()));
    render(<AdminWarmup />);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
