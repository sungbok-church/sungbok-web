import { describe, expect, it } from 'vitest';

import { passwordInputSchema } from './passwordInput';

const issues = (input: unknown) =>
  passwordInputSchema.safeParse(input).error?.issues.map(i => `${i.path.join('.')}:${i.message}`) ??
  [];

describe('passwordInputSchema', () => {
  it('8자 이상이고 두 칸이 같으면 통과', () => {
    expect(issues({ password: 'abcd1234', confirm: 'abcd1234' })).toEqual([]);
  });

  it('8자 미만', () => {
    expect(issues({ password: 'abc123', confirm: 'abc123' })).toEqual([
      'password:8자 이상으로 정해 주세요.',
    ]);
  });

  it('72자 초과(로그인 서버가 받는 길이)', () => {
    const long = 'a'.repeat(73);
    expect(issues({ password: long, confirm: long })).toEqual([
      'password:72자 이하로 정해 주세요.',
    ]);
  });

  it('두 칸이 다르면 확인 칸에 표시', () => {
    expect(issues({ password: 'abcd1234', confirm: 'abcd1235' })).toEqual([
      'confirm:두 비밀번호가 같지 않습니다.',
    ]);
  });
});
