import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { redirect } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAdminUser, requireAdminUser } from './session.server';

const auth = vi.hoisted(() => ({ getClaims: vi.fn(), getSession: vi.fn() }));

vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth })),
}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'k');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('getAdminUser · requireAdminUser', () => {
  it('claims 의 sub · email 을 AdminUser 로 돌려준다', async () => {
    auth.getClaims.mockResolvedValue({
      data: { claims: { sub: 'u1', email: 'a@b.kr' } },
      error: null,
    });
    expect(await getAdminUser()).toEqual({ id: 'u1', email: 'a@b.kr' });
    expect(await requireAdminUser()).toEqual({ id: 'u1', email: 'a@b.kr' });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('claims 가 없으면 null 이고 requireAdminUser 는 로그인 화면으로 보낸다', async () => {
    auth.getClaims.mockResolvedValue({ data: null, error: null });
    expect(await getAdminUser()).toBeNull();
    await requireAdminUser();
    expect(redirect).toHaveBeenCalledWith('/admin/login');
  });

  it('익명 로그인 토큰은 로그인으로 치지 않는다', async () => {
    auth.getClaims.mockResolvedValue({
      data: { claims: { sub: 'anon1', is_anonymous: true } },
      error: null,
    });
    expect(await getAdminUser()).toBeNull();
  });

  it('getClaims 가 오류를 주거나 던지면 null', async () => {
    auth.getClaims.mockResolvedValue({ data: null, error: new Error('bad jwt') });
    expect(await getAdminUser()).toBeNull();
    auth.getClaims.mockRejectedValue(new Error('fetch failed'));
    expect(await getAdminUser()).toBeNull();
  });

  it('환경변수가 없으면 Supabase 를 부르지 않고 null', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    expect(await getAdminUser()).toBeNull();
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('getSession 을 부르지 않는다', async () => {
    auth.getClaims.mockResolvedValue({ data: null, error: null });
    await getAdminUser();
    expect(auth.getSession).not.toHaveBeenCalled();
  });
});
