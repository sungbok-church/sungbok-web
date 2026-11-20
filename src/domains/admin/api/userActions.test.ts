import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createUser, resetPassword, setUsersActive, updateUser } from './userActions';

const m = vi.hoisted(() => ({
  // (메뉴, 기능) 으로 불린다 — 기능마다 다르게 답하는 시험이 mockImplementation 으로 바꾼다
  permission: vi.fn<(menu?: string, action?: string) => Promise<unknown>>(async () => ({
    user: { id: 'actor' },
  })),
  admin: null as null | {
    auth: {
      admin: {
        createUser: ReturnType<typeof vi.fn>;
        deleteUser: ReturnType<typeof vi.fn>;
        updateUserById: ReturnType<typeof vi.fn>;
      };
    };
    from: ReturnType<typeof vi.fn>;
  },
  insertGroups: vi.fn(),
  updateProfile: vi.fn(),
  rpc: vi.fn(),
  deleteProfile: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('./adminContext.server', () => ({
  actionPermission: m.permission,
  NO_PERMISSION: { ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } },
}));
vi.mock('@/shared/api/supabase/adminClient.server', () => ({
  createSupabaseAdminClient: () => m.admin,
}));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    rpc: m.rpc,
    from: (table: string) =>
      table === 'user_groups'
        ? { insert: m.insertGroups }
        : {
            update: (patch: unknown) => ({
              // .eq() 를 그대로 기다리거나(.update().eq()) 바뀐 줄을 돌려받는다(.update().eq().select())
              eq: () => {
                const done = Promise.resolve(m.updateProfile(patch));
                return Object.assign(done, { select: () => done });
              },
            }),
          },
  })),
}));
vi.mock('./tempPassword', () => ({ generateTempPassword: () => 'Temp-Pass-123' }));

const G = '0190a0b0-0000-7000-8000-000000000001';
const INPUT = { name: '홍길동', email: 'hong@church.kr', groupIds: [G], department: null };

beforeEach(() => {
  m.admin = {
    auth: {
      admin: {
        createUser: vi.fn(async () => ({ data: { user: { id: 'new-user' } }, error: null })),
        deleteUser: vi.fn(async () => ({ error: null })),
        updateUserById: vi.fn(async () => ({ error: null })),
      },
    },
    from: vi.fn(() => ({ delete: () => ({ eq: m.deleteProfile }) })),
  };
  m.insertGroups.mockResolvedValue({ error: null });
  m.updateProfile.mockResolvedValue({ data: [{ id: 'new-user' }], error: null });
});
afterEach(() => vi.clearAllMocks());

describe('createUser', () => {
  it('만능 키로 계정을 만들고, 그룹은 로그인한 사람의 세션으로 넣고, 임시 비밀번호를 한 번 돌려준다', async () => {
    const res = await createUser(INPUT);
    expect(m.admin?.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'hong@church.kr',
      password: 'Temp-Pass-123',
      email_confirm: true,
      user_metadata: { name: '홍길동' },
    });
    expect(m.insertGroups).toHaveBeenCalledWith([{ user_id: 'new-user', group_id: G }]);
    expect(res).toEqual({
      ok: true,
      data: { id: 'new-user', tempPassword: 'Temp-Pass-123' },
      message: '계정을 만들었습니다.',
    });
  });

  it('그룹을 넣지 못하면(권한) 만든 계정을 지우고 실패를 알린다', async () => {
    m.insertGroups.mockResolvedValue({
      error: { code: '42501', message: '자기가 가진 권한보다 많은 그룹에는 넣을 수 없습니다' },
    });
    const res = await createUser(INPUT);
    expect(m.deleteProfile).toHaveBeenCalledWith('id', 'new-user');
    expect(m.admin?.auth.admin.deleteUser).toHaveBeenCalledWith('new-user');
    expect(res).toEqual({
      ok: false,
      error: {
        code: 'NOT_ALLOWED',
        message: '자기가 가진 권한보다 많은 그룹에는 넣을 수 없습니다',
      },
    });
  });

  it('그룹 · 부서를 고르면 사용자 수정 권한도 있어야 한다 — DB 는 그룹 넣기 · 부서 지정을 수정 권한으로 판정한다', async () => {
    m.permission.mockImplementation(async (_menu?: string, action?: string) =>
      action === 'CREATE' ? { user: { id: 'actor' } } : null
    );
    expect(await createUser(INPUT)).toEqual({
      ok: false,
      error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' },
    });
    expect(m.admin?.auth.admin.createUser).not.toHaveBeenCalled(); // 계정을 만들었다가 되돌리지 않게, 먼저 막는다
    m.permission.mockImplementation(async () => ({ user: { id: 'actor' } }));
  });

  it('그룹 · 부서 없이 만들면 등록 권한만으로 된다', async () => {
    m.permission.mockImplementation(async (_menu?: string, action?: string) =>
      action === 'CREATE' ? { user: { id: 'actor' } } : null
    );
    expect(await createUser({ ...INPUT, groupIds: [] })).toMatchObject({ ok: true });
    m.permission.mockImplementation(async () => ({ user: { id: 'actor' } }));
  });

  it('부서 지정이 0줄로 걸러지면(행 권한) 조용히 넘어가지 않고 계정을 되돌린다', async () => {
    m.updateProfile.mockResolvedValue({ data: [], error: null });
    const res = await createUser({ ...INPUT, department: 'INFANT' });
    expect(m.admin?.auth.admin.deleteUser).toHaveBeenCalledWith('new-user');
    expect(res).toMatchObject({ ok: false, error: { code: 'NO_PERMISSION' } });
  });

  it('이미 있는 이메일', async () => {
    m.admin?.auth.admin.createUser.mockResolvedValue({
      data: { user: null },
      error: { code: 'email_exists', message: 'x' },
    });
    expect(await createUser(INPUT)).toMatchObject({
      ok: false,
      error: { code: 'DUPLICATE', fields: { email: ['이미 있는 이메일입니다.'] } },
    });
  });

  it('만능 키가 없으면 설정 안내', async () => {
    m.admin = null;
    expect(await createUser(INPUT)).toMatchObject({
      ok: false,
      error: { code: 'NOT_CONFIGURED', message: expect.stringContaining('설정') },
    });
  });

  it('입력이 틀리면 칸별 오류', async () => {
    expect(await createUser({ ...INPUT, email: 'x' })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT', fields: { email: expect.any(Array) } },
    });
  });
});

