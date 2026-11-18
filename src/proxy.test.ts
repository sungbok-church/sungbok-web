import { updateSession } from '@/shared/api/supabase/proxySession.server';
import { NextRequest, NextResponse } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { config, proxy } from './proxy';

vi.mock('@/shared/api/supabase/proxySession.server', () => ({ updateSession: vi.fn() }));

const mockSession = ({
  signedIn,
  response = NextResponse.next(),
}: {
  signedIn: boolean;
  response?: NextResponse;
}) => vi.mocked(updateSession).mockResolvedValue({ response, signedIn });

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
});
