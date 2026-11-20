import 'server-only';

import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { readSupabaseEnv } from './env';

/**
 * 누구나 읽는 표(공통코드 · 분류 등)를 읽는 연결 — 공개 키로, 로그인 세션 없이. 쿠키를 보지 않으므로
 * 서버 캐시('use cache') 안에서도 쓸 수 있다. 행 권한(RLS)은 방문자(anon)와 같다. 값이 없으면 null.
 */
export const createSupabaseReadClient = () => {
  const env = readSupabaseEnv();
  return env
    ? createClient<Database>(env.url, env.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : null;
};
