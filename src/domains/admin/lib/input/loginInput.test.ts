import { describe, expect, it } from 'vitest';

import { loginInputSchema } from './loginInput';

describe('loginInputSchema', () => {
  it('앞뒤 공백을 지운 이메일과 비밀번호를 받는다', () => {
    expect(loginInputSchema.parse({ email: ' a@b.kr ', password: 'pw' })).toEqual({
      email: 'a@b.kr',
      password: 'pw',
    });
  });

  it.each([
    [{ email: '', password: 'pw' }],
    [{ email: 'a@b.kr', password: '' }],
    [{ email: 'not-an-email', password: 'pw' }],
    [{}],
  ])('빠지거나 틀리면 거절 (%o)', v => expect(loginInputSchema.safeParse(v).success).toBe(false));

  it('비밀번호는 고치지 않는다(공백 포함)', () => {
    expect(loginInputSchema.parse({ email: 'a@b.kr', password: ' p w ' }).password).toBe(' p w ');
  });
});
