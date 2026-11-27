import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import type { Database } from './database.types';
import { readSupabaseEnv } from './env';

export type ProxySession = {
  response: NextResponse;
  signedIn: boolean;
  /** 이 세션을 Supabase 에서 끊고(refresh token 폐기) 쿠키를 지우는 응답을 돌려준다. 실패해도 던지지 않는다. */
  signOut: () => Promise<NextResponse>;
};

/**
 * proxy(src/proxy.ts)에서 로그인 세션 쿠키를 갱신하고 로그인 여부를 돌려준다(Supabase 공식 안내의 proxy 유틸).
 * - 서버 컴포넌트는 쿠키를 쓸 수 없어서, 만료가 가까운 토큰의 갱신은 여기서 응답 쿠키에 싣는다.
 * - 로그인 여부는 `getClaims()` 로만 본다(토큰 서명을 검증한다). `getSession()` 은 쿠키를 그대로 믿으므로 쓰지 않는다.
 * - 환경변수가 없거나 Supabase 가 응답하지 않아도 요청을 죽이지 않는다 — 로그인 안 한 것으로 본다.
 */
export const updateSession = async (request: NextRequest): Promise<ProxySession> => {
  // 쿠키를 갱신하면 request.cookies 가 바뀌므로 그때마다 헤더를 새로 만든다
  const forward = () => NextResponse.next({ request: { headers: new Headers(request.headers) } });
  let response = forward();
  const noSession = { response, signedIn: false, signOut: async () => response };

  const env = readSupabaseEnv();
  if (!env) return noSession;

  try {
    // 클라이언트 만들기도 try 안에 둔다 — 주소 값이 잘못되면 여기서 던지는데, 그때 /admin 전체가 500 이 되면 안 된다.
    const supabase = createServerClient<Database>(env.url, env.publishableKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          // 갱신된 토큰을 이 요청을 이어 받는 서버 컴포넌트도 보게 요청 쿠키에 먼저 넣고, 응답을 다시 만든다.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = forward();
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          // 로그인 쿠키를 싣는 응답은 CDN 에 저장되면 안 된다(다른 사람에게 그 토큰이 나간다).
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    });
    const signOut = async () => {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // 연결이 끊겨도 아래 응답(쿠키 지움)은 돌려준다
      }
      return response;
    };
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    // 익명 로그인 토큰도 sub 가 있다 — 관리자 로그인으로 치지 않는다.
    const signedIn = !error && typeof claims?.sub === 'string' && claims.is_anonymous !== true;
    return { response, signedIn, signOut };
  } catch {
    return { ...noSession, response };
  }
};
