import { afterEach, describe, expect, it, vi } from 'vitest';

import { readListDefaults } from './listDefaults.server';

const jar = vi.hoisted(() => ({ value: undefined as string | undefined }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => (jar.value === undefined ? undefined : { value: jar.value }),
  }),
}));
afterEach(() => {
  jar.value = undefined;
});

describe('readListDefaults', () => {
  it('마지막에 고른 쪽당 개수(쿠키)', async () => {
    jar.value = '50';
    expect(await readListDefaults()).toEqual({ size: 50 });
  });

  it('없거나 숫자가 아니면 비운다(목록 기본값을 쓴다)', async () => {
    expect(await readListDefaults()).toEqual({});
    jar.value = 'abc';
    expect(await readListDefaults()).toEqual({});
  });
});
