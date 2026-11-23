import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { addRowLast, saveRow, saveRowOrder } from './rowActions.server';

const m = vi.hoisted(() => ({
  permission: vi.fn(async () => ({ user: { id: 'actor' } }) as unknown),
  versioned: vi.fn(),
  reorder: vi.fn(),
  last: [] as { sort: number }[],
  inserted: vi.fn(),
}));

vi.mock('./adminContext.server', () => ({
  actionPermission: m.permission,
  NO_PERMISSION: { ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } },
}));
vi.mock('./versionedUpdate.server', () => ({ updateVersioned: m.versioned }));
vi.mock('./sortRows.server', () => ({ applyReorder: m.reorder }));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({})),
}));

const ID = '0190a0b0-0000-7000-8000-000000000001';
const schema = z.object({
  id: z.uuid(),
  updatedAt: z.string().min(1),
  label: z.string().min(1),
  isActive: z.boolean(),
});
const revalidate = vi.fn();

const client = () => ({
  from: () => ({
    select: () => {
      const chain = {
        eq: () => chain,
        order: () => chain,
        limit: async () => ({ data: m.last, error: null }),
      };
      return chain;
    },
    insert: async (row: unknown) => m.inserted(row),
  }),
});

beforeEach(() => {
  m.versioned.mockResolvedValue({ ok: true, data: { updatedAt: 't2' }, message: '저장했습니다.' });
  m.reorder.mockResolvedValue({ ok: true, message: '순서를 바꿨습니다.' });
  m.inserted.mockResolvedValue({ error: null });
  m.last = [];
});
afterEach(() => vi.clearAllMocks());

describe('saveRow', () => {
  const spec = { table: 'codes', menuKey: 'codes', schema, revalidate } as const;

  it('그 화면의 수정 권한으로, 열었을 때의 updated_at 으로 이름 · 사용 여부를 고치고 다시 그린다', async () => {
    expect(await saveRow(spec, { id: ID, updatedAt: 't1', label: '가', isActive: false })).toEqual({
      ok: true,
      data: { updatedAt: 't2' },
      message: '저장했습니다.',
    });
    expect(m.permission).toHaveBeenCalledWith('codes', 'UPDATE');
    expect(m.versioned).toHaveBeenCalledWith(expect.anything(), 'codes', ID, 't1', {
      label: '가',
      is_active: false,
    });
    expect(revalidate).toHaveBeenCalledOnce();
  });

  it('권한이 없거나 입력이 틀리면 저장하지 않는다', async () => {
    m.permission.mockResolvedValueOnce(null);
    expect(await saveRow(spec, { id: ID, updatedAt: 't', label: '가', isActive: true })).toEqual({
      ok: false,
      error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' },
    });
    expect(await saveRow(spec, { id: 'x' })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT' },
    });
    expect(m.versioned).not.toHaveBeenCalled();
  });

  it('실패하면 다시 그리지 않는다', async () => {
    m.versioned.mockResolvedValueOnce({ ok: false, error: { code: 'CONFLICT', message: '' } });
    await saveRow(spec, { id: ID, updatedAt: 't', label: '가', isActive: true });
    expect(revalidate).not.toHaveBeenCalled();
  });
});

describe('saveRowOrder', () => {
  const spec = { table: 'menus', menuKey: 'menus', revalidate } as const;

  it('수정 권한으로, 받은 순서 그대로 한 번에 저장하고 다시 그린다', async () => {
    expect(await saveRowOrder(spec, { ids: [ID] })).toEqual({
      ok: true,
      message: '순서를 바꿨습니다.',
    });
    expect(m.permission).toHaveBeenCalledWith('menus', 'UPDATE');
    expect(m.reorder).toHaveBeenCalledWith(expect.anything(), 'menus', [ID]);
    expect(revalidate).toHaveBeenCalledOnce();
  });

  it('겹친 id 는 거절하고, 실패하면 다시 그리지 않는다', async () => {
    expect(await saveRowOrder(spec, { ids: [ID, ID] })).toMatchObject({ ok: false });
    expect(m.reorder).not.toHaveBeenCalled();
    m.reorder.mockResolvedValueOnce({ ok: false, error: { code: 'NOT_ALLOWED', message: '' } });
    await saveRowOrder(spec, { ids: [ID] });
    expect(revalidate).not.toHaveBeenCalled();
  });
});

describe('addRowLast', () => {
  it('묶음의 맨 뒤(마지막 순서 + 10)에 넣고 다시 그린다', async () => {
    m.last = [{ sort: 30 }];
    const res = await addRowLast(
      client() as never,
      'categories',
      { group_key: 'A', slug: 'a', label: '가' },
      { message: '더했습니다.', revalidate }
    );
    expect(m.inserted).toHaveBeenCalledWith({ group_key: 'A', slug: 'a', label: '가', sort: 40 });
    expect(res).toEqual({ ok: true, message: '더했습니다.' });
    expect(revalidate).toHaveBeenCalledOnce();
  });

  it('빈 묶음이면 10 부터, DB 가 거절하면 오류 코드로 돌려주고 다시 그리지 않는다', async () => {
    m.inserted.mockResolvedValueOnce({ error: { code: '23505', message: 'dup' } });
    expect(
      await addRowLast(
        client() as never,
        'codes',
        { group_key: 'A', code: 'X', label: '가' },
        { message: '더했습니다.', revalidate }
      )
    ).toEqual({ ok: false, error: { code: 'DUPLICATE', message: '이미 있는 값입니다.' } });
    expect(m.inserted).toHaveBeenCalledWith({ group_key: 'A', code: 'X', label: '가', sort: 10 });
    expect(revalidate).not.toHaveBeenCalled();
  });
});
