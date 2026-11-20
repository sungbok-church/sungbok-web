import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { NextResponse, type NextRequest } from 'next/server';

const REASONS = new Set(['inactive']);

/**
 * 서버가 로그아웃시킬 때 지나가는 주소 — 꺼진 계정 · 사용자 정보가 없는 계정(adminContext.server).
 * 서버 컴포넌트는 쿠키를 지울 수 없어서 여기(route handler)에서 세션을 끊고 로그인 화면으로 보낸다.
 * 사용자가 누르는 «로그아웃» 은 Server Action(authActions.signOut)이다.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // 연결이 끊겨도 로그인 화면으로는 보낸다
  }
  const reason = request.nextUrl.searchParams.get('reason');
  const to = new URL('/admin/login', request.url);
  if (reason && REASONS.has(reason)) to.searchParams.set('reason', reason);
  return NextResponse.redirect(to);
}
