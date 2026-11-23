import { notFound } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  actionFullAdmin,
  loadMyGroups,
  loadSystemGroupIds,
  requireFullAdmin,
} from './myGroups.server';

const db = vi.hoisted(() => ({
  result: { data: [] as unknown, error: null as unknown },
  calls: [] as unknown[][],
  ctx: { user: { id: 'me' } } as unknown,
}));

vi.mock('react', async importOriginal => ({
  ...(await importOriginal<typeof import('react')>()),
  cache: <T>(fn: T) => fn, // 테스트에서는 부를 때마다 다시 읽는다
}));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
}));
vi.mock('./adminContext.server', () => ({
  requirePermission: vi.fn(async () => db.ctx),
  actionPermission: vi.fn(async () => db.ctx),
}));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: async (...args: unknown[]) => {
          db.calls.push([table, columns, ...args]);
          return db.result;
        },
      }),
    }),
  })),
}));

afterEach(() => {
  db.result = { data: [], error: null };
  db.calls = [];
  db.ctx = { user: { id: 'me' } };
  vi.clearAllMocks();
});

describe('loadMyGroups — 내 그룹 소속(«전체 관리» 인가 · 내 그룹 id)', () => {
  it('내 user_groups 행을 한 번 읽어 «전체 관리» 여부와 내 그룹(시스템 그룹 빼고)을 돌려준다', async () => {
    db.result = {
      data: [
        { group_id: 'g1', groups: { is_system: false, is_active: true } },
        { group_id: 'g2', groups: { is_system: false, is_active: false } },
      ],
      error: null,
    };
    expect(await loadMyGroups('me')).toEqual({ fullAdmin: false, groupIds: ['g1', 'g2'] });
    expect(db.calls).toEqual([
      ['user_groups', 'group_id, groups(is_system, is_active)', 'user_id', 'me'],
    ]);
  });

  it('켜진 시스템 그룹 구성원이면 «전체 관리»', async () => {
    db.result = {
      data: [
        { group_id: 'sys', groups: { is_system: true, is_active: true } },
        { group_id: 'g1', groups: { is_system: false, is_active: true } },
      ],
      error: null,
    };
    expect(await loadMyGroups('me')).toEqual({ fullAdmin: true, groupIds: ['g1'] });
  });

  it('그룹 행을 읽지 못해도(groups null) 내 그룹으로 센다 — «전체 관리» 는 아니다', async () => {
    db.result = { data: [{ group_id: 'g1', groups: null }], error: null };
    expect(await loadMyGroups('me')).toEqual({ fullAdmin: false, groupIds: ['g1'] });
  });

  it('읽지 못하면 그룹 없음 · «전체 관리» 아님(막는 것은 DB)', async () => {
    db.result = { data: null, error: { message: 'x' } };
    expect(await loadMyGroups('me')).toEqual({ fullAdmin: false, groupIds: [] });
  });
});

describe('loadSystemGroupIds — «전체 관리» 그룹 id(화면에서 그 소속을 바꾸지 않게 서버가 먼저 본다)', () => {
  it('시스템 그룹의 id 를 읽는다', async () => {
    db.result = { data: [{ id: 'sys' }], error: null };
    expect(await loadSystemGroupIds()).toEqual(['sys']);
    expect(db.calls).toEqual([['groups', 'id', 'is_system', true]]);
  });

  it('읽지 못하면 빈 목록(막는 것은 DB 의 guard_user_groups)', async () => {
    db.result = { data: null, error: { message: 'x' } };
    expect(await loadSystemGroupIds()).toEqual([]);
  });
});

describe('requireFullAdmin — «전체 관리» 만 여는 화면', () => {
  it('«전체 관리» 면 맥락을 돌려준다', async () => {
    db.result = {
      data: [{ group_id: 'sys', groups: { is_system: true, is_active: true } }],
      error: null,
    };
    expect(await requireFullAdmin('groups', 'UPDATE')).toBe(db.ctx);
  });

  it('아니면 없는 화면(404)', async () => {
    await expect(requireFullAdmin('groups', 'UPDATE')).rejects.toThrow('NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });
});

describe('actionFullAdmin — «전체 관리» 만 하는 Server Action', () => {
  it('«전체 관리» 면 맥락, 아니면 null', async () => {
    db.result = {
      data: [{ group_id: 'sys', groups: { is_system: true, is_active: true } }],
      error: null,
    };
    expect(await actionFullAdmin('groups', 'UPDATE')).toBe(db.ctx);
    db.result = {
      data: [{ group_id: 'g1', groups: { is_system: false, is_active: true } }],
      error: null,
    };
    expect(await actionFullAdmin('groups', 'UPDATE')).toBeNull();
  });

  it('권한이 없으면(맥락 null) 읽지 않고 null', async () => {
    db.ctx = null;
    expect(await actionFullAdmin('groups', 'UPDATE')).toBeNull();
    expect(db.calls).toEqual([]);
  });
});
