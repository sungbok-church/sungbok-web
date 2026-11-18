import 'server-only';

import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { redirect } from 'next/navigation';

import { ADMIN_LOGIN } from './authRedirect';

export type AdminUser = { id: string; email: string };

/**
 * 지금 요청의 로그인한 사람(없으면 null). 토큰 서명을 검증하는 `getClaims()` 로 읽는다 — `getSession()` 을 쓰지 않는다.
 * 환경변수가 없거나 Supabase 가 응답하지 않으면 로그인 안 한 것으로 본다(오류 화면을 내지 않는다).
 * 패키지 1 에서는 «로그인했는가» 만 본다. 그룹·권한 판정은 패키지 2 에서 이 위에 얹는다.
 */
export const getAdminUser = async (): Promise<AdminUser | null> => {
  if (!readSupabaseEnv()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    // 익명 로그인 토큰도 sub 가 있다 — 운영에서 익명 로그인이 켜지더라도 관리자로 치지 않는다.
    if (error || typeof claims?.sub !== 'string' || claims.is_anonymous === true) return null;
    return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : '' };
  } catch {
    return null;
  }
};

/** 로그인한 사람을 돌려주고, 없으면 로그인 화면으로 보낸다. 관리자 페이지와 Server Action 이 시작할 때 부른다. */
export const requireAdminUser = async (): Promise<AdminUser> => {
  const user = await getAdminUser();
  if (!user) redirect(ADMIN_LOGIN);
  return user;
};
