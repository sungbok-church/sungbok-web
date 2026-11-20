import { describe, expect, it } from 'vitest';

import { generateTempPassword } from './tempPassword';

describe('generateTempPassword', () => {
  it('12자, 영대 · 영소 · 숫자가 하나씩은 있고 헷갈리는 글자(0 O 1 l I)가 없다', () => {
    for (let i = 0; i < 200; i += 1) {
      const pw = generateTempPassword();
      expect(pw).toHaveLength(12);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[2-9]/);
      expect(pw).not.toMatch(/[0O1lI]/);
    }
  });

  it('난수가 같으면 결과가 같다(난수 함수를 주입할 수 있다)', () => {
    const fixed = () => 0;
    expect(generateTempPassword(fixed)).toBe(generateTempPassword(fixed));
  });
});
