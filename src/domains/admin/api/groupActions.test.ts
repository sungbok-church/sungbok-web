import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGroup, saveGroupPermissions, updateGroup } from './groupActions';

const m = vi.hoisted(() => ({
  // (메뉴, 기능) 으로 불린다 — 기능마다 다르게 답하는 시험이 mockImplementation 으로 바꾼다
  permission: vi.fn<(menu?: string, action?: string) => Promise<unknown>>(async () => ({
    user: { id: 'actor' },
  })),
  insertGroup: vi.fn(),
  current: [] as { action: string; menus: { key: string } }[],
  menus: [] as { id: string; key: string }[],
  insertPerms: vi.fn(),
  deletes: [] as unknown[][],
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('./adminContext.server', () => ({
  actionPermission: m.permission,
  NO_PERMISSION: { ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } },
}));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table === 'groups') {
        return {
          insert: (row: unknown) => ({
            select: () => ({ single: async () => m.insertGroup(row) }),
          }),
        };
      }
      if (table === 'menus') {
        return { select: () => ({ eq: async () => ({ data: m.menus, error: null }) }) };
      }
      // group_permissions
      return {
        select: () => ({ eq: async () => ({ data: m.current, error: null }) }),
        insert: m.insertPerms,
        delete: () => {
          const conds: unknown[] = [];
          const chain = {
            eq: (...a: unknown[]) => {
              conds.push(a);
              if (conds.length === 3) {
                m.deletes.push(conds);
                return Promise.resolve({ error: null });
              }
              return chain;
            },
          };
          return chain;
        },
      };
    },
  })),
}));

const GROUP = '0190a0b0-0000-7000-8000-000000000001';

beforeEach(() => {
  m.insertGroup.mockResolvedValue({ data: { id: GROUP }, error: null });
  m.insertPerms.mockResolvedValue({ error: null });
  m.menus = [
    { id: 'menu-b', key: 'bulletin' },
    { id: 'menu-u', key: 'users' },
  ];
  m.current = [{ action: 'READ', menus: { key: 'users' } }];
  m.deletes = [];
});
afterEach(() => vi.clearAllMocks());

describe('createGroup', () => {
  it('만들고 id 를 돌려준다', async () => {
    expect(await createGroup({ name: '주보 담당', description: '' })).toEqual({
      ok: true,
      data: { id: GROUP },
      message: '그룹을 만들었습니다.',
    });
    expect(m.insertGroup).toHaveBeenCalledWith({ name: '주보 담당', description: null });
  });

  it('같은 이름이면 «이미 있는 값»', async () => {
    m.insertGroup.mockResolvedValue({ data: null, error: { code: '23505', message: 'dup' } });
    expect(await createGroup({ name: '주보 담당', description: null })).toEqual({
      ok: false,
      error: { code: 'DUPLICATE', message: '이미 있는 값입니다.' },
    });
  });
});

describe('saveGroupPermissions', () => {
  it('바뀐 칸만 넣고 뺀다', async () => {
    const res = await saveGroupPermissions({
      groupId: GROUP,
      permissions: [{ menuKey: 'bulletin', action: 'READ' }],
    });
    expect(m.insertPerms).toHaveBeenCalledWith([
      { group_id: GROUP, menu_id: 'menu-b', action: 'READ' },
    ]);
    expect(m.deletes).toEqual([
      [
        ['group_id', GROUP],
        ['menu_id', 'menu-u'],
        ['action', 'READ'],
      ],
    ]);
    expect(res).toEqual({ ok: true, message: '권한을 저장했습니다.' });
  });

  it('없는 메뉴 key 는 거절(아무것도 바꾸지 않는다)', async () => {
    const res = await saveGroupPermissions({
      groupId: GROUP,
      permissions: [{ menuKey: 'nope', action: 'READ' }],
    });
    expect(res).toMatchObject({ ok: false });
    expect(m.insertPerms).not.toHaveBeenCalled();
  });

  it('DB 가 거절하면(자기에게 없는 권한) 그 문구', async () => {
    m.insertPerms.mockResolvedValue({
      error: { code: '42501', message: '자기가 가진 권한만 줄 수 있습니다' },
    });
    expect(
      await saveGroupPermissions({
        groupId: GROUP,
        permissions: [
          { menuKey: 'bulletin', action: 'READ' },
          { menuKey: 'users', action: 'READ' },
        ],
      })
    ).toEqual({
      ok: false,
      error: { code: 'NOT_ALLOWED', message: '자기가 가진 권한만 줄 수 있습니다' },
    });
  });
});

describe('권한', () => {
  it('열려 있던 화면에서 권한이 빠졌으면 «권한이 없습니다»(404 를 던지지 않는다)', async () => {
    m.permission.mockResolvedValueOnce(null);
    expect(await createGroup({ name: '가', description: null })).toEqual({
      ok: false,
      error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' },
    });
  });

  it('그룹 고치기는 수정 또는 삭제 권한이 있어야 한다 — 조회만으로 부르면 «다른 사람이 먼저 고쳤습니다» 가 아니라 «권한이 없습니다»', async () => {
    m.permission.mockImplementation(async (_menu?: string, action?: string) =>
      action === 'READ' ? { user: { id: 'actor' } } : null
    );
    expect(
      await updateGroup({
        id: '0190a0b0-0000-7000-8000-000000000001',
        updatedAt: '2026-11-20T00:00:00+00:00',
        name: '가',
        description: null,
        isActive: true,
      })
    ).toEqual({ ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } });
    m.permission.mockImplementation(async () => ({ user: { id: 'actor' } }));
  });
});
