import { afterEach, describe, expect, it, vi } from 'vitest';

import { readSupabaseEnv, requireSupabaseEnv } from './env';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('readSupabaseEnv', () => {
  it('둘 다 있으면 값을 돌려준다', () => {
    expect(readSupabaseEnv({ url: 'https://x.supabase.co', publishableKey: 'k' })).toEqual({
      url: 'https://x.supabase.co',
      publishableKey: 'k',
    });
  });

  it.each([
    [{ url: '', publishableKey: 'k' }],
    [{ url: 'https://x.supabase.co' }],
    [{ url: '   ', publishableKey: '   ' }],
    [{}],
  ])('하나라도 비면 null (%o)', raw => expect(readSupabaseEnv(raw)).toBeNull());

  it('인자가 없으면 환경변수에서 읽는다', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://y.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pk');
    expect(readSupabaseEnv()).toEqual({ url: 'https://y.supabase.co', publishableKey: 'pk' });
  });
});

describe('requireSupabaseEnv', () => {
  it('빠진 이름만 알린다(값은 싣지 않는다)', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'secret-looking-value');
    expect(() => requireSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => requireSupabaseEnv()).not.toThrow(/secret-looking-value/);
  });

  it('둘 다 있으면 값을 돌려준다', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://y.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pk');
    expect(requireSupabaseEnv()).toEqual({ url: 'https://y.supabase.co', publishableKey: 'pk' });
  });
});
