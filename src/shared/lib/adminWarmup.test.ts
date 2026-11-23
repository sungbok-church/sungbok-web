import { describe, expect, it } from 'vitest';

import { ADMIN_WARM_INTERVAL_MS, hasAdminSessionCookie, shouldWarmAdmin } from './adminWarmup';

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