describe('resetPassword', () => {
  it('관리할 수 없는 사용자(«전체 관리» 구성원 등)면 만능 키를 쓰지 않고 거절', async () => {
    m.rpc.mockResolvedValue({ data: false, error: null });
    expect(await resetPassword(G)).toEqual({
      ok: false,
      error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' },
    });
    expect(m.admin?.auth.admin.updateUserById).not.toHaveBeenCalled();
  });

  it('새 임시 비밀번호로 바꾸고 «비밀번호를 바꿔야 함» 을 켠다(로그인한 사람의 세션 — 이력에 남는다)', async () => {
    m.rpc.mockResolvedValue({ data: true, error: null });
    const res = await resetPassword(G);
    expect(m.rpc).toHaveBeenCalledWith('can_manage_user', { p_target: G });
    expect(m.admin?.auth.admin.updateUserById).toHaveBeenCalledWith(G, {
      password: 'Temp-Pass-123',
    });
    expect(m.updateProfile).toHaveBeenCalledWith({ must_change_password: true });
    expect(res).toEqual({
      ok: true,
      data: { tempPassword: 'Temp-Pass-123' },
      message: '비밀번호를 초기화했습니다.',
    });
  });

  it('id 모양이 틀리면 거절', async () => {
    expect(await resetPassword('x')).toMatchObject({ ok: false });
  });
});

describe('권한', () => {
  it('열려 있던 화면에서 권한이 빠졌으면 «권한이 없습니다»(404 를 던지지 않는다)', async () => {
    m.permission.mockResolvedValueOnce(null);
    expect(
      await createUser({ name: '가', email: 'a@b.kr', groupIds: [], department: null })
    ).toEqual({ ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } });
  });
});

describe('setUsersActive', () => {
  it('고른 사용자를 한 명씩 끄고, 막힌 사람(자기 자신 · 전체 관리 등)은 건수로 알린다', async () => {
    m.updateProfile
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { code: '42501', message: '자기 계정은 끌 수 없습니다' } });
    const A = '0190a0b0-0000-7000-8000-00000000000a';
    const B = '0190a0b0-0000-7000-8000-00000000000b';
    expect(await setUsersActive({ ids: [A, B], active: false })).toEqual({
      ok: true,
      message: '1명을 껐습니다. 1명은 바꾸지 못했습니다(자기 계정은 끌 수 없습니다).',
    });
    expect(m.updateProfile).toHaveBeenCalledWith({ is_active: false });
  });

  it('id 모양이 틀리면 거절', async () => {
    expect(await setUsersActive({ ids: ['x'], active: true })).toMatchObject({ ok: false });
  });
});

describe('updateUser — 사용자 정보와 그룹 소속을 한 번에(save_user)', () => {
  const ID = '0190a0b0-0000-7000-8000-0000000000aa';
  const OPENED = '2026-11-20T00:00:00+00:00';
  const SAVED = '2026-11-20T01:00:00+00:00';
  const EDIT = {
    id: ID,
    updatedAt: OPENED,
    name: '홍길동',
    department: null,
    isActive: true,
    groupIds: [G],
    seenGroupIds: [],
  };

  it('화면을 열었을 때의 판과 그룹 목록을 함께 보내고, 새 판을 돌려준다', async () => {
    m.rpc.mockResolvedValue({ data: SAVED, error: null });
    expect(await updateUser(EDIT)).toEqual({
      ok: true,
      data: { updatedAt: SAVED },
      message: '저장했습니다.',
    });
    expect(m.rpc).toHaveBeenCalledWith('save_user', {
      p_id: ID,
      p_updated_at: OPENED,
      p_name: '홍길동',
      p_department: null,
      p_is_active: true,
      p_group_ids: [G],
      p_seen_group_ids: [],
    });
  });

  it('다른 사람이 먼저 고쳤으면(DB 가 null) «다른 사람이 먼저 고쳤습니다»', async () => {
    m.rpc.mockResolvedValue({ data: null, error: null });
    expect(await updateUser(EDIT)).toMatchObject({ ok: false, error: { code: 'CONFLICT' } });
  });

  it('DB 가 거절하면(자기 권한보다 많은 그룹) 그 문구 — 이름도 저장되지 않는다(한 트랜잭션)', async () => {
    m.rpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: '자기가 가진 권한보다 많은 그룹에는 넣을 수 없습니다' },
    });
    expect(await updateUser(EDIT)).toEqual({
      ok: false,
      error: {
        code: 'NOT_ALLOWED',
        message: '자기가 가진 권한보다 많은 그룹에는 넣을 수 없습니다',
      },
    });
  });
});
