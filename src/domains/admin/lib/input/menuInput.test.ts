import { describe, expect, it } from 'vitest';

import { menuUpdateSchema } from './menuInput';

describe('menuUpdateSchema', () => {
  it('이름을 비우면 null(= 기본 이름으로)', () => {
    expect(
      menuUpdateSchema.parse({
        id: '0190a0b0-0000-7000-8000-000000000001',
        updatedAt: 't',
        label: '  ',
        isActive: true,
      }).label
    ).toBeNull();
  });
});
