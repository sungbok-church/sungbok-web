import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const signOut = vi.hoisted(() => vi.fn(async () => ({ error: null })));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { signOut } })),
}));
afterEach(() => vi.clearAllMocks());

describe('GET /admin/logout', () => {
  it('이 세션을 끊고 로그인 화면으로(까닭을 싣는다)', async () => {
    const res = await GET(new NextRequest('http://localhost/admin/logout?reason=inactive'));
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(res.headers.get('location')).toBe('http://localhost/admin/login?reason=inactive');
  });

  it('정해 둔 까닭이 아니면 싣지 않는다', async () => {
    const res = await GET(new NextRequest('http://localhost/admin/logout?reason=<script>'));
    expect(res.headers.get('location')).toBe('http://localhost/admin/login');
  });

  it('로그아웃에 실패해도 로그인 화면으로 보낸다', async () => {
    signOut.mockRejectedValueOnce(new Error('network'));
    const res = await GET(new NextRequest('http://localhost/admin/logout'));
    expect(res.headers.get('location')).toBe('http://localhost/admin/login');
  });
});
