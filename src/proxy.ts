import { adminAuthDecision } from '@/domains/admin/api/authRedirect';
import { updateSession } from '@/shared/api/supabase/proxySession.server';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * 관리자(`/admin/*`) 요청에서만 돈다: 로그인 세션 쿠키를 갱신하고, 로그인하지 않았으면 로그인 화면으로 보낸다.
 * (Next 16 에서 middleware 가 proxy 로 이름이 바뀌었다 — 파일은 src/proxy.ts, 함수 이름은 proxy.)
 * 여기는 첫 관문일 뿐이다. 페이지와 Server Action 은 각자 다시 확인한다(`requireAdminUser`) —
 * Server Action 은 그것을 쓰는 페이지 주소로 POST 되므로, 매처 밖 페이지에서 부르면 여기를 지나지 않는다.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { response, signedIn } = await updateSession(request);
  const decision = adminAuthDecision(request.nextUrl.pathname, request.nextUrl.search, signedIn);
  if (decision.kind === 'pass') return response;

  const redirect = NextResponse.redirect(new URL(decision.to, request.url));
  // 방금 갱신한 로그인 쿠키를 돌려보내는 응답에도 싣는다 — 빠뜨리면 갱신된 토큰이 버려져 다음 요청에서 로그인이 풀린다.
  response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
  const cacheControl = response.headers.get('Cache-Control');
  if (cacheControl) redirect.headers.set('Cache-Control', cacheControl);
  return redirect;
}

// 매처를 넓히지 않는다 — 공개 페이지는 정적으로 만들어 두고 proxy 를 거치지 않는다.
export const config = { matcher: ['/admin/:path*'] };
