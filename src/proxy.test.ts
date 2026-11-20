import { updateSession } from '@/shared/api/supabase/proxySession.server';
import { NextRequest, NextResponse } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IDLE_COOKIE, IDLE_LIMIT_MS } from './domains/admin/api/idleSession';
import { config, proxy } from './proxy';

vi.mock('@/shared/api/supabase/proxySession.server', () => ({ updateSession: vi.fn() }));

const mockSession = ({
  signedIn,
  response = NextResponse.next(),
}: {
  signedIn: boolean;
  response?: NextResponse;
}) =>
  vi.mocked(updateSession).mockResolvedValue({
    response,
    signedIn,
    signOut: vi.fn(async () => {
      const out = NextResponse.next();
      out.cookies.set('sb-x-auth-token', '');
      return out;
    }),
  });

afterEach(() => {
  vi.clearAllMocks();
});

describe('proxy', () => {
  it('matcher 는 /admin/:path* 하나뿐이다', () => {
    expect(config.matcher).toEqual(['/admin/:path*']);
  });

  it('로그인 안 한 채 오면 오던 곳을 싣고 로그인 화면으로 보낸다', async () => {
    mockSession({ signedIn: false });
    const res = await proxy(new NextRequest('http://localhost/admin/bulletin?year=2026'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'http://localhost/admin/login?next=%2Fadmin%2Fbulletin%3Fyear%3D2026'
    );
  });

  it('돌려보낼 때 updateSession 이 갱신한 쿠키를 그 응답에 옮긴다', async () => {
    const refreshed = NextResponse.next();
    refreshed.cookies.set('sb-x-auth-token', 'new');
    mockSession({ signedIn: false, response: refreshed });
    const res = await proxy(new NextRequest('http://localhost/admin/bulletin'));
    expect(res.cookies.get('sb-x-auth-token')?.value).toBe('new');
  });

  it('로그인한 채 오면 updateSession 의 응답을 그대로 돌려준다', async () => {
    const passthrough = NextResponse.next();
    mockSession({ signedIn: true, response: passthrough });
    expect(await proxy(new NextRequest('http://localhost/admin'))).toBe(passthrough);
  });

  it('로그인 안 한 사람에게 로그인 화면은 그대로 보인다', async () => {
    const passthrough = NextResponse.next();
    mockSession({ signedIn: false, response: passthrough });
    expect(await proxy(new NextRequest('http://localhost/admin/login'))).toBe(passthrough);
  });

  it('로그인한 사람이 로그인 화면에 오면 next 로 보낸다(바깥 주소는 /admin 으로)', async () => {
    mockSession({ signedIn: true });
    const res = await proxy(
      new NextRequest('http://localhost/admin/login?next=https%3A%2F%2Fevil.example')
    );
    expect(res.headers.get('location')).toBe('http://localhost/admin');
  });

  it('모든 응답에 CSP 를 싣고, 같은 nonce 를 요청 헤더로 넘긴다', async () => {
    mockSession({ signedIn: true });
    const res = await proxy(new NextRequest('http://localhost/admin'));
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    const [, extra] = vi.mocked(updateSession).mock.calls[0];
    expect(csp).toContain(`'nonce-${extra?.['x-nonce']}'`);
    expect(extra?.['content-security-policy']).toBe(csp);
  });

  it('로그인한 요청은 마지막 요청 시각을 남긴다(httpOnly)', async () => {
    mockSession({ signedIn: true });
    const res = await proxy(new NextRequest('http://localhost/admin'));
    const cookie = res.cookies.get(IDLE_COOKIE);
    expect(Number(cookie?.value)).toBeGreaterThan(0);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.path).toBe('/admin');
  });

  it('마지막 요청 시각은 브라우저를 닫아도 남는다 — 로그인 쿠키(400일)처럼 남아야, 공용 PC 에서 창만 닫고 간 다음 날 8시간 규칙으로 끊긴다', async () => {
    mockSession({ signedIn: true });
    const res = await proxy(new NextRequest('http://localhost/admin'));
    expect(res.cookies.get(IDLE_COOKIE)?.maxAge).toBe(400 * 24 * 60 * 60);
  });

  it('8시간 넘게 쉬었으면 세션을 끊고 로그인 화면으로(안내 표시)', async () => {
    mockSession({ signedIn: true });
    const req = new NextRequest('http://localhost/admin/users', {
      headers: { cookie: `${IDLE_COOKIE}=${Date.now() - IDLE_LIMIT_MS - 1000}` },
    });
    const res = await proxy(req);
    const { signOut } = await vi.mocked(updateSession).mock.results[0].value;
    expect(signOut).toHaveBeenCalled();
    expect(res.headers.get('location')).toBe('http://localhost/admin/login?reason=idle');
    expect(res.cookies.get('sb-x-auth-token')?.value).toBe('');
    expect(res.cookies.get(IDLE_COOKIE)?.value).toBe('');
  });

  it('로그인하지 않은 요청은 남아 있던 마지막 요청 시각을 지운다(다음 로그인이 바로 끊기지 않게)', async () => {
    const passthrough = NextResponse.next();
    mockSession({ signedIn: false, response: passthrough });
    const res = await proxy(
      new NextRequest('http://localhost/admin/login', { headers: { cookie: `${IDLE_COOKIE}=1` } })
    );
    expect(res.cookies.get(IDLE_COOKIE)?.value).toBe('');
  });
});
