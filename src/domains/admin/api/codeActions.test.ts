import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createCode, moveCode, updateCode } from './codeActions';

const m = vi.hoisted(() => ({
  permission: vi.fn(async () => ({ user: { id: 'actor' } }) as unknown),
  group: null as null | { is_locked: boolean },
  siblings: [] as { id: string; sort: number }[],
  inserted: vi.fn(),
  versioned: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('./adminContext.server', () => ({
  actionPermission: m.permission,
  NO_PERMISSION: { ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } },
}));
vi.mock('./versionedUpdate.server', () => ({ updateVersioned: m.versioned }));
vi.mock('./sortRows.server', () => ({
  applyMove: vi.fn(async () => ({ ok: true, message: '순서를 바꿨습니다.' })),
}));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: (table: string) => ({
      select: () => {
        const chain = {
          eq: () => chain,
          order: () => chain,
          limit: async () => ({ data: m.siblings.slice(-1), error: null }),
          maybeSingle: async () => ({
            data: table === 'code_groups' ? m.group : { group_key: 'STAFF_ROLE' },
            error: null,
          }),
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve({ data: m.siblings, error: null }).then(resolve),
        };
        return chain;
      },
      insert: async (row: unknown) => m.inserted(row),
    }),
  })),
}));

const ID = '0190a0b0-0000-7000-8000-000000000001';

beforeEach(() => {
  m.group = { is_locked: false };
  m.siblings = [];
  m.inserted.mockResolvedValue({ error: null });
  m.versioned.mockResolvedValue({ ok: true, data: { updatedAt: 't2' }, message: '저장했습니다.' });
});
afterEach(() => vi.clearAllMocks());

describe('createCode', () => {
  it('«코드 관리» 등록 권한으로, 묶음의 맨 뒤 순서에 대문자 코드로 넣는다', async () => {
    m.siblings = [{ id: 'x', sort: 30 }];
    const res = await createCode({ groupKey: 'STAFF_ROLE', code: 'elder', label: '장로' });
    expect(m.permission).toHaveBeenCalledWith('codes', 'CREATE');
    expect(m.inserted).toHaveBeenCalledWith({
      group_key: 'STAFF_ROLE',
      code: 'ELDER',
      label: '장로',
      sort: 40,
    });
    expect(res).toEqual({ ok: true, message: '코드를 더했습니다.' });
  });

  it('잠긴 묶음(프로그램이 쓰는 값)에는 더하지 않는다 — DB 도 막는다', async () => {
    m.group = { is_locked: true };
    expect(
      await createCode({ groupKey: 'NEWCOMER_STATUS', code: 'LOST', label: '연락 안 됨' })
    ).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'LOCKED_CODE' }),
    });
    expect(m.inserted).not.toHaveBeenCalled();
  });

  it('없는 묶음이면 거절', async () => {
    m.group = null;
    expect(await createCode({ groupKey: 'NOPE', code: 'A', label: '가' })).toMatchObject({
      ok: false,
    });
  });
});

describe('updateCode · moveCode', () => {
  it('이름 · 사용 여부를 열었을 때의 updated_at 으로 고친다', async () => {
    await updateCode({ id: ID, updatedAt: 't1', label: '목사님', isActive: true });
    expect(m.permission).toHaveBeenCalledWith('codes', 'UPDATE');
    expect(m.versioned).toHaveBeenCalledWith(expect.anything(), 'codes', ID, 't1', {
      label: '목사님',
      is_active: true,
    });
  });

  it('순서는 «코드 관리» 수정 권한', async () => {
    m.siblings = [{ id: ID, sort: 10 }];
    expect(await moveCode({ id: ID, dir: 'down' })).toMatchObject({ ok: true });
    expect(m.permission).toHaveBeenCalledWith('codes', 'UPDATE');
  });
});
