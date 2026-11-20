import { afterEach, describe, expect, it, vi } from 'vitest';

import { moveMenu, updateMenu } from './menuActions';

const m = vi.hoisted(() => ({
  permission: vi.fn(async () => ({ user: { id: 'actor' } }) as unknown),
  versioned: vi.fn(async () => ({ ok: true, data: { updatedAt: 't2' }, message: '저장했습니다.' })),
  move: vi.fn(async () => ({ ok: true, message: '순서를 바꿨습니다.' })),
  eqs: [] as unknown[][],
  target: { area: 'ADMIN', parent_id: 'p1' } as unknown,
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('./adminContext.server', () => ({
  actionPermission: m.permission,
  NO_PERMISSION: { ok: false, error: '권한이 없습니다.' },
}));
vi.mock('./versionedUpdate.server', () => ({ updateVersioned: m.versioned }));
vi.mock('./sortRows.server', () => ({ applyMove: m.move }));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: () => ({
      select: () => {
        const chain = {
          eq: (...a: unknown[]) => (m.eqs.push(a), chain),
          is: (...a: unknown[]) => (m.eqs.push(['is', ...a]), chain),
          order: () => chain,
          maybeSingle: async () => ({ data: m.target, error: null }),
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve({ data: [{ id: 'x', sort: 10 }], error: null }).then(resolve),
        };
        return chain;
      },
    }),
  })),
}));

const ID = '0190a0b0-0000-7000-8000-000000000001';
afterEach(() => {
  m.eqs = [];
  vi.clearAllMocks();
});

describe('updateMenu', () => {
  it('이름(비우면 기본 이름) · 사용 여부만 고친다', async () => {
    await updateMenu({ id: ID, updatedAt: 't', label: '', isActive: false });
    expect(m.versioned).toHaveBeenCalledWith(expect.anything(), 'menus', ID, 't', {
      label: null,
      is_active: false,
    });
  });
});

describe('moveMenu', () => {
  it('같은 영역 · 같은 상위 메뉴 안에서만 옮긴다', async () => {
    await moveMenu({ id: ID, dir: 'down' });
    expect(m.eqs).toContainEqual(['area', 'ADMIN']);
    expect(m.eqs).toContainEqual(['parent_id', 'p1']);
    expect(m.move).toHaveBeenCalledWith(
      expect.anything(),
      'menus',
      [{ id: 'x', sort: 10 }],
      ID,
      'down'
    );
  });

  it('맨 위 메뉴(상위 없음)는 상위가 없는 메뉴끼리', async () => {
    m.target = { area: 'ADMIN', parent_id: null };
    await moveMenu({ id: ID, dir: 'up' });
    expect(m.eqs).toContainEqual(['is', 'parent_id', null]);
  });
});

describe('권한', () => {
  it('열려 있던 화면에서 권한이 빠졌으면 «권한이 없습니다»(404 를 던지지 않는다)', async () => {
    m.permission.mockResolvedValueOnce(null);
    expect(
      await updateMenu({
        id: '0190a0b0-0000-7000-8000-000000000001',
        updatedAt: 't',
        label: '',
        isActive: true,
      })
    ).toEqual({ ok: false, error: '권한이 없습니다.' });
  });
});
