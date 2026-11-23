// 비밀번호 찾기(메일 링크로 스스로 새 비밀번호 정하기)의 순수 함수 · 경로.
// 흐름: 찾기 화면(/admin/login/forgot) → 메일 → 확인 주소(/admin/login/confirm, route handler) → 비밀번호 바꾸기(/admin/password).
// 확인 주소는 로그인 화면 아래에 둔다 — proxy 가 로그인 없이 열어 두는 곳이다(authRedirect.ts).
import { z } from 'zod';

import { ADMIN_LOGIN_CONFIRM } from './authRedirect';
import { loginInputSchema } from './input/loginInput';

/**
 * 비밀번호 찾기를 켜는가 — 메일 서비스(Resend)를 Supabase SMTP 에 붙이기 전까지 끈다(2026-11-23 사용자).
 * Supabase 기본 메일은 프로젝트 팀 구성원에게만 가서, 켜 두면 다른 관리자는 «보냈습니다» 만 보고 메일을 못 받는다.
 * 켤 때: deploy-and-env.md 9절(SMTP · 메일 양식 · 허용 주소)을 먼저 하고 true 로 바꾼다. 그동안은 사용자 상세의 «비밀번호 초기화».
 */
export const PASSWORD_RESET_ENABLED = false;

export const RECOVERY_CONFIRM_PATH = ADMIN_LOGIN_CONFIRM;
/** 링크로 로그인한 뒤 갈 곳 — 비밀번호 바꾸기(adminContext.server 의 PASSWORD_PATH 와 같다) */
export const RECOVERY_DONE_PATH = '/admin/password';
/** 링크가 만료됐거나 이미 썼을 때 — 로그인 화면이 짧게 알린다 */
export const RECOVERY_FAILED_PATH = '/admin/login?reason=reset_expired';

/** 찾기 화면의 입력 — 로그인과 같은 이메일 규칙(앞뒤 공백을 지운다) */
export const forgotInputSchema = loginInputSchema.pick({ email: true });
export type ForgotInput = z.infer<typeof forgotInputSchema>;

// token_hash 는 `pkce_` + 16진수, code 는 UUID 다 — 그 밖의 글자 · 너무 긴 값은 Supabase 에 보내지 않는다.
const TOKEN = /^[\w-]{1,256}$/;

export type RecoveryLink = { kind: 'otp'; tokenHash: string } | { kind: 'code'; code: string };

/**
 * 메일 링크의 쿼리를 읽는다.
 * - otp: 우리 메일 양식의 링크(`token_hash` + `type=recovery`). 어느 기기 · 브라우저에서 열어도 된다.
 * - code: 대시보드 메일 양식을 아직 바꾸지 않았을 때의 기본 링크(Supabase 를 거쳐 `?code=` 로 온다).
 *   요청한 브라우저의 쿠키(PKCE 확인 값)가 있어야 해서 그 브라우저에서만 된다.
 * 읽을 수 없으면(만료를 알리는 `?error=…` 포함) null.
 */
export const parseRecoveryLink = (params: URLSearchParams): RecoveryLink | null => {
  const tokenHash = params.get('token_hash');
  if (tokenHash !== null)
    return params.get('type') === 'recovery' && TOKEN.test(tokenHash)
      ? { kind: 'otp', tokenHash }
      : null;
  const code = params.get('code');
  return code !== null && TOKEN.test(code) ? { kind: 'code', code } : null;
};

/**
 * 메일 요청에 실을 redirectTo — 요청한 사이트(origin) + 확인 경로.
 * 우리 메일 양식은 Site URL 로 링크를 만들어 이 값을 쓰지 않지만, 기본 양식일 때를 위해 싣는다.
 * origin 을 모르거나 http(s) 가 아니면 undefined(Supabase 가 Site URL 을 쓴다). 허용 목록에 없는 주소도 Supabase 가 Site URL 로 바꾼다.
 */
export const recoveryRedirectTo = (origin: string | null | undefined): string | undefined => {
  if (!origin) return undefined;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
  return `${url.origin}${RECOVERY_CONFIRM_PATH}`;
};
