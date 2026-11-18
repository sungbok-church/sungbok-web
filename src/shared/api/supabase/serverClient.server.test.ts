import { createServerClient } from '@supabase/ssr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSupabaseServerClient } from './serverClient.server';

const cookieStore = vi.hoisted(() => ({
  getAll: vi.fn(() => [{ name: 'a', value: '1' }]),
  set: vi.fn(),
}));

vi.mock('next/headers', () => ({ cookies: async () => cookieStore }));
vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn(() => ({})) }));

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'k');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('createSupabaseServerClient', () => {
  it('환경변수의 주소·키와 쿠키 저장소로 클라이언트를 만든다', async () => {
    await createSupabaseServerClient();
    const [url, key, opts] = vi.mocked(createServerClient).mock.calls[0];
    expect([url, key]).toEqual(['https://x.supabase.co', 'k']);
    expect(opts.cookies.getAll()).toEqual([{ name: 'a', value: '1' }]);
  });

  it('갱신된 쿠키를 쿠키 저장소에 쓴다', async () => {
    await createSupabaseServerClient();
    const opts = vi.mocked(createServerClient).mock.calls[0][2];
    opts.cookies.setAll?.([{ name: 'a', value: '2', options: { path: '/' } }], {});
    expect(cookieStore.set).toHaveBeenCalledWith('a', '2', { path: '/' });
  });

  it('서버 컴포넌트에서 쿠키를 못 써도(set 이 던져도) 던지지 않는다', async () => {
    cookieStore.set.mockImplementation(() => {
      throw new Error('read-only');
    });
    await createSupabaseServerClient();
    const opts = vi.mocked(createServerClient).mock.calls[0][2];
    expect(() => opts.cookies.setAll?.([{ name: 'a', value: '2', options: {} }], {})).not.toThrow();
  });

  it('환경변수가 없으면 빠진 이름을 알리며 던진다', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    await expect(createSupabaseServerClient()).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
