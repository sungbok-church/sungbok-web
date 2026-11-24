import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadHistory } from './historyActions';

const m = vi.hoisted(() => ({
  permission: vi.fn(async () => ({ user: { id: 'actor' } }) as unknown),
  orFilter: vi.fn(),
  eqFilter: vi.fn(),
  rows: [] as unknown[],
}));

vi.mock('../server/adminContext.server', () => ({
  actionPermission: m.permission,
  NO_PERMISSION: { ok: false, error: '권한이 없습니다.' },
}));
vi.mock('../server/auditRows.server', () => ({
  withActorNames: vi.fn(async (_: unknown, rows: { id: number }[]) =>
    rows.map(r => ({ ...r, actorName: '홍길동' }))
  ),
  referenceNames: vi.fn(async () => ({ g1: '콘텐츠 담당' })),
}));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: () => ({
      select: () => ({
        or: (f: string) => (
          m.orFilter(f),
          { order: () => ({ limit: async () => ({ data: m.rows, error: null }) }) }
        ),
        eq: (c: string, v: string) => (
          m.eqFilter(c, v),
          { order: () => ({ limit: async () => ({ data: m.rows, error: null }) }) }
        ),
      }),
    }),
  })),
}));

const ID = '0190a0b0-0000-7000-8000-000000000001';
afterEach(() => {
  m.rows = [];
  vi.clearAllMocks();
});

describe('loadHistory', () => {
  it('그 메뉴의 «이력조회» 권한으로 확인하고, 그 행과 딸린 행의 이력을 이름과 함께 돌려준다', async () => {
    m.rows = [{ id: 2 }, { id: 1 }];
    const res = await loadHistory({ table: 'groups', rowId: ID });
    expect(m.permission).toHaveBeenCalledWith('groups', 'HISTORY');
    expect(m.orFilter).toHaveBeenCalledWith(
      `and(table_name.eq.groups,row_id.eq.${ID}),and(parent_table.eq.groups,parent_id.eq.${ID})`
    );
    expect(res).toMatchObject({
      ok: true,
      data: {
        items: [{ id: 2, actorName: '홍길동' }, { id: 1 }],
        names: { g1: '콘텐츠 담당' },
        hasMore: false,
      },
    });
  });

  it('사용자 이력은 «사용자» 메뉴의 이력조회 권한', async () => {
    await loadHistory({ table: 'profiles', rowId: ID });
    expect(m.permission).toHaveBeenCalledWith('users', 'HISTORY');
  });

  it('주보 한 호의 이력은 «주보» 메뉴의 이력조회 권한', async () => {
    await loadHistory({ table: 'bulletins', rowId: ID });
    expect(m.permission).toHaveBeenCalledWith('bulletin', 'HISTORY');
  });

  it('권한이 없으면 거절, 정해 둔 표가 아니거나 id 모양이 틀리면 DB 를 부르지 않는다', async () => {
    m.permission.mockResolvedValueOnce(null);
    expect(await loadHistory({ table: 'groups', rowId: ID })).toEqual({
      ok: false,
      error: '권한이 없습니다.',
    });
    expect(await loadHistory({ table: 'newcomers', rowId: ID })).toMatchObject({ ok: false });
    expect(await loadHistory({ table: 'groups', rowId: 'x),or(id.gt.0' })).toMatchObject({
      ok: false,
    });
    expect(m.orFilter).not.toHaveBeenCalled();
  });

  it('메뉴 · 분류 · 코드는 화면 전체의 이력(그 표의 모든 행) — 그 메뉴의 이력조회 권한', async () => {
    await loadHistory({ table: 'menus' });
    expect(m.permission).toHaveBeenCalledWith('menus', 'HISTORY');
    expect(m.eqFilter).toHaveBeenCalledWith('table_name', 'menus');
    await loadHistory({ table: 'codes' });
    expect(m.permission).toHaveBeenCalledWith('codes', 'HISTORY');
    expect(m.eqFilter).toHaveBeenCalledWith('table_name', 'codes');
    await loadHistory({ table: 'categories' });
    expect(m.permission).toHaveBeenCalledWith('categories', 'HISTORY');
    expect(m.eqFilter).toHaveBeenCalledWith('table_name', 'categories');
  });

  it('사용자 · 그룹은 한 건(rowId)이 있어야 한다', async () => {
    expect(await loadHistory({ table: 'groups' })).toMatchObject({ ok: false });
    expect(m.eqFilter).not.toHaveBeenCalled();
    expect(m.orFilter).not.toHaveBeenCalled();
  });
});
