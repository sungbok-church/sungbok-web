import { afterEach, describe, expect, it, vi } from 'vitest';

import { reorderMenus, updateMenu } from './menuActions';

const m = vi.hoisted(() => ({
  permission: vi.fn(async () => ({ user: { id: 'actor' } }) as unknown),
  versioned: vi.fn(async () => ({ ok: true, data: { updatedAt: 't2' }, message: '저장했습니다.' })),
  reorder: vi.fn(async () => ({ ok: true, message: '순서를 바꿨습니다.' })),
  // 고칠 메뉴 줄 · 다른 홈페이지 대메뉴
  row: { area: 'ADMIN', parent_id: null, default_label: '주보' } as Record<string, unknown> | null,
  tops: [] as Record<string, unknown>[],
}));

const cache = vi.hoisted(() => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock('next/cache', () => cache);
vi.mock('../server/adminContext.server', () => ({
  actionPermission: m.permission,
  NO_PERMISSION: { ok: false, error: '권한이 없습니다.' },
}));
vi.mock('../server/versionedUpdate.server', () => ({ updateVersioned: m.versioned }));
vi.mock('../server/sortRows.server', () => ({ applyReorder: m.reorder }));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: () => ({
      select: () => {
        const c = {
          eq: () => c,
          is: () => c,
          neq: async () => ({ data: m.tops, error: null }),
          maybeSingle: async () => ({ data: m.row, error: null }),
        };
        return c;
      },
    }),
  })),
}));

const ID = '0190a0b0-0000-7000-8000-000000000001';
const ID2 = '0190a0b0-0000-7000-8000-000000000002';
afterEach(() => {
  vi.clearAllMocks();
  m.row = { area: 'ADMIN', parent_id: null, default_label: '주보' };
  m.tops = [];
});

describe('updateMenu', () => {
  it('이름(비우면 기본 이름) · 사용 여부만 고친다', async () => {
    await updateMenu({ id: ID, updatedAt: 't', label: '', isActive: false });
    expect(m.versioned).toHaveBeenCalledWith(expect.anything(), 'menus', ID, 't', {
      label: null,
      is_active: false,
    });
    // 홈페이지 메뉴도 같은 표 — 공개 메뉴 캐시도 갱신한다
    expect(cache.revalidatePath).toHaveBeenCalledWith('/admin', 'layout');
    expect(cache.updateTag).toHaveBeenCalledWith('site-menus');
  });

  it('DB 가 거절하면(켜기 · 끄기는 «전체 관리» 만) 그 까닭을 그대로 돌려주고 다시 그리지 않는다', async () => {
    const rejected = {
      ok: false,
      error: { code: 'NOT_ALLOWED', detail: '메뉴 켜기 · 끄기는 «전체 관리» 만 합니다' },
    };
    m.versioned.mockResolvedValueOnce(rejected as never);
    expect(await updateMenu({ id: ID, updatedAt: 't', label: '', isActive: false })).toEqual(
      rejected
    );
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });
});

describe('updateMenu — 홈페이지 메뉴 이름 한도', () => {
  const tops = ['예배', '다음세대', '교회소식', '자료실'].map(d => ({
    label: null,
    default_label: d,
    is_active: true,
  }));

  it('켜진 대메뉴 이름을 모두 합쳐 28자가 넘으면 저장하지 않는다', async () => {
    m.row = { area: 'SITE', parent_id: null, default_label: '교회소개' };
    m.tops = [
      ...tops,
      { label: '오시는 길 안내', default_label: '찾아오시는 길', is_active: true },
    ];
    const res = await updateMenu({
      id: ID,
      updatedAt: 't',
      label: '우리교회소개하기',
      isActive: true,
    });
    expect(res).toMatchObject({
      ok: false,
      error: { message: '켜진 대메뉴 이름을 모두 합쳐 28자까지입니다(지금 29자).' },
    });
    expect(m.versioned).not.toHaveBeenCalled();
  });

  it('한도 안이면 저장한다', async () => {
    m.row = { area: 'SITE', parent_id: null, default_label: '교회소개' };
    m.tops = [...tops, { label: null, default_label: '찾아오시는 길', is_active: true }];
    await updateMenu({ id: ID, updatedAt: 't', label: '우리교회소개하기', isActive: true });
    expect(m.versioned).toHaveBeenCalled();
  });

  it('관리자 메뉴는 전처럼 50자까지(합계를 보지 않는다)', async () => {
    await updateMenu({ id: ID, updatedAt: 't', label: '가'.repeat(30), isActive: true });
    expect(m.versioned).toHaveBeenCalled();
  });
});

describe('reorderMenus', () => {
  it('«메뉴 관리» 수정 권한으로, 받은 순서 그대로 한 번에 저장한다(무리 검사는 DB 함수가 한다)', async () => {
    expect(await reorderMenus({ ids: [ID2, ID] })).toEqual({
      ok: true,
      message: '순서를 바꿨습니다.',
    });
    expect(m.permission).toHaveBeenCalledWith('menus', 'UPDATE');
    expect(m.reorder).toHaveBeenCalledWith(expect.anything(), 'menus', [ID2, ID]);
  });

  it('목록이 맞지 않으면(빈 목록 · 겹친 id) 저장하지 않는다', async () => {
    expect(await reorderMenus({ ids: [ID, ID] })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT' },
    });
    expect(m.reorder).not.toHaveBeenCalled();
  });

  it('권한이 없으면 저장하지 않는다', async () => {
    m.permission.mockResolvedValueOnce(null);
    expect(await reorderMenus({ ids: [ID] })).toEqual({ ok: false, error: '권한이 없습니다.' });
    expect(m.reorder).not.toHaveBeenCalled();
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

describe('메뉴를 고친 뒤 다시 그리기', () => {
  it('관리자 전체를 다시 그린다 — 왼쪽 메뉴가 모든 화면에 있고, «뒤로» 돌아간 화면에도 옛 이름이 남지 않게', async () => {
    await updateMenu({ id: ID, updatedAt: 't1', label: '분류', isActive: true });
    await reorderMenus({ ids: [ID2, ID] });
    expect(cache.revalidatePath).toHaveBeenCalledTimes(2);
    expect(cache.revalidatePath).toHaveBeenCalledWith('/admin', 'layout');
  });

  it('실패하면 다시 그리지 않는다', async () => {
    m.reorder.mockResolvedValueOnce({ ok: false, message: '실패' } as never);
    await reorderMenus({ ids: [ID2, ID] });
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });
});
