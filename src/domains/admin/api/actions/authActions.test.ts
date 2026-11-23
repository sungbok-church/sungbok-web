import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { redirect } from 'next/navigation';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { requestPasswordReset, signIn, signOut } from './authActions';

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));
const requestHeaders = vi.hoisted(() => new Map<string, string>());
// 비밀번호 찾기 켜짐 여부 — 운영 값은 메일 서비스를 붙이기 전까지 false(lib/passwordReset). 흐름 시험은 켠 채로 한다
const resetFlag = vi.hoisted(() => ({ enabled: true }));
vi.mock('../../lib/passwordReset', async importOriginal => {
  const mod = await importOriginal<object>();
  return Object.defineProperty({ ...mod }, 'PASSWORD_RESET_ENABLED', {
    get: () => resetFlag.enabled,
    enumerable: true,
  });
});

vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth })),
}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ get: (name: string) => requestHeaders.get(name) ?? null })),
}));

// Supabase 가 틀린 이메일·비밀번호에 돌려주는 오류 모양
const REJECTED = { name: 'AuthApiError', status: 400, code: 'invalid_credentials' };

const form = (values: Record<string, string>) => {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
};

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'k');
  auth.signInWithPassword.mockResolvedValue({ error: null });
  auth.signOut.mockResolvedValue({ error: null });
  auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  requestHeaders.clear();
  requestHeaders.set('origin', 'https://sungbok-web.vercel.app');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('signIn', () => {
  it('값이 빠지면 Supabase 를 부르지 않고 안내를 돌려준다', async () => {
    expect(await signIn({}, form({ email: '', password: '' }))).toEqual({
      error: expect.objectContaining({ message: '이메일과 비밀번호를 입력해 주세요.' }),
      email: '',
    });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('로그인이 거절되면 어느 쪽이 틀렸는지 말하지 않는다', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: REJECTED });
    expect(await signIn({}, form({ email: 'a@b.kr', password: 'x' }))).toEqual({
      error: expect.objectContaining({ message: '이메일 또는 비밀번호가 맞지 않습니다.' }),
      email: 'a@b.kr',
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('실패하면 적었던 이메일을 돌려준다(다시 적지 않게) — 비밀번호는 돌려주지 않는다', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: REJECTED });
    const state = await signIn({}, form({ email: ' a@b.kr ', password: 'secret-pw' }));
    expect(state.email).toBe('a@b.kr');
    expect(JSON.stringify(state)).not.toContain('secret-pw');
  });

  it('앞뒤 공백을 지운 이메일과 그대로의 비밀번호로 로그인한다', async () => {
    await signIn({}, form({ email: ' a@b.kr ', password: ' p w ' }));
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.kr', password: ' p w ' });
  });

  it('성공하면 next 로 보낸다 — 바깥 주소는 /admin 으로', async () => {
    await signIn({}, form({ email: 'a@b.kr', password: 'x', next: '/admin/bulletin' }));
    expect(redirect).toHaveBeenCalledWith('/admin/bulletin');
    await signIn({}, form({ email: 'a@b.kr', password: 'x', next: 'https://evil.example' }));
    expect(redirect).toHaveBeenLastCalledWith('/admin');
    await signIn({}, form({ email: 'a@b.kr', password: 'x' }));
    expect(redirect).toHaveBeenLastCalledWith('/admin');
  });

  it('환경변수가 없으면 Supabase 를 부르지 않고 설정 안내를 돌려준다', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    expect(await signIn({}, form({ email: 'a@b.kr', password: 'x' }))).toEqual({
      error: expect.objectContaining({ message: '관리자 로그인이 아직 설정되지 않았습니다.' }),
      email: 'a@b.kr',
    });
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  // auth-js 는 연결 실패를 던지지 않고 { error } 로 돌려준다(status 0 · 5xx). 횟수 제한은 429.
  // 이것들을 «비밀번호가 맞지 않습니다» 로 알리면 맞게 적은 사람이 비밀번호 초기화를 요청한다.
  it.each([
    [{ name: 'AuthRetryableFetchError', status: 0 }],
    [{ name: 'AuthRetryableFetchError', status: 503 }],
    [{ name: 'AuthApiError', status: 500, code: 'unexpected_failure' }],
    [{ name: 'AuthApiError', status: 429, code: 'over_request_rate_limit' }],
    [{ name: 'AuthUnknownError', status: undefined }],
  ])('서버 장애·횟수 제한(%o)은 비밀번호 불일치로 알리지 않는다', async error => {
    auth.signInWithPassword.mockResolvedValue({ error });
    expect(await signIn({}, form({ email: 'a@b.kr', password: 'x' }))).toEqual({
      error: expect.objectContaining({
        message: '로그인 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
      }),
      email: 'a@b.kr',
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('정지된 계정처럼 그 밖의 거절(4xx)도 불일치 문구 하나로 알린다', async () => {
    auth.signInWithPassword.mockResolvedValue({
      error: { name: 'AuthApiError', status: 400, code: 'user_banned' },
    });
    expect((await signIn({}, form({ email: 'a@b.kr', password: 'x' }))).error?.message).toBe(
      '이메일 또는 비밀번호가 맞지 않습니다.'
    );
  });

  it('Supabase 에 닿지 못해 던져도 잠시 뒤 다시 하라고 알린다', async () => {
    auth.signInWithPassword.mockRejectedValue(new Error('fetch failed'));
    expect(await signIn({}, form({ email: 'a@b.kr', password: 'x' }))).toEqual({
      error: expect.objectContaining({
        message: '로그인 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
      }),
      email: 'a@b.kr',
    });
  });
});

describe('signOut', () => {
  // scope 'local' 은 서버 응답을 기다리지 않고 이 브라우저의 쿠키부터 지운다.
  // 기본값(global)은 서버 호출이 성공해야 쿠키를 지워서, 연결이 끊긴 순간 로그아웃하면 로그인 상태가 남는다.
  it('이 브라우저의 세션을 끝내고(scope: local) 로그인 화면으로 보낸다', async () => {
    await signOut();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(redirect).toHaveBeenCalledWith('/admin/login');
  });

  it('환경변수가 없거나 세션 끝내기가 실패해도 로그인 화면으로 보낸다', async () => {
    auth.signOut.mockRejectedValue(new Error('fetch failed'));
    await signOut();
    expect(redirect).toHaveBeenCalledWith('/admin/login');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    await signOut();
    expect(redirect).toHaveBeenCalledTimes(2);
  });
});

describe('requestPasswordReset', () => {
  const SENT = { sent: true, email: 'a@b.kr' };

  it('비밀번호 찾기를 꺼 두었으면(메일 서비스 전) 화면을 거치지 않고 직접 불러도 메일을 보내지 않는다', async () => {
    resetFlag.enabled = false;
    try {
      const res = await requestPasswordReset({}, form({ email: 'a@b.kr' }));
      expect(res).toMatchObject({ error: expect.objectContaining({ code: 'NOT_CONFIGURED' }) });
      expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
    } finally {
      resetFlag.enabled = true;
    }
  });

  it('이메일이 틀리면 Supabase 를 부르지 않고 안내를 돌려준다', async () => {
    expect(await requestPasswordReset({}, form({ email: 'nope' }))).toEqual({
      error: expect.objectContaining({
        code: 'INVALID_INPUT',
        message: '이메일을 바르게 입력해 주세요.',
      }),
      email: 'nope',
    });
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('앞뒤 공백을 지운 이메일로, 이 사이트의 확인 주소를 실어 보낸다', async () => {
    expect(await requestPasswordReset({}, form({ email: ' a@b.kr ' }))).toEqual(SENT);
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.kr', {
      redirectTo: 'https://sungbok-web.vercel.app/admin/login/confirm',
    });
  });

  it('요청 주소(origin)를 모르면 redirectTo 없이 보낸다(Supabase 의 Site URL)', async () => {
    requestHeaders.clear();
    await requestPasswordReset({}, form({ email: 'a@b.kr' }));
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.kr', { redirectTo: undefined });
  });

  // 계정이 없을 때 Supabase 는 200 을 준다. 계정이 있을 때만 나는 거절(메일 발송 실패 500,
  // 기본 메일로 팀 밖 주소 400 email_address_not_authorized)을 화면에 내면 계정이 있는지 알려 주게 된다.
  it.each([
    [{ name: 'AuthApiError', status: 400, code: 'email_address_not_authorized' }],
    [{ name: 'AuthApiError', status: 500, code: 'unexpected_failure' }],
    [{ name: 'AuthApiError', status: 422, code: 'validation_failed' }],
  ])('계정이 있는지 드러나는 거절(%o)도 같은 «보냈습니다» 로', async error => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    auth.resetPasswordForEmail.mockResolvedValue({ data: null, error });
    expect(await requestPasswordReset({}, form({ email: 'a@b.kr' }))).toEqual(SENT);
    expect(log).toHaveBeenCalled(); // 운영자는 서버 로그로 본다(이메일은 찍지 않는다)
    expect(JSON.stringify(log.mock.calls)).not.toContain('a@b.kr');
    log.mockRestore();
  });

  it('횟수 제한(429)은 잠시 뒤 다시 하라고 알린다', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { name: 'AuthApiError', status: 429, code: 'over_email_send_rate_limit' },
    });
    expect(await requestPasswordReset({}, form({ email: 'a@b.kr' }))).toEqual({
      error: expect.objectContaining({
        code: 'RATE_LIMITED',
        message: '잠시 뒤에 다시 시도해 주세요.',
      }),
      email: 'a@b.kr',
    });
  });

  it.each([
    [{ name: 'AuthRetryableFetchError', status: 0 }],
    [{ name: 'AuthRetryableFetchError', status: 503 }],
    [{ name: 'AuthUnknownError', status: undefined }],
  ])('Supabase 에 닿지 못하면(%o) 연결 안내', async error => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: null, error });
    expect((await requestPasswordReset({}, form({ email: 'a@b.kr' }))).error?.code).toBe(
      'SERVICE_UNAVAILABLE'
    );
  });

  it('던져도 연결 안내', async () => {
    auth.resetPasswordForEmail.mockRejectedValue(new Error('fetch failed'));
    expect((await requestPasswordReset({}, form({ email: 'a@b.kr' }))).error?.code).toBe(
      'SERVICE_UNAVAILABLE'
    );
  });

  it('환경변수가 없으면 Supabase 를 부르지 않고 설정 안내', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    expect((await requestPasswordReset({}, form({ email: 'a@b.kr' }))).error?.code).toBe(
      'NOT_CONFIGURED'
    );
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });
});
