import { describe, expect, it, vi } from 'vitest';

import { updateVersioned } from './versionedUpdate.server';

const fakeClient = (result: { data: unknown; error: unknown }) => {
  const calls: unknown[][] = [];
  const chain = {
    update: (...a: unknown[]) => (calls.push(['update', ...a]), chain),
    eq: (...a: unknown[]) => (calls.push(['eq', ...a]), chain),
    select: async (...a: unknown[]) => (calls.push(['select', ...a]), result),
  };
  return { client: { from: vi.fn(() => chain) }, calls };
};

describe('updateVersioned', () => {
  it('열었던 updated_at 이 같을 때만 고친다', async () => {
    const { client, calls } = fakeClient({
      data: [{ updated_at: '2026-11-19T10:00:01Z' }],
      error: null,
    });
    const res = await updateVersioned(client as never, 'groups', 'g1', '2026-11-19T10:00:00Z', {
      name: '새 이름',
    });
    expect(res).toEqual({
      ok: true,
      data: { updatedAt: '2026-11-19T10:00:01Z' },
      message: '저장했습니다.',
    });
    expect(calls).toContainEqual(['eq', 'id', 'g1']);
    expect(calls).toContainEqual(['eq', 'updated_at', '2026-11-19T10:00:00Z']);
  });

  it('0줄이면 다른 사람이 먼저 고친 것', async () => {
    const { client } = fakeClient({ data: [], error: null });
    expect(await updateVersioned(client as never, 'groups', 'g1', 't', {})).toEqual({
      ok: false,
      error: { code: 'CONFLICT', message: expect.stringContaining('다른 사람이 먼저 고쳤습니다') },
    });
  });

  it('DB 오류는 쉬운 문구로', async () => {
    const { client } = fakeClient({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    });
    expect(await updateVersioned(client as never, 'groups', 'g1', 't', {})).toEqual({
      ok: false,
      error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' },
    });
  });
});
