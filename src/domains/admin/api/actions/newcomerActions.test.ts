import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { purgeNewcomer, updateNewcomer } from './newcomerActions';

const ID = '0190a0b0-0000-7000-8000-0000000000b1';

const m = vi.hoisted(() => ({
  allowed: new Set<string>(),
  versioned: vi.fn(),
  current: { status: 'NEW' } as { status: string } | null,
  deleted: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: m.revalidatePath }));
vi.mock('../server/adminContext.server', () => ({
  actionPermission: vi.fn(async (menu: string, action: string) =>
    m.allowed.has(`${menu}:${action}`) ? { user: { id: 'me' } } : null
  ),
  NO_PERMISSION: { ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } },
}));
vi.mock('../server/versionedUpdate.server', () => ({ updateVersioned: m.versioned }));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: m.current, error: null }) }),
      }),
      delete: () => ({
        eq: () => ({ select: async () => (m.deleted(), { data: [{ id: ID }], error: null }) }),
      }),
    }),
  })),
}));

beforeEach(() => {
  m.allowed = new Set(['newcomers:UPDATE', 'newcomers:PURGE']);
  m.current = { status: 'NEW' };
  m.versioned.mockResolvedValue({ ok: true, data: { updatedAt: 't2' }, message: '저장했습니다.' });
});
afterEach(() => vi.clearAllMocks());

describe('updateNewcomer', () => {
  it('상태가 바뀌면 처리한 사람 · 시각을 남긴다', async () => {
    const res = await updateNewcomer({
      id: ID,
      updatedAt: 't1',
      status: 'CONTACTED',
      note: ' 통화함 ',
    });
    expect(m.versioned).toHaveBeenCalledWith(expect.anything(), 'newcomers', ID, 't1', {
      status: 'CONTACTED',
      note: '통화함',
      handled_by: 'me',
      handled_at: expect.any(String),
    });
    expect(res).toMatchObject({ ok: true });
  });
  it('메모만 고치면 처리한 사람은 그대로, «접수» 로 되돌리면 비운다', async () => {
    m.current = { status: 'CONTACTED' };
    await updateNewcomer({ id: ID, updatedAt: 't1', status: 'CONTACTED', note: '' });
    expect(m.versioned.mock.calls[0][4]).toEqual({ status: 'CONTACTED', note: null });
    await updateNewcomer({ id: ID, updatedAt: 't1', status: 'NEW', note: '' });
    expect(m.versioned.mock.calls[1][4]).toEqual({
      status: 'NEW',
      note: null,
      handled_by: null,
      handled_at: null,
    });
  });
  it('수정 권한이 없으면 거절', async () => {
    m.allowed = new Set();
    expect(
      await updateNewcomer({ id: ID, updatedAt: 't1', status: 'DONE', note: '' })
    ).toMatchObject({
      error: { code: 'NO_PERMISSION' },
    });
  });
});

describe('purgeNewcomer', () => {
  it('«완전 삭제» 권한으로 바로 지운다(휴지통 없음 — 개인정보)', async () => {
    expect(await purgeNewcomer({ id: ID })).toMatchObject({ ok: true });
    expect(m.deleted).toHaveBeenCalled();
    m.allowed = new Set(['newcomers:UPDATE']);
    expect(await purgeNewcomer({ id: ID })).toMatchObject({ error: { code: 'NO_PERMISSION' } });
  });
});
