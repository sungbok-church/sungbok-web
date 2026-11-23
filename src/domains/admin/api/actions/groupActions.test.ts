import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGroup, saveGroup, updateGroup } from './groupActions';

const m = vi.hoisted(() => ({
  // «전체 관리» 인가 — (메뉴, 기능) 으로 불린다. 아니면 null
  fullAdmin: vi.fn<(menu?: string, action?: string) => Promise<unknown>>(async () => ({
    user: { id: 'actor' },
  })),
  rpc: vi.fn(),
  menus: [] as { key: string }[],
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../server/adminContext.server', () => ({
  NO_PERMISSION: { ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } },
}));
vi.mock('../server/myGroups.server', () => ({ actionFullAdmin: m.fullAdmin }));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    rpc: m.rpc,
    from: () => ({ select: () => ({ eq: async () => ({ data: m.menus, error: null }) }) }),
  })),
}));

const GROUP = '0190a0b0-0000-7000-8000-000000000001';
const OPENED = '2026-11-20T00:00:00+00:00';
const SAVED = '2026-11-20T01:00:00+00:00';
const BASE = { id: GROUP, updatedAt: OPENED, name: '주보 담당', description: null, isActive: true };

beforeEach(() => {
  m.fullAdmin.mockImplementation(async () => ({ user: { id: 'actor' } }));
  m.menus = [{ key: 'bulletin' }, { key: 'users' }];
  m.rpc.mockResolvedValue({ data: GROUP, error: null });
});
afterEach(() => vi.clearAllMocks());

describe('createGroup — 그룹과 처음 권한을 한 번에(create_group)', () => {
  it('만들고 id 를 돌려준다 — 권한은 «메뉴:기능» 목록으로', async () => {
    expect(
      await createGroup({
        name: '주보 담당',
        description: '',
        permissions: [{ menuKey: 'bulletin', action: 'READ' }],
      })
    ).toEqual({ ok: true, data: { id: GROUP }, message: '그룹을 만들었습니다.' });
    expect(m.rpc).toHaveBeenCalledWith('create_group', {
      p_name: '주보 담당',
      p_description: null,
      p_permissions: ['bulletin:READ'],
    });
  });

  it('같은 이름이면 «이미 있는 값»', async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: '23505', message: 'dup' } });
    expect(await createGroup({ name: '주보 담당', description: null })).toEqual({
      ok: false,
      error: { code: 'DUPLICATE', message: '이미 있는 값입니다.' },
    });
  });

  it('«전체 관리» 인지 그룹 등록 권한으로 확인한다', async () => {
    await createGroup({ name: '가', description: null });
    expect(m.fullAdmin).toHaveBeenCalledWith('groups', 'CREATE');
  });

  it('없는 메뉴 key 는 거절(아무것도 만들지 않는다)', async () => {
    expect(
      await createGroup({
        name: '가',
        description: null,
        permissions: [{ menuKey: 'nope', action: 'READ' }],
      })
    ).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    expect(m.rpc).not.toHaveBeenCalled();
  });
});

describe('saveGroup — 이름 · 설명 · 사용 여부와 권한 표를 한 번에(save_group)', () => {
  it('화면을 열었을 때의 판(updatedAt)과 권한 표를 함께 보내고, 새 판을 돌려준다', async () => {
    m.rpc.mockResolvedValue({ data: SAVED, error: null });
    expect(
      await saveGroup({
        ...BASE,
        permissions: [{ menuKey: 'bulletin', action: 'READ' }],
        seenPermissions: [{ menuKey: 'users', action: 'READ' }],
      })
    ).toEqual({ ok: true, data: { updatedAt: SAVED }, message: '저장했습니다.' });
    expect(m.rpc).toHaveBeenCalledWith('save_group', {
      p_id: GROUP,
      p_updated_at: OPENED,
      p_name: '주보 담당',
      p_description: null,
      p_is_active: true,
      p_permissions: ['bulletin:READ'],
      p_seen_permissions: ['users:READ'],
    });
  });

  it('권한 표가 없으면(«전체 관리») 권한은 그대로 두라고 null 을 보낸다', async () => {
    m.rpc.mockResolvedValue({ data: SAVED, error: null });
    await saveGroup(BASE);
    expect(m.rpc).toHaveBeenCalledWith(
      'save_group',
      expect.objectContaining({ p_permissions: null, p_seen_permissions: null })
    );
  });

  it('다른 사람이 먼저 고쳤으면(DB 가 null) «다른 사람이 먼저 고쳤습니다»', async () => {
    m.rpc.mockResolvedValue({ data: null, error: null });
    expect(await saveGroup(BASE)).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
  });

  it('DB 가 거절하면 그 문구 — 이름도 저장되지 않는다(한 트랜잭션)', async () => {
    m.rpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: '그룹 권한은 «전체 관리» 만 바꿉니다' },
    });
    expect(
      await saveGroup({
        ...BASE,
        permissions: [{ menuKey: 'users', action: 'READ' }],
        seenPermissions: [],
      })
    ).toEqual({
      ok: false,
      error: { code: 'NOT_ALLOWED', message: '그룹 권한은 «전체 관리» 만 바꿉니다' },
    });
  });
});

describe('권한 — 그룹 만들기 · 고치기는 «전체 관리» 만', () => {
  const UPDATE = {
    id: GROUP,
    updatedAt: OPENED,
    name: '가',
    description: null,
    isActive: false,
  };

  it('«전체 관리» 가 아니면(그룹 권한이 있어도) «권한이 없습니다» — DB 를 부르지 않는다', async () => {
    m.fullAdmin.mockResolvedValue(null);
    const denied = { ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } };
    expect(await createGroup({ name: '가', description: null })).toEqual(denied);
    expect(await saveGroup(BASE)).toEqual(denied);
    expect(await updateGroup(UPDATE)).toEqual(denied);
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it('고치기 · 끄기는 그룹 수정 권한으로 확인한다', async () => {
    m.rpc.mockResolvedValue({ data: SAVED, error: null });
    await saveGroup(BASE);
    expect(m.fullAdmin).toHaveBeenLastCalledWith('groups', 'UPDATE');
  });
});
