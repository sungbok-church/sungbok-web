import { afterEach, describe, expect, it, vi } from 'vitest';

import { changePassword } from './passwordActions';

const db = vi.hoisted(() => ({
  updateUser: vi.fn(),
  signOut: vi.fn(),
  profileUpdate: vi.fn(),
  eq: vi.fn(),
}));

vi.mock('../server/session.server', () => ({
  requireAdminUser: vi.fn(async () => ({ id: 'u1', email: 'a@b.kr' })),
}));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { updateUser: db.updateUser, signOut: db.signOut },
    from: () => ({ update: (patch: unknown) => (db.profileUpdate(patch), { eq: db.eq }) }),
  })),
}));

afterEach(() => vi.clearAllMocks());

describe('changePassword', () => {
  it('«바꿔야 함» 표시를 끄지 못하면 성공으로 알리지 않는다 — 알리면 다음 화면에서 다시 비밀번호 화면으로 돌아와 같은 비밀번호로 막힌다', async () => {
    db.updateUser.mockResolvedValue({ error: null });
    db.eq.mockResolvedValue({ error: { message: 'boom' } });
    const res = await changePassword({ password: 'new-pass-123', confirm: 'new-pass-123' });
    expect(res).toMatchObject({ ok: false });
    // 비밀번호는 이미 바뀌었다 — 옛 비밀번호로 들어와 있던 다른 기기는 이때도 끊는다
    expect(db.signOut).toHaveBeenCalledWith({ scope: 'others' });
  });

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

  it('바꾸면 같은 계정의 다른 기기 로그인을 끊는다(이 기기는 남긴다)', async () => {
    db.updateUser.mockResolvedValue({ error: null });
    db.eq.mockResolvedValue({ error: null });
    db.signOut.mockResolvedValue({ error: null });
    await changePassword({ password: 'new-pass-1', confirm: 'new-pass-1' });
    expect(db.signOut).toHaveBeenCalledWith({ scope: 'others' });
  });

  it('다른 기기 끊기가 실패해도 바꾼 것은 성공으로 알린다', async () => {
    db.updateUser.mockResolvedValue({ error: null });
    db.eq.mockResolvedValue({ error: null });
    db.signOut.mockRejectedValue(new Error('network'));
    expect(await changePassword({ password: 'new-pass-1', confirm: 'new-pass-1' })).toEqual({
      ok: true,
      message: '비밀번호를 바꿨습니다.',
    });
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
    expect(db.signOut).not.toHaveBeenCalled();
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
