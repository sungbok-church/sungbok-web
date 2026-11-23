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
  // 로그인한 사람의 그룹 소속(loadMyGroups) — 시험마다 다시 정한다
  myGroups: vi.fn(),
  // «전체 관리» 그룹 id(loadSystemGroupIds)
  systemGroups: vi.fn(),
}));

const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock('next/cache', () => cache);
vi.mock('../server/adminContext.server', () => ({
  actionPermission: m.permission,
  NO_PERMISSION: { ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } },
}));
vi.mock('../server/myGroups.server', () => ({
  loadMyGroups: m.myGroups,
  loadSystemGroupIds: m.systemGroups,
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
vi.mock('../../lib/tempPassword', () => ({ generateTempPassword: () => 'Temp-Pass-123' }));

const G = '0190a0b0-0000-7000-8000-000000000001';
const OTHER = '0190a0b0-0000-7000-8000-000000000002'; // 로그인한 사람이 속하지 않은 그룹
const SYS = '0190a0b0-0000-7000-8000-0000000000f0'; // «전체 관리» 그룹
const OWN_GROUPS_ONLY = '내가 속한 그룹에만 넣고 뺄 수 있습니다.';
const SYSTEM_LOCKED = '«전체 관리» 소속은 화면에서 바꿀 수 없습니다.';
const SYSTEM_LOCKED_ERROR = {
  ok: false,
  error: { code: 'NOT_ALLOWED', message: SYSTEM_LOCKED, fields: { groupIds: [SYSTEM_LOCKED] } },
};
const INPUT = { name: '홍길동', email: 'hong@church.kr', groupIds: [G], department: null };

beforeEach(() => {
  // 기능마다 다르게 답하게 바꾼 시험이 실패해도 다음 시험으로 새지 않게 매번 되돌린다
  m.permission.mockImplementation(async () => ({ user: { id: 'actor' } }));
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
  // 부서 범위 없음(«전체 관리» 이거나 담당 부서가 없음) — 시험마다 다시 정한다
  m.rpc.mockResolvedValue({ data: null, error: null });
  // «전체 관리» 아님 · 내 그룹은 G
  m.myGroups.mockResolvedValue({ fullAdmin: false, groupIds: [G] });
  m.systemGroups.mockResolvedValue([SYS]);
});
afterEach(() => vi.clearAllMocks());

describe('createUser', () => {
  const CREATE_ONLY = async (_menu?: string, action?: string) =>
    action === 'CREATE' ? { user: { id: 'actor' } } : null;

  it('만능 키로 계정을 만들고, 그룹은 로그인한 사람의 세션으로 넣고, 임시 비밀번호를 한 번 돌려준다', async () => {
    const res = await createUser(INPUT);
    expect(m.admin?.auth.admin.createUser).toHaveBeenCalledWith({
      email: 'hong@church.kr',
      password: 'Temp-Pass-123',
      email_confirm: true,
      user_metadata: { name: '홍길동', department: null },
    });
    expect(m.insertGroups).toHaveBeenCalledWith([{ user_id: 'new-user', group_id: G }]);
    expect(res).toEqual({
      ok: true,
      data: { id: 'new-user', tempPassword: 'Temp-Pass-123' },
      message: '계정을 만들었습니다.',
    });
  });

  it('부서는 계정을 만들 때 함께 정한다(user_metadata — DB 가 사용자 정보를 만들며 넣는다) — 세션으로 따로 고치지 않는다', async () => {
    expect(await createUser({ ...INPUT, department: 'INFANT' })).toMatchObject({ ok: true });
    expect(m.admin?.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ user_metadata: { name: '홍길동', department: 'INFANT' } })
    );
    expect(m.updateProfile).not.toHaveBeenCalled();
  });

  it('그룹을 넣지 못하면(권한) 만든 계정을 지우고 실패를 알린다', async () => {
    m.insertGroups.mockResolvedValue({
      error: { code: '42501', message: '내가 속한 그룹에만 넣고 뺄 수 있습니다' },
    });
    const res = await createUser(INPUT);
    expect(m.deleteProfile).toHaveBeenCalledWith('id', 'new-user');
    expect(m.admin?.auth.admin.deleteUser).toHaveBeenCalledWith('new-user');
    expect(res).toEqual({
      ok: false,
      error: { code: 'NOT_ALLOWED', message: '내가 속한 그룹에만 넣고 뺄 수 있습니다' },
    });
  });

  it('내가 속하지 않은 그룹을 고르면 계정을 만들기 전에 막는다(«전체 관리» 그룹도)', async () => {
    m.myGroups.mockResolvedValue({ fullAdmin: false, groupIds: [] });
    expect(await createUser(INPUT)).toEqual({
      ok: false,
      error: {
        code: 'NOT_ALLOWED',
        message: OWN_GROUPS_ONLY,
        fields: { groupIds: [OWN_GROUPS_ONLY] },
      },
    });
    expect(m.myGroups).toHaveBeenCalledWith('actor');
    expect(m.admin?.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('«전체 관리» 는 어느 그룹에든 넣는다', async () => {
    m.myGroups.mockResolvedValue({ fullAdmin: true, groupIds: [] });
    expect(await createUser({ ...INPUT, groupIds: [G, OTHER] })).toMatchObject({ ok: true });
  });

  it('«전체 관리» 그룹에는 아무도 — «전체 관리» 도 — 넣지 못한다(계정을 만들기 전에)', async () => {
    m.myGroups.mockResolvedValue({ fullAdmin: true, groupIds: [] });
    expect(await createUser({ ...INPUT, groupIds: [G, SYS] })).toEqual(SYSTEM_LOCKED_ERROR);
    expect(m.admin?.auth.admin.createUser).not.toHaveBeenCalled();
    expect(m.insertGroups).not.toHaveBeenCalled();
  });

  it('그룹을 고르면 사용자 수정 권한도 있어야 한다 — DB 는 그룹 넣기를 수정 권한으로 판정한다', async () => {
    m.permission.mockImplementation(CREATE_ONLY);
    expect(await createUser(INPUT)).toEqual({
      ok: false,
      error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' },
    });
    expect(m.admin?.auth.admin.createUser).not.toHaveBeenCalled(); // 계정을 만들었다가 되돌리지 않게, 먼저 막는다
  });

  it('그룹 없이 만들면 부서를 골라도 등록 권한만으로 된다(부서는 만들 때 정해진다)', async () => {
    m.permission.mockImplementation(CREATE_ONLY);
    expect(await createUser({ ...INPUT, groupIds: [] })).toMatchObject({ ok: true });
    expect(await createUser({ ...INPUT, groupIds: [], department: 'HIGH' })).toMatchObject({
      ok: true,
    });
    expect(m.insertGroups).not.toHaveBeenCalled();
  });

  describe('부서 범위가 있는 사람(«전체 관리» 아님 · 담당 부서 영아부)', () => {
    beforeEach(() => {
      m.rpc.mockResolvedValue({ data: 'INFANT', error: null });
    });

    it('내 부서로 만든다 — 부서는 만들 때 정해져서 그룹을 바로 넣는다', async () => {
      expect(await createUser({ ...INPUT, department: 'INFANT' })).toMatchObject({ ok: true });
      expect(m.rpc).toHaveBeenCalledWith('my_department_limit');
      expect(m.admin?.auth.admin.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ user_metadata: { name: '홍길동', department: 'INFANT' } })
      );
      expect(m.updateProfile).not.toHaveBeenCalled();
      expect(m.insertGroups).toHaveBeenCalledWith([{ user_id: 'new-user', group_id: G }]);
    });

    it('사용자 수정 권한이 없어도 그룹 없이 내 부서로는 만든다', async () => {
      m.permission.mockImplementation(CREATE_ONLY);
      expect(await createUser({ ...INPUT, groupIds: [], department: 'INFANT' })).toMatchObject({
        ok: true,
      });
    });

    it('사용자 수정 권한 없이 그룹을 고르면 계정을 만들기 전에 막는다', async () => {
      m.permission.mockImplementation(CREATE_ONLY);
      expect(await createUser({ ...INPUT, department: 'INFANT' })).toEqual({
        ok: false,
        error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' },
      });
      expect(m.admin?.auth.admin.createUser).not.toHaveBeenCalled();
    });

    it.each([
      ['모든 부서', null],
      ['다른 부서', 'MIDDLE'],
    ])('%s로는 만들지 않는다 — 계정을 만들기 전에 막는다', async (_label, department) => {
      for (const groupIds of [[G], []]) {
        expect(await createUser({ ...INPUT, groupIds, department })).toEqual({
          ok: false,
          error: {
            code: 'NOT_ALLOWED',
            message: '부서는 내 담당 부서로만 정할 수 있습니다.',
            fields: { department: ['부서는 내 담당 부서로만 정할 수 있습니다.'] },
          },
        });
      }
      expect(m.admin?.auth.admin.createUser).not.toHaveBeenCalled();
    });
  });

  it('부서 범위를 읽지 못하면 계정을 만들지 않는다', async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'x' } });
    expect(await createUser(INPUT)).toMatchObject({ ok: false, error: { code: 'INTERNAL' } });
    expect(m.admin?.auth.admin.createUser).not.toHaveBeenCalled();
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
  const A = '0190a0b0-0000-7000-8000-00000000000a';
  const B = '0190a0b0-0000-7000-8000-00000000000b';
  // DB 의 guard_profiles 가 관리할 수 없는 사람(can_manage_user 거짓)의 줄을 막을 때 내는 오류
  const NOT_MINE = {
    code: '42501',
    message: '내가 속하지 않은 그룹의 사용자는 «전체 관리» 만 바꿉니다',
  };

  it('고른 사용자를 한 명씩 끄고, 막힌 사람(전체 관리 남기기 등)은 건수로 알린다', async () => {
    m.updateProfile.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({
      error: { code: '23514', message: '«전체 관리» 에 활성 구성원이 한 명은 있어야 합니다' },
    });
    expect(await setUsersActive({ ids: [A, B], active: false })).toEqual({
      ok: true,
      message:
        '1명을 껐습니다. 1명은 바꾸지 못했습니다(«전체 관리» 에 활성 구성원이 한 명은 있어야 합니다).',
    });
    expect(m.updateProfile).toHaveBeenCalledWith({ is_active: false });
  });

  it('미리 확인하지 않고 DB 에 맡긴다 — 다른 사람의 줄이 막히면(42501) «내가 관리할 수 없는 사용자» 로 건너뛴다', async () => {
    m.updateProfile.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: NOT_MINE });
    expect(await setUsersActive({ ids: [A, B], active: true })).toEqual({
      ok: true,
      message:
        '1명을 켰습니다. 1명은 바꾸지 못했습니다(내가 관리할 수 없는 사용자는 바꾸지 않았습니다).',
    });
    expect(m.rpc).not.toHaveBeenCalled();
    expect(m.updateProfile).toHaveBeenCalledTimes(2);
  });

  it('모두 관리할 수 없으면 실패', async () => {
    m.updateProfile.mockResolvedValue({ error: NOT_MINE });
    expect(await setUsersActive({ ids: [A, B], active: false })).toEqual({
      ok: false,
      error: { code: 'NOT_ALLOWED', message: '내가 관리할 수 없는 사용자는 바꾸지 않았습니다' },
    });
  });

  it('그 밖의 오류는 그대로 알린다', async () => {
    m.updateProfile.mockResolvedValue({ error: { code: 'XX000', message: 'x' } });
    expect(await setUsersActive({ ids: [A], active: false })).toMatchObject({
      ok: false,
      error: { code: 'INTERNAL' },
    });
  });

  it('자기 자신은 DB 의 문장을 그대로 알린다 — «자기 계정은 끌 수 없습니다»', async () => {
    const ME = '0190a0b0-0000-7000-8000-0000000000ee';
    m.permission.mockImplementation(async () => ({ user: { id: ME } }));
    m.updateProfile.mockResolvedValue({
      error: { code: '42501', message: '자기 계정은 끌 수 없습니다' },
    });
    expect(await setUsersActive({ ids: [ME], active: false })).toEqual({
      ok: false,
      error: { code: 'NOT_ALLOWED', message: '자기 계정은 끌 수 없습니다' },
    });
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it('id 모양이 틀리면 거절', async () => {
    expect(await setUsersActive({ ids: ['x'], active: true })).toMatchObject({ ok: false });
  });

  it('목록과 각 사람의 상세를 다시 그린다 — 상세의 [끄기] · [켜기] 도 router.refresh 없이 바뀐다', async () => {
    m.updateProfile.mockResolvedValue({ error: null });
    await setUsersActive({ ids: [A], active: false });
    expect(cache.revalidatePath).toHaveBeenCalledWith('/admin/users');
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/admin/users/${A}`);
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

  it('DB 가 거절하면 그 문구 — 이름도 저장되지 않는다(한 트랜잭션)', async () => {
    m.rpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: '내 담당 부서의 사용자만 바꿀 수 있습니다' },
    });
    expect(await updateUser(EDIT)).toEqual({
      ok: false,
      error: { code: 'NOT_ALLOWED', message: '내 담당 부서의 사용자만 바꿀 수 있습니다' },
    });
  });

  it('대상이 이미 속한 남의 그룹은 그대로 두면 괜찮다', async () => {
    m.rpc.mockResolvedValue({ data: SAVED, error: null });
    expect(
      await updateUser({ ...EDIT, groupIds: [OTHER, G], seenGroupIds: [OTHER] })
    ).toMatchObject({ ok: true });
  });

  it('내가 속하지 않은 그룹을 넣거나 빼면 저장하지 않는다(DB 를 부르기 전에)', async () => {
    for (const change of [
      { groupIds: [G, OTHER], seenGroupIds: [] },
      { groupIds: [G], seenGroupIds: [OTHER] },
    ]) {
      expect(await updateUser({ ...EDIT, ...change })).toEqual({
        ok: false,
        error: {
          code: 'NOT_ALLOWED',
          message: OWN_GROUPS_ONLY,
          fields: { groupIds: [OWN_GROUPS_ONLY] },
        },
      });
    }
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it('«전체 관리» 소속은 넣지도 빼지도 못한다 — «전체 관리» 여도(DB 를 부르기 전에)', async () => {
    m.myGroups.mockResolvedValue({ fullAdmin: true, groupIds: [] });
    for (const change of [
      { groupIds: [G, SYS], seenGroupIds: [G] },
      { groupIds: [G], seenGroupIds: [G, SYS] },
    ]) {
      expect(await updateUser({ ...EDIT, ...change })).toEqual(SYSTEM_LOCKED_ERROR);
    }
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it('이미 «전체 관리» 인 사람의 소속은 그대로 두면 저장한다', async () => {
    m.myGroups.mockResolvedValue({ fullAdmin: true, groupIds: [] });
    m.rpc.mockResolvedValue({ data: SAVED, error: null });
    expect(await updateUser({ ...EDIT, groupIds: [SYS, G], seenGroupIds: [SYS] })).toMatchObject({
      ok: true,
    });
  });
});
