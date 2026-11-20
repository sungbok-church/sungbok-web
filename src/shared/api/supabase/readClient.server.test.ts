import { createClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSupabaseReadClient } from './readClient.server';

vi.mock('server-only', () => ({}));
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({ marker: 'read' })) }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('createSupabaseReadClient', () => {
  it('공개 키로, 로그인 세션 없이(쿠키를 보지 않는다 — 캐시 안에서 쓴다)', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pub');
    expect(createSupabaseReadClient()).toEqual({ marker: 'read' });
    expect(createClient).toHaveBeenCalledWith('https://x.supabase.co', 'pub', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  });

  it('설정이 없으면 null', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    expect(createSupabaseReadClient()).toBeNull();
  });
});
