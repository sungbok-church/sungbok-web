import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const auth = vi.hoisted(() => ({
  verifyOtp: vi.fn(async () => ({ data: {}, error: null as unknown })),
  exchangeCodeForSession: vi.fn(async () => ({ data: {}, error: null as unknown })),
}));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth })),
}));
// 비밀번호 찾기 켜짐 여부 — 운영 값은 메일 서비스 전까지 false. 흐름 시험은 켠 채로 한다
const resetFlag = vi.hoisted(() => ({ enabled: true }));
vi.mock('@/domains/admin/lib/passwordReset', async importOriginal => {
  const mod = await importOriginal<object>();
  return Object.defineProperty({ ...mod }, 'PASSWORD_RESET_ENABLED', {
    get: () => resetFlag.enabled,
    enumerable: true,
  });
});
afterEach(() => vi.clearAllMocks());

const get = (query: string) => GET(new NextRequest(`http://localhost/admin/login/confirm${query}`));

describe('GET /admin/login/confirm', () => {
  it('비밀번호 찾기를 꺼 두었으면 없는 주소 — 링크가 있어도 지금 브라우저의 로그인을 바꾸지 않는다', async () => {
    resetFlag.enabled = false;
    try {
      const res = await get('?token_hash=pkce_abc&type=recovery');
      expect(res.status).toBe(404);
      expect(auth.verifyOtp).not.toHaveBeenCalled();
    } finally {
      resetFlag.enabled = true;
    }
  });

  it('메일 링크(token_hash)로 로그인시키고 비밀번호 바꾸기 화면으로', async () => {
    const res = await get('?token_hash=pkce_abc&type=recovery');
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'pkce_abc' });
    expect(res.headers.get('location')).toBe('http://localhost/admin/password');
  });

  it('기본 양식의 링크(code)는 같은 브라우저의 세션으로 바꾼다', async () => {
    const res = await get('?code=abc-123');
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('abc-123');
    expect(res.headers.get('location')).toBe('http://localhost/admin/password');
  });

  it('만료 · 이미 쓴 링크는 로그인 화면으로(까닭을 싣는다)', async () => {
    auth.verifyOtp.mockResolvedValueOnce({
      data: {},
      error: { status: 403, code: 'otp_expired' },
    });
    const res = await get('?token_hash=old&type=recovery');
    expect(res.headers.get('location')).toBe('http://localhost/admin/login?reason=reset_expired');
  });

  it('읽을 수 없는 링크는 Supabase 를 부르지 않고 로그인 화면으로', async () => {
    const res = await get('?error=access_denied&error_code=otp_expired');
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(res.headers.get('location')).toBe('http://localhost/admin/login?reason=reset_expired');
  });

  it('Supabase 에 닿지 못해 던져도 로그인 화면으로', async () => {
    auth.verifyOtp.mockRejectedValueOnce(new Error('fetch failed'));
    const res = await get('?token_hash=x&type=recovery');
    expect(res.headers.get('location')).toBe('http://localhost/admin/login?reason=reset_expired');
  });
});
