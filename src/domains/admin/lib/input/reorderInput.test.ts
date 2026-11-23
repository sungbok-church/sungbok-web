import { describe, expect, it } from 'vitest';

import { reorderSchema } from './reorderInput';

describe('reorderSchema', () => {
  const A = '0190a0b0-0000-7000-8000-000000000001';
  const B = '0190a0b0-0000-7000-8000-000000000002';

  it('한 무리의 id 목록(새 순서대로)', () => {
    expect(reorderSchema.parse({ ids: [B, A] })).toEqual({ ids: [B, A] });
  });

  it('빈 목록 · 겹친 id · uuid 가 아닌 값은 거절', () => {
    expect(reorderSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(reorderSchema.safeParse({ ids: [A, A] }).success).toBe(false);
    expect(reorderSchema.safeParse({ ids: ['x'] }).success).toBe(false);
  });

  it('지나치게 긴 목록은 거절(한 무리는 많아야 수십 줄)', () => {
    const many = Array.from(
      { length: 201 },
      (_, i) => `0190a0b0-0000-7000-8000-${String(i).padStart(12, '0')}`
    );
    expect(reorderSchema.safeParse({ ids: many }).success).toBe(false);
  });
});
