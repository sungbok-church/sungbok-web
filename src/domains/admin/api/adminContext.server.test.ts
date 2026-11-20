import { notFound, redirect } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  actionPermission,
  loadAdminContext,
  NO_PERMISSION,
  requirePermission,
} from './adminContext.server';

const db = vi.hoisted(() => ({
  profile: { name: '홍길동', must_change_password: false, is_active: true } as unknown,
  permissions: [] as { menu_key: string; action: string }[],
  menus: [] as unknown[],
  failed: false,
}));

vi.mock('react', async importOriginal => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T>(fn: T) => fn, // 테스트에서는 요청마다 다시 읽는다
}));
vi.mock('./session.server', () => ({
  requireAdminUser: vi.fn(async () => ({ id: 'u1', email: 'a@b.kr' })),
}));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
  redirect: vi.fn(() => {
    throw new Error('REDIRECT');
  }),
}));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    rpc: vi.fn(async () =>
      db.failed ? { data: null, error: { message: 'x' } } : { data: db.permissions, error: null }
    ),
    from: (table: string) => {
      const result =
        table === 'profiles'
          ? { data: db.profile, error: null }
          : { data: db.menus, error: db.failed ? { message: 'x' } : null };
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        maybeSingle: async () => result,
        then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
      };
      return chain;
    },
  })),
}));

afterEach(() => {
  db.permissions = [];
  db.menus = [];
  db.failed = false;
  db.profile = { name: '홍길동', must_change_password: false, is_active: true };
  vi.clearAllMocks();
});

const MENUS = [
  {
    id: 'm0',
    key: 'dashboard',
    parent_id: null,
    label: null,
    default_label: '첫 화면',
    path: '/admin',
    sort: 0,
    is_active: true,
  },
  {
    id: 'g',
    key: 'system',
    parent_id: null,
    label: null,
    default_label: '시스템',
    path: null,
    sort: 40,
    is_active: true,
  },
  {
    id: 'u',
    key: 'users',
    parent_id: 'g',
    label: null,
    default_label: '사용자',
    path: '/admin/users',
    sort: 10,
    is_active: true,
  },
];

describe('loadAdminContext', () => {
  it('사용자 · 권한 · 메뉴를 한 번에 읽어 화면 모양으로 돌려준다', async () => {
    db.permissions = [{ menu_key: 'users', action: 'READ' }];
    db.menus = MENUS;
    const ctx = await loadAdminContext();
    expect(ctx.user.id).toBe('u1');
    expect(ctx.profile).toEqual({ name: '홍길동', mustChangePassword: false });
    expect(ctx.permissions).toEqual([{ menuKey: 'users', action: 'READ' }]);
    expect(ctx.nav.map(g => g.key)).toEqual(['dashboard', 'system']);
  });

  it.each([
    ['사용자 정보가 없는 계정', null],
    ['꺼진 계정', { name: '홍길동', must_change_password: false, is_active: false }],
  ])('%s은 로그아웃시킨다', async (_, profile) => {
    db.profile = profile;
    await expect(loadAdminContext()).rejects.toThrow('REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/admin/logout?reason=inactive');
  });

  it('DB 를 읽지 못하면 권한 없음 + 첫 화면만(오류 화면을 내지 않는다)', async () => {
    db.failed = true;
    const ctx = await loadAdminContext();
    expect(ctx.permissions).toEqual([]);
    expect(ctx.nav).toEqual([]);
  });
});

describe('requirePermission', () => {
  it('권한이 있으면 맥락을 돌려준다', async () => {
    db.permissions = [{ menu_key: 'users', action: 'READ' }];
    await expect(requirePermission('users', 'READ')).resolves.toMatchObject({ user: { id: 'u1' } });
  });

  it('권한이 없으면 없는 페이지(404) — 메뉴가 있는지조차 드러내지 않는다', async () => {
    await expect(requirePermission('users', 'READ')).rejects.toThrow('NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('비밀번호를 바꿔야 하는 계정은 비밀번호 변경 화면으로', async () => {
    db.permissions = [{ menu_key: 'users', action: 'READ' }];
    db.profile = { name: '홍길동', must_change_password: true, is_active: true };
    await expect(requirePermission('users', 'READ')).rejects.toThrow('REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/admin/password');
  });
});

describe('actionPermission', () => {
  it('Server Action 용 — 권한이 있으면 맥락, 없으면 null(404 를 던지지 않는다 — 화면에 토스트로 알린다)', async () => {
    db.permissions = [{ menu_key: 'users', action: 'READ' }];
    expect(await actionPermission('users', 'READ')).toMatchObject({ user: { id: 'u1' } });
    expect(await actionPermission('users', 'UPDATE')).toBeNull();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('비밀번호를 바꿔야 하는 계정은 권한이 없는 것으로', async () => {
    db.permissions = [{ menu_key: 'users', action: 'READ' }];
    db.profile = { name: '홍길동', must_change_password: true, is_active: true };
    expect(await actionPermission('users', 'READ')).toBeNull();
  });

  it('거절 결과 문구', () => {
    expect(NO_PERMISSION).toEqual({ ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } });
  });
});
