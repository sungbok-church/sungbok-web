import { describe, expect, it } from 'vitest';

import {
  forgotInputSchema,
  parseRecoveryLink,
  RECOVERY_CONFIRM_PATH,
  RECOVERY_DONE_PATH,
  RECOVERY_FAILED_PATH,
  recoveryRedirectTo,
} from './passwordReset';

const params = (query: string) => new URLSearchParams(query);

describe('forgotInputSchema', () => {
  it('앞뒤 공백을 지운 이메일을 받는다', () => {
    expect(forgotInputSchema.parse({ email: ' a@b.kr ' })).toEqual({ email: 'a@b.kr' });
  });

  it.each([[{ email: '' }], [{ email: 'not-an-email' }], [{}]])('틀리면 거절 (%o)', v =>
    expect(forgotInputSchema.safeParse(v).success).toBe(false)
  );
});

describe('parseRecoveryLink', () => {
  it('메일 링크의 token_hash(type=recovery)를 읽는다 — 어느 기기에서 열어도 된다', () => {
    expect(parseRecoveryLink(params('token_hash=pkce_abc123&type=recovery'))).toEqual({
      kind: 'otp',
      tokenHash: 'pkce_abc123',
    });
  });

  it('메일 양식을 바꾸기 전의 기본 링크(code)도 받는다 — 요청한 브라우저에서만 된다', () => {
    expect(parseRecoveryLink(params('code=0b6f2a1c-1d2e-4f00-9a7b-3c4d5e6f7a8b'))).toEqual({
      kind: 'code',
      code: '0b6f2a1c-1d2e-4f00-9a7b-3c4d5e6f7a8b',
    });
  });

  it.each([
    [''],
    ['type=recovery'],
    ['token_hash=abc'], // type 이 없다
    ['token_hash=abc&type=signup'], // 비밀번호 찾기 링크가 아니다
    ['token_hash=&type=recovery'],
    ['token_hash=a%0Ab&type=recovery'], // 줄바꿈 같은 엉뚱한 글자
    [`token_hash=${'a'.repeat(300)}&type=recovery`],
    ['error=access_denied&error_code=otp_expired'], // Supabase 가 만료를 알릴 때의 모양
  ])('읽을 수 없는 링크는 null (%s)', query => {
    expect(parseRecoveryLink(params(query))).toBeNull();
  });
});

describe('recoveryRedirectTo', () => {
  it('요청한 사이트 주소 + 확인 경로', () => {
    expect(recoveryRedirectTo('https://sungbok-web.vercel.app')).toBe(
      'https://sungbok-web.vercel.app/admin/login/confirm'
    );
    expect(recoveryRedirectTo('http://localhost:3005')).toBe(
      'http://localhost:3005/admin/login/confirm'
    );
  });

  it.each([[null], [''], ['null'], ['javascript:alert(1)'], ['not a url']])(
    '주소를 알 수 없으면 undefined — Supabase 의 Site URL 을 쓴다 (%s)',
    origin => expect(recoveryRedirectTo(origin)).toBeUndefined()
  );
});

describe('경로', () => {
  it('확인 경로는 로그인 화면 아래(proxy 가 로그인 없이 열어 둔다)', () => {
    expect(RECOVERY_CONFIRM_PATH).toBe('/admin/login/confirm');
    expect(RECOVERY_DONE_PATH).toBe('/admin/password');
    expect(RECOVERY_FAILED_PATH).toBe('/admin/login?reason=reset_expired');
  });
});
