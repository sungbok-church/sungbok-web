import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCategory, moveCategory } from './categoryActions';

const m = vi.hoisted(() => ({
  permission: vi.fn(async () => ({ user: { id: 'actor' } }) as unknown),
  siblings: [] as { id: string; sort: number; group_key?: string }[],
  inserted: vi.fn(),
  sortUpdates: [] as unknown[],
  target: null as null | { group_key: string },
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('./adminContext.server', () => ({
  actionPermission: m.permission,
  NO_PERMISSION: { ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } },
}));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: () => ({
      select: () => {
        const chain = {
          eq: () => chain,
          order: () => chain,
          limit: async () => ({ data: m.siblings.slice(-1), error: null }),
          maybeSingle: async () => ({ data: m.target, error: null }),
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve({ data: m.siblings, error: null }).then(resolve),
        };
        return chain;
      },
      insert: async (row: unknown) => m.inserted(row),
      update: (patch: unknown) => ({
        eq: async (_: string, id: string) => (m.sortUpdates.push([id, patch]), { error: null }),
      }),
    }),
  })),
}));

const ID = '0190a0b0-0000-7000-8000-000000000001';

beforeEach(() => {
  m.siblings = [];
  m.sortUpdates = [];
  m.target = { group_key: 'ALBUM_CATEGORY' };
  m.inserted.mockResolvedValue({ error: null });
});
afterEach(() => vi.clearAllMocks());

describe('createCategory', () => {
  it('묶음의 맨 뒤 순서로 넣는다', async () => {
    m.siblings = [{ id: 'x', sort: 30 }];
    const res = await createCategory({
      groupKey: 'ALBUM_CATEGORY',
      slug: 'event',
      label: '교회행사',
    });
    expect(m.permission).toHaveBeenCalledWith('categories', 'CREATE');
    expect(m.inserted).toHaveBeenCalledWith({
      group_key: 'ALBUM_CATEGORY',
      slug: 'event',
      label: '교회행사',
      sort: 40,
    });
    expect(res).toEqual({ ok: true, message: '분류를 더했습니다.' });
  });

  it('같은 코드 · 이름이 있으면 «이미 있는 값»', async () => {
    m.inserted.mockResolvedValue({ error: { code: '23505', message: 'dup' } });
    expect(
      await createCategory({ groupKey: 'ALBUM_CATEGORY', slug: 'event', label: '교회행사' })
    ).toEqual({
      ok: false,
      error: { code: 'DUPLICATE', message: '이미 있는 값입니다.' },
    });
  });
});

describe('moveCategory', () => {
  it('같은 묶음 안에서 순서를 바꾼다(바뀐 줄만 고친다)', async () => {
    m.siblings = [
      { id: 'a', sort: 10 },
      { id: ID, sort: 20 },
    ];
    expect(await moveCategory({ id: ID, dir: 'up' })).toEqual({
      ok: true,
      message: '순서를 바꿨습니다.',
    });
    expect(m.sortUpdates).toEqual([
      [ID, { sort: 10 }],
      ['a', { sort: 20 }],
    ]);
  });

  it('끝에서는 아무것도 하지 않는다', async () => {
    m.siblings = [{ id: ID, sort: 10 }];
    expect(await moveCategory({ id: ID, dir: 'up' })).toEqual({
      ok: true,
      message: '순서를 바꿨습니다.',
    });
    expect(m.sortUpdates).toEqual([]);
  });
});

describe('권한', () => {
  it('열려 있던 화면에서 권한이 빠졌으면 «권한이 없습니다»(404 를 던지지 않는다)', async () => {
    m.permission.mockResolvedValueOnce(null);
    expect(await createCategory({ groupKey: 'ALBUM_CATEGORY', slug: 'a', label: '가' })).toEqual({
      ok: false,
      error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' },
    });
  });
});
