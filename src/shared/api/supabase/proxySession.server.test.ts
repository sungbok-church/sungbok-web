import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { updateSession } from './proxySession.server';

const auth = vi.hoisted(() => ({ getClaims: vi.fn(), getSession: vi.fn(), signOut: vi.fn() }));

vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn(() => ({ auth })) }));

const SIGNED_IN = { data: { claims: { sub: 'u1', email: 'a@b.kr' } }, error: null };
const request = () =>
  new NextRequest('http://localhost/admin', { headers: { cookie: 'sb-x-auth-token=old' } });

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'k');
  auth.getClaims.mockResolvedValue(SIGNED_IN);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('updateSession', () => {
  it('getClaims 가 사용자를 주면 signedIn: true', async () => {
    expect((await updateSession(request())).signedIn).toBe(true);
  });

  it.each([
    [{ data: null, error: null }],
    [{ data: { claims: null }, error: null }],
    [{ data: { claims: {} }, error: null }],
    [{ data: { claims: { sub: 'anon1', is_anonymous: true } }, error: null }],
    [{ data: null, error: new Error('bad jwt') }],
  ])('getClaims 가 비거나 오류면 signedIn: false (%o)', async result => {
    auth.getClaims.mockResolvedValue(result);
    expect((await updateSession(request())).signedIn).toBe(false);
  });

  it('getClaims 가 던져도(네트워크) 요청을 죽이지 않고 signedIn: false', async () => {
    auth.getClaims.mockRejectedValue(new Error('fetch failed'));
    expect((await updateSession(request())).signedIn).toBe(false);
  });

  it('주소가 잘못돼 클라이언트를 만들다 던져도 요청을 죽이지 않고 signedIn: false', async () => {
    vi.mocked(createServerClient).mockImplementationOnce(() => {
      throw new Error('Invalid supabaseUrl');
    });
    expect((await updateSession(request())).signedIn).toBe(false);
  });

  it('환경변수가 없으면 Supabase 를 부르지 않고 signedIn: false', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    expect((await updateSession(request())).signedIn).toBe(false);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('getSession 을 부르지 않는다', async () => {
    await updateSession(request());
    expect(auth.getSession).not.toHaveBeenCalled();
  });

  it('요청의 쿠키를 읽어 넘긴다', async () => {
    await updateSession(request());
    const opts = vi.mocked(createServerClient).mock.calls[0][2];
    expect(opts.cookies.getAll()).toEqual([{ name: 'sb-x-auth-token', value: 'old' }]);
  });

  it('갱신된 쿠키와 캐시 금지 헤더를 응답에 싣는다', async () => {
    auth.getClaims.mockImplementation(async () => {
      const opts = vi.mocked(createServerClient).mock.calls[0][2];
      await opts.cookies.setAll?.(
        [{ name: 'sb-x-auth-token', value: 'new', options: { path: '/' } }],
        {
          'Cache-Control': 'private, no-store',
        }
      );
      return SIGNED_IN;
    });
    const { response } = await updateSession(request());
    expect(response.cookies.get('sb-x-auth-token')?.value).toBe('new');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('함께 넘긴 요청 헤더(CSP nonce)를 다음 단계로 넘긴다', async () => {
    const { response } = await updateSession(request(), { 'x-nonce': 'n1' });
    expect(response.headers.get('x-middleware-request-x-nonce')).toBe('n1');
  });

  it('signOut 은 이 세션만 끊고(scope local), 쿠키를 지우는 응답을 돌려준다', async () => {
    auth.signOut.mockImplementation(async () => {
      const opts = vi.mocked(createServerClient).mock.calls[0][2];
      await opts.cookies.setAll?.([{ name: 'sb-x-auth-token', value: '', options: { maxAge: 0 } }], {});
      return { error: null };
    });
    const { signOut } = await updateSession(request());
    const after = await signOut();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(after.cookies.get('sb-x-auth-token')?.value).toBe('');
  });

  it('signOut 이 실패해도 던지지 않는다', async () => {
    auth.signOut.mockRejectedValue(new Error('network'));
    const { signOut } = await updateSession(request());
    await expect(signOut()).resolves.toBeDefined();
  });
});
