import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ADMIN_WARM_HEADER,
  ADMIN_WARM_INTERVAL_MS,
  adminWarmPaths,
  fetchAdminScreen,
  hasAdminSessionCookie,
  shouldWarmAdmin,
} from './adminWarmup';

describe('hasAdminSessionCookie — 이 브라우저에 관리자 로그인 쿠키가 있는가', () => {
  it('Supabase 로그인 쿠키(나눠 담은 .0 · .1 포함)를 알아본다', () => {
    expect(hasAdminSessionCookie('sb-abcd-auth-token=base64-xyz')).toBe(true);
    expect(hasAdminSessionCookie('theme=light; sb-abcd-auth-token.0=base64-x; a=1')).toBe(true);
  });

  it('로그인 쿠키가 없으면 아니다(다른 sb- 쿠키 · 이름에 섞인 글자는 치지 않는다)', () => {
    expect(hasAdminSessionCookie('')).toBe(false);
    expect(hasAdminSessionCookie('theme=light; sidebar_state=true')).toBe(false);
    expect(hasAdminSessionCookie('sb-abcd-auth-token-code-verifier=x')).toBe(false);
    expect(hasAdminSessionCookie('xsb-abcd-auth-token=x')).toBe(false);
  });

  it('비운 쿠키(로그아웃 뒤 값만 지운 것)는 치지 않는다', () => {
    expect(hasAdminSessionCookie('sb-abcd-auth-token=; theme=light')).toBe(false);
  });
});

describe('shouldWarmAdmin — 깨운 지 얼마 안 됐으면 다시 부르지 않는다', () => {
  const now = 1_000_000_000;
  it('깨운 적이 없으면 부른다', () => {
    expect(shouldWarmAdmin(null, now)).toBe(true);
  });
  it('간격 안이면 부르지 않고, 지나면 부른다', () => {
    expect(shouldWarmAdmin(now - ADMIN_WARM_INTERVAL_MS + 1, now)).toBe(false);
    expect(shouldWarmAdmin(now - ADMIN_WARM_INTERVAL_MS, now)).toBe(true);
  });
  it('적힌 시각이 미래(시계가 바뀐 경우)거나 숫자가 아니면 부른다', () => {
    expect(shouldWarmAdmin(now + 60_000, now)).toBe(true);
    expect(shouldWarmAdmin(Number.NaN, now)).toBe(true);
  });
});

describe('adminWarmPaths — 이어서 불러 둘 관리자 화면', () => {
  it('순서대로, 만든 화면만, 정한 개수까지 /admin/<key> 로', () => {
    const ready = new Set(['dashboard', 'users', 'groups', 'audit', 'bulletin']);
    const order = ['bulletin', 'newcomers', 'users', 'groups', 'audit'];
    expect(adminWarmPaths(ready, order, 3)).toEqual([
      '/admin/bulletin',
      '/admin/users',
      '/admin/groups',
    ]);
  });

  it('첫 화면은 넣지 않는다(따로 먼저 그린다)', () => {
    expect(adminWarmPaths(new Set(['dashboard']), ['dashboard'], 6)).toEqual([]);
  });
});

describe('fetchAdminScreen — 관리자 화면 하나를 받아 버린다(깨우기 · 미리 받기)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('깨우기 표시를 달고 넘겨 보내기는 따라가지 않는다 — 화면 데이터(RSC)로 받을 때는 RSC 표시도', async () => {
    const fetchMock = vi.fn(async () => new Response('x'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchAdminScreen('/admin/codes', { rsc: true })).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/admin/codes', {
      cache: 'no-store',
      credentials: 'same-origin',
      redirect: 'manual',
      keepalive: true,
      headers: { [ADMIN_WARM_HEADER]: '1', RSC: '1' },
    });
    await fetchAdminScreen('/admin');
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/admin',
      expect.objectContaining({ headers: { [ADMIN_WARM_HEADER]: '1' } })
    );
  });

  it('그려지지 않으면(넘겨 보내기 · 오류) false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 404 }))
    );
    await expect(fetchAdminScreen('/admin/codes', { rsc: true })).resolves.toBe(false);
  });
});
