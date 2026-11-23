import {
  PASSWORD_RESET_ENABLED,
  parseRecoveryLink,
  RECOVERY_DONE_PATH,
  RECOVERY_FAILED_PATH,
} from '@/domains/admin/lib/passwordReset';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * 비밀번호 찾기 메일의 링크가 오는 곳. 링크의 값으로 그 계정에 로그인시키고(쿠키는 이 응답에 실린다)
 * 비밀번호 바꾸기 화면으로 보낸다. 만료 · 이미 쓴 링크면 로그인 화면이 짧게 알린다.
 * 링크 읽기는 passwordReset.ts 의 parseRecoveryLink — 여기는 Supabase 를 부르고 보내기만 한다.
 */
export async function GET(request: NextRequest) {
  // 꺼 두었으면(메일 서비스 전) 없는 주소 — 남의 복구 링크로 지금 브라우저의 로그인이 바뀌지 않게
  if (!PASSWORD_RESET_ENABLED) return new NextResponse(null, { status: 404 });
  const link = parseRecoveryLink(request.nextUrl.searchParams);
  if (link) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } =
        link.kind === 'otp'
          ? await supabase.auth.verifyOtp({ type: 'recovery', token_hash: link.tokenHash })
          : await supabase.auth.exchangeCodeForSession(link.code);
      if (!error) return NextResponse.redirect(new URL(RECOVERY_DONE_PATH, request.url));
    } catch {
      // 연결이 끊겨도 로그인 화면으로는 보낸다
    }
  }
  return NextResponse.redirect(new URL(RECOVERY_FAILED_PATH, request.url));
}
