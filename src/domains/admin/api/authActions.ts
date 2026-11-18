'use server';

import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { redirect } from 'next/navigation';

import { ADMIN_LOGIN, safeNextPath } from './authRedirect';
import { loginInputSchema } from './loginInput';

// 관리자 로그인·로그아웃 Server Action. 로그인은 Supabase Auth 의 이메일 + 비밀번호다(가입은 막혀 있다).

/** error: 안내 문구. email: 실패했을 때 적었던 이메일(폼이 비워지므로 다시 채워 준다 — 비밀번호는 돌려주지 않는다) */
export type LoginState = { error?: string; email?: string };

const NOT_CONFIGURED = '관리자 로그인이 아직 설정되지 않았습니다.';
const MISMATCH = '이메일 또는 비밀번호가 맞지 않습니다.';
const UNREACHABLE = '로그인 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.';

// Supabase 는 연결 실패(status 0)·서버 오류(5xx)·횟수 제한(429)을 던지지 않고 error 로 돌려준다.
// 이것들은 적은 값이 틀린 것이 아니다 — «맞지 않습니다» 로 알리면 맞게 적은 사람이 비밀번호 초기화를 요청한다.
const isServerTrouble = (error: { status?: number }) =>
  !error.status || error.status === 429 || error.status >= 500;

/**
 * 로그인 폼(`useActionState`)이 부른다. 성공하면 `next`(사이트 안 /admin 경로만)로 보내고, 실패하면 안내 문구를 돌려준다.
 * 거절됐을 때 이메일과 비밀번호 중 어느 쪽이 틀렸는지는 말하지 않는다(계정이 있는지 알려 주지 않는다).
 */
export const signIn = async (_prev: LoginState, formData: FormData): Promise<LoginState> => {
  const rawEmail = formData.get('email');
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';
  const parsed = loginInputSchema.safeParse({ email, password: formData.get('password') });
  if (!parsed.success) return { error: '이메일과 비밀번호를 입력해 주세요.', email };
  if (!readSupabaseEnv()) return { error: NOT_CONFIGURED, email };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: isServerTrouble(error) ? UNREACHABLE : MISMATCH, email };
  } catch {
    return { error: UNREACHABLE, email };
  }

  // redirect 는 던져서 동작한다 — try 밖에서 부른다.
  const next = formData.get('next');
  redirect(safeNextPath(typeof next === 'string' ? next : null));
};

/**
 * 이 브라우저의 세션을 끝내고 로그인 화면으로 보낸다.
 * scope 'local' 은 서버 응답을 기다리지 않고 쿠키부터 지운다 — 기본값(global)은 서버 호출이 성공해야 쿠키를 지워서,
 * 연결이 끊긴 순간 로그아웃하면 로그인 상태가 남는다(공용 PC 에서 위험). 같은 계정의 다른 기기는 끊지 않는다.
 */
export const signOut = async (): Promise<void> => {
  if (readSupabaseEnv()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // 사용자를 붙잡아 두지 않는다 — 로그인 화면으로는 보낸다.
    }
  }
  redirect(ADMIN_LOGIN);
};
