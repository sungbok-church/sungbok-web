import { buildAdminCsp } from '@/domains/admin/lib/adminCsp';
import { adminAuthDecision } from '@/domains/admin/lib/authRedirect';
import { IDLE_COOKIE, IDLE_COOKIE_MAX_AGE, isIdle } from '@/domains/admin/lib/idleSession';
import { updateSession } from '@/shared/api/supabase/proxySession.server';
import { ADMIN_WARM_HEADER } from '@/shared/lib/adminWarmup';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * 관리자(`/admin/*`) 요청에서만 돈다:
 *   · 로그인 세션 쿠키를 갱신하고, 로그인하지 않았으면 로그인 화면으로 보낸다.
 *   · 보안 헤더(CSP)를 싣는다 — 요청마다 새 nonce(설계 6.10 «보안 헤더», adminCsp).
 *   · 마지막 요청 뒤 8시간이 지났으면 그 세션을 끊고 로그인 화면으로 보낸다(idleSession). 공개 페이지가 부른 서버 깨우기
 *     (shared/lib/adminWarmup)는 그 시각을 남기지도 지우지도 않는다.
 * (Next 16 에서 middleware 가 proxy 로 이름이 바뀌었다 — 파일은 src/proxy.ts, 함수 이름은 proxy.)
 * 여기는 첫 관문일 뿐이다. 페이지와 Server Action 은 각자 다시 확인한다(`requireAdminUser` · `requirePermission`) —
 * Server Action 은 그것을 쓰는 페이지 주소로 POST 되므로, 매처 밖 페이지에서 부르면 여기를 지나지 않는다.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const isDev = process.env.NODE_ENV === 'development';
  const nonce = btoa(crypto.randomUUID());
  const csp = buildAdminCsp({ nonce, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, isDev });
  const now = Date.now();

  const session = await updateSession(request, {
    'x-nonce': nonce,
    'content-security-policy': csp,
  });

  let result: NextResponse;
  if (session.signedIn && isIdle(request.cookies.get(IDLE_COOKIE)?.value, now)) {
    const signedOut = await session.signOut();
    result = redirectWith(new URL('/admin/login?reason=idle', request.url), signedOut);
    result.cookies.set(IDLE_COOKIE, '', { path: '/admin', maxAge: 0 });
  } else {
    const decision = adminAuthDecision(
      request.nextUrl.pathname,
      request.nextUrl.search,
      session.signedIn
    );
    result =
      decision.kind === 'pass'
        ? session.response
        : redirectWith(new URL(decision.to, request.url), session.response);
    // 공개 페이지가 부른 서버 깨우기(shared/lib/adminWarmup)는 사람이 관리자 화면을 쓴 것이 아니다 — 시각을 남기지도 지우지도
    // 않는다. 지우면 «막 로그인한 것» 이 되어 8시간이 새로 시작된다(Supabase 가 잠깐 답하지 않아 로그인 판정이 실패한 때 등).
    if (!request.headers.has(ADMIN_WARM_HEADER)) {
      if (session.signedIn) {
        result.cookies.set(IDLE_COOKIE, String(now), {
          path: '/admin',
          // 로그인 쿠키(@supabase/ssr 기본 400일)처럼 브라우저를 닫아도 남긴다 — 세션 쿠키로 두면 창만 닫고 간 공용 PC 에서
          // 다음 사람이 열 때 «막 로그인한 것» 으로 보여 8시간 규칙이 풀린다
          maxAge: IDLE_COOKIE_MAX_AGE,
          httpOnly: true,
          sameSite: 'lax',
          secure: !isDev,
        });
      } else if (request.cookies.has(IDLE_COOKIE)) {
        result.cookies.set(IDLE_COOKIE, '', { path: '/admin', maxAge: 0 });
      }
    }
  }

  result.headers.set('Content-Security-Policy', csp);
  return result;
}

/** 돌려보내는 응답에 방금 갱신한 로그인 쿠키와 캐시 금지 헤더를 옮긴다 — 빠뜨리면 갱신된 토큰이 버려진다. */
const redirectWith = (to: URL, from: NextResponse) => {
  const redirect = NextResponse.redirect(to);
  from.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
  const cacheControl = from.headers.get('Cache-Control');
  if (cacheControl) redirect.headers.set('Cache-Control', cacheControl);
  return redirect;
};

// 매처를 넓히지 않는다 — 공개 페이지는 정적으로 만들어 두고 proxy 를 거치지 않는다.
export const config = { matcher: ['/admin/:path*'] };
