import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCategory,
  createCode,
  reorderCategories,
  reorderCodes,
  updateCode,
} from './itemActions';

const m = vi.hoisted(() => ({
  permission: vi.fn(async () => ({ user: { id: 'actor' } }) as unknown),
  group: null as null | { is_locked: boolean },
  siblings: [] as { id: string; sort: number }[],
  inserted: vi.fn(),
  versioned: vi.fn(),
  reorder: vi.fn(async () => ({ ok: true, message: '순서를 바꿨습니다.' })),
  updateTag: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), updateTag: m.updateTag }));
vi.mock('../server/adminContext.server', () => ({
  actionPermission: m.permission,
  NO_PERMISSION: { ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } },
}));
vi.mock('../server/versionedUpdate.server', () => ({ updateVersioned: m.versioned }));
vi.mock('../server/sortRows.server', () => ({ applyReorder: m.reorder }));
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

describe('updateCode · reorderCodes', () => {
  it('이름 · 사용 여부를 열었을 때의 updated_at 으로 고친다', async () => {
    await updateCode({ id: ID, updatedAt: 't1', label: '목사님', isActive: true });
    expect(m.permission).toHaveBeenCalledWith('codes', 'UPDATE');
    expect(m.versioned).toHaveBeenCalledWith(expect.anything(), 'codes', ID, 't1', {
      label: '목사님',
      is_active: true,
    });
  });

  it('순서는 «코드 관리» 수정 권한으로, 받은 순서 그대로 한 번에 저장한다', async () => {
    expect(await reorderCodes({ ids: [ID] })).toEqual({ ok: true, message: '순서를 바꿨습니다.' });
    expect(m.permission).toHaveBeenCalledWith('codes', 'UPDATE');
    expect(m.reorder).toHaveBeenCalledWith(expect.anything(), 'codes', [ID]);
  });

  it('권한이 없으면 순서를 저장하지 않는다', async () => {
    m.permission.mockResolvedValueOnce(null);
    expect(await reorderCodes({ ids: [ID] })).toMatchObject({ ok: false });
    expect(m.reorder).not.toHaveBeenCalled();
  });
});

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

describe('reorderCategories', () => {
  it('«분류 관리» 수정 권한으로, 받은 순서 그대로 한 번에 저장한다', async () => {
    const other = '0190a0b0-0000-7000-8000-000000000002';
    expect(await reorderCategories({ ids: [other, ID] })).toEqual({
      ok: true,
      message: '순서를 바꿨습니다.',
    });
    expect(m.permission).toHaveBeenCalledWith('categories', 'UPDATE');
    expect(m.reorder).toHaveBeenCalledWith(expect.anything(), 'categories', [other, ID]);
  });

  it('분류 이름 · 순서는 공개 화면(앨범 · 시트지 · 영상)에도 보이므로 그 캐시를 지운다', async () => {
    await reorderCategories({ ids: ['0190a0b0-0000-7000-8000-000000000002', ID] });
    for (const tag of ['albums', 'resources', 'video-page-announcements', 'video-page-garden'])
      expect(m.updateTag).toHaveBeenCalledWith(tag);
  });

  it('목록이 맞지 않으면 저장하지 않는다', async () => {
    expect(await reorderCategories({ ids: [] })).toMatchObject({ ok: false });
    expect(m.reorder).not.toHaveBeenCalled();
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
