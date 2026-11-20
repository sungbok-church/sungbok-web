import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { connection } from 'next/server';

import type { Database } from './database.types';
import { requireSupabaseEnv } from './env';

/**
 * 서버(서버 컴포넌트 · Server Action · Route Handler)용 Supabase 클라이언트 — 로그인한 사람의 쿠키 세션으로 움직인다.
 * 요청마다 새로 만든다(전역에 두지 않는다 — 다른 사람의 세션이 섞인다).
 * 사용자 확인은 `supabase.auth.getClaims()` 로 한다. 서버에서 `getSession()` 을 믿지 않는다.
 * 요청 때의 일이라고 먼저 알린다(connection) — Supabase 인증이 지금 시각을 읽는데, Cache Components 는 미리 그리는 중의
 * 지금 시각을 막는다(ADR 0024). Server Action · Route Handler 는 원래 요청 때라 곧바로 지나간다.
 */
export const createSupabaseServerClient = async () => {
  await connection();
  const { url, publishableKey } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: cookiesToSet => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없다 — 세션 갱신은 proxy 가 맡으므로 넘어간다.
        }
      },
    },
  });
};
