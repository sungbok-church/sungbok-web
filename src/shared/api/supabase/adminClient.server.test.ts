import { createClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSupabaseAdminClient } from './adminClient.server';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({ marker: 'admin' })) }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('createSupabaseAdminClient', () => {
  it('주소와 만능 키가 있으면 세션을 남기지 않는 클라이언트를 만든다', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pub');
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_x');
    expect(createSupabaseAdminClient()).toEqual({ marker: 'admin' });
    expect(createClient).toHaveBeenCalledWith('https://x.supabase.co', 'sb_secret_x', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  });

  it('만능 키가 없으면 null(던지지 않는다 — 화면이 «설정되지 않았습니다» 를 보여 준다)', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pub');
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    expect(createSupabaseAdminClient()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });
});
