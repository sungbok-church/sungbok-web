import { afterEach, describe, expect, it, vi } from 'vitest';

import { changePassword } from './passwordActions';

const db = vi.hoisted(() => ({
  updateUser: vi.fn(),
  profileUpdate: vi.fn(),
  eq: vi.fn(),
}));

vi.mock('./session.server', () => ({
  requireAdminUser: vi.fn(async () => ({ id: 'u1', email: 'a@b.kr' })),
}));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { updateUser: db.updateUser },
    from: () => ({ update: (patch: unknown) => (db.profileUpdate(patch), { eq: db.eq }) }),
  })),
}));

afterEach(() => vi.clearAllMocks());

describe('changePassword', () => {
  it('입력이 틀리면 칸별 오류, Supabase 는 부르지 않는다', async () => {
    const res = await changePassword({ password: 'short', confirm: 'short' });
    expect(res).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT', fields: { password: ['8자 이상으로 정해 주세요.'] } },
    });
    expect(db.updateUser).not.toHaveBeenCalled();
  });

  it('바꾸면 «비밀번호를 바꿔야 함» 표시를 끈다(자기 행)', async () => {
    db.updateUser.mockResolvedValue({ error: null });
    db.eq.mockResolvedValue({ error: null });
    const res = await changePassword({ password: 'new-pass-1', confirm: 'new-pass-1' });
    expect(db.updateUser).toHaveBeenCalledWith({ password: 'new-pass-1' });
    expect(db.profileUpdate).toHaveBeenCalledWith({ must_change_password: false });
    expect(db.eq).toHaveBeenCalledWith('id', 'u1');
    expect(res).toEqual({ ok: true, message: '비밀번호를 바꿨습니다.' });
  });

  it.each([
    ['same_password', '지금 비밀번호와 다른 비밀번호로 정해 주세요.'],
    ['weak_password', '더 길거나 쉽게 짐작하기 어려운 비밀번호로 정해 주세요.'],
  ])('로그인 서버가 비밀번호 규칙으로 거절하면(%s) 그 칸의 문장으로', async (code, message) => {
    db.updateUser.mockResolvedValue({ error: { code, message: 'raw' } });
    expect(await changePassword({ password: 'new-pass-1', confirm: 'new-pass-1' })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT', fields: { password: [message] } },
    });
    expect(db.profileUpdate).not.toHaveBeenCalled();
  });

  it('그 밖의 거절은 INTERNAL(원문은 보이지 않는다)', async () => {
    db.updateUser.mockResolvedValue({ error: { code: 'unexpected', message: 'raw' } });
    expect(await changePassword({ password: 'new-pass-1', confirm: 'new-pass-1' })).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL' },
    });
    expect(db.profileUpdate).not.toHaveBeenCalled();
  });
});
