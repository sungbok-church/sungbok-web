import { describe, expect, it } from 'vitest';

import { newcomerUpdateSchema } from './newcomerAdminInput';

const ID = '0190a0b0-0000-7000-8000-0000000000b1';

describe('newcomerUpdateSchema', () => {
  it('상태 · 메모(다듬음) — 모르는 상태 · 긴 메모는 안 된다', () => {
    expect(
      newcomerUpdateSchema.parse({ id: ID, updatedAt: 't', status: 'DONE', note: ' 끝 ' }).note
    ).toBe('끝');
    expect(
      newcomerUpdateSchema.safeParse({ id: ID, updatedAt: 't', status: 'X', note: '' }).success
    ).toBe(false);
    expect(
      newcomerUpdateSchema.safeParse({
        id: ID,
        updatedAt: 't',
        status: 'NEW',
        note: 'a'.repeat(2001),
      }).success
    ).toBe(false);
  });
});
