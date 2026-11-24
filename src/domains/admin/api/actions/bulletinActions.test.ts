import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createBulletin,
  duplicateBulletin,
  purgeBulletin,
  restoreBulletin,
  trashBulletin,
  updateBulletin,
} from './bulletinActions';

const LIST = '0190a0b0-0000-7000-8000-00000000000a';
const ID = '0190a0b0-0000-7000-8000-0000000000b1';
const NEW_LIST = '0190a0b0-0000-7000-8000-0000000000c1';

const m = vi.hoisted(() => ({
  allowed: new Set<string>(),
  write: vi.fn(),
  copy: vi.fn(),
  versioned: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  source: null as null | { date: string; pages_list_id: string },
  taken: [] as string[],
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('next/cache', () => ({ updateTag: m.updateTag, revalidatePath: m.revalidatePath }));
vi.mock('../server/adminContext.server', () => ({
  actionPermission: vi.fn(async (menu: string, action: string) =>
    m.allowed.has(`${menu}:${action}`) ? { user: { id: 'u' } } : null
  ),
  NO_PERMISSION: { ok: false, error: { code: 'NO_PERMISSION', message: '권한이 없습니다.' } },
}));
vi.mock('../server/fileList.server', () => ({ writeFileList: m.write, copyFileList: m.copy }));
vi.mock('../server/versionedUpdate.server', () => ({ updateVersioned: m.versioned }));

// bulletins 표의 쓰기 · 읽기를 흉내 낸다 — 걸어 준 조건은 calls 에 남긴다
const chain = (result: () => unknown, calls: unknown[][]) => {
  const c: Record<string, unknown> = {};
  for (const k of ['eq', 'is', 'not', 'in', 'gte', 'order'])
    c[k] = (...a: unknown[]) => (calls.push([k, ...a]), c);
  c.select = () => c;
  c.maybeSingle = async () => result();
  c.then = (res: (v: unknown) => unknown) => Promise.resolve(result()).then(res);
  return c;
};
let calls: unknown[][] = [];
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: () => ({
      insert: async (row: unknown) => m.insert(row),
      update: (patch: unknown) => chain(() => m.update(patch), calls),
      delete: () => chain(() => m.del(), calls),
      select: (cols: string) =>
        chain(
          () =>
            cols.includes('pages_list_id')
              ? { data: m.source, error: null }
              : { data: m.taken.map(date => ({ date })), error: null },
          calls
        ),
    }),
  })),
}));

const page = {
  path: `bulletin/${LIST}/0190a0b0-0000-7000-8000-000000000002.webp`,
  kind: 'IMAGE',
  width: 1200,
  height: 854,
  bytes: 1,
  originalName: '1.webp',
};
const input = { date: '2026-11-29', pages: [page], status: 'PUBLISHED' };

beforeEach(() => {
  calls = [];
  m.allowed = new Set(['bulletin:CREATE', 'bulletin:UPDATE', 'bulletin:DELETE', 'bulletin:PURGE']);
  m.write.mockResolvedValue({ ok: true, data: { listId: NEW_LIST } });
  m.copy.mockResolvedValue({ ok: true, data: { listId: NEW_LIST } });
  m.versioned.mockResolvedValue({ ok: true, data: { updatedAt: 't2' }, message: '저장했습니다.' });
  m.insert.mockResolvedValue({ error: null });
  m.update.mockReturnValue({ data: [{ id: ID }], error: null });
  m.del.mockReturnValue({ data: [{ id: ID }], error: null });
  m.source = { date: '2026-11-22', pages_list_id: LIST };
  m.taken = [];
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-24T03:00:00Z')); // 서울 화요일
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('createBulletin', () => {
  it('쪽을 새 묶음에 적고 그 묶음을 가리키는 주보를 넣는다 — 공개 화면 태그를 갱신', async () => {
    const res = await createBulletin(input);
    expect(m.write).toHaveBeenCalledWith(expect.anything(), 'bulletin', [
      { ...page, alt: null, variants: null },
    ]);
    const row = m.insert.mock.calls[0][0];
    expect(row).toMatchObject({ date: '2026-11-29', pages_list_id: NEW_LIST, status: 'PUBLISHED' });
    expect(res).toEqual({ ok: true, data: { id: row.id }, message: '공개했습니다.' });
    expect(m.updateTag).toHaveBeenCalledWith('bulletins');
  });

  it('임시저장이면 문장이 다르다', async () => {
    expect(await createBulletin({ ...input, status: 'DRAFT' })).toMatchObject({
      message: '임시저장했습니다.',
    });
  });

  it('같은 날짜가 있으면 그 뜻으로 알린다', async () => {
    m.insert.mockResolvedValue({ error: { code: '23505', message: 'dup' } });
    expect(await createBulletin(input)).toMatchObject({
      ok: false,
      error: { code: 'DUPLICATE', message: '그 날짜의 주보가 이미 있습니다.' },
    });
  });

  it('권한 · 입력이 틀리면 묶음을 만들지 않는다', async () => {
    m.allowed = new Set();
    expect(await createBulletin(input)).toMatchObject({ error: { code: 'NO_PERMISSION' } });
    m.allowed = new Set(['bulletin:CREATE']);
    expect(await createBulletin({ ...input, pages: [] })).toMatchObject({
      error: { code: 'INVALID_INPUT' },
    });
    expect(m.write).not.toHaveBeenCalled();
  });
});

describe('updateBulletin', () => {
  it('새 묶음에 적은 뒤, 열었을 때의 수정 시각으로 바꿔 끼운다(동시 수정 막기)', async () => {
    const res = await updateBulletin({ ...input, id: ID, updatedAt: 't1' });
    expect(m.versioned).toHaveBeenCalledWith(expect.anything(), 'bulletins', ID, 't1', {
      date: '2026-11-29',
      pages_list_id: NEW_LIST,
      status: 'PUBLISHED',
    });
    expect(res).toMatchObject({ ok: true, data: { updatedAt: 't2' } });
    expect(m.updateTag).toHaveBeenCalledWith('bulletins');
  });
  it('«수정» 권한이 없으면 거절', async () => {
    m.allowed = new Set(['bulletin:CREATE']);
    expect(await updateBulletin({ ...input, id: ID, updatedAt: 't1' })).toMatchObject({
      error: { code: 'NO_PERMISSION' },
    });
  });
});

describe('휴지통 · 복구 · 완전 삭제', () => {
  it('휴지통은 «삭제» 권한으로, 휴지통에 없는 것만', async () => {
    expect(await trashBulletin({ id: ID })).toMatchObject({ ok: true });
    expect(m.update.mock.calls[0][0]).toEqual({ deleted_at: '2026-11-24T03:00:00.000Z' });
    expect(calls).toContainEqual(['is', 'deleted_at', null]);
    m.allowed = new Set(['bulletin:UPDATE']);
    expect(await trashBulletin({ id: ID })).toMatchObject({ error: { code: 'NO_PERMISSION' } });
  });
  it('복구할 때 같은 날짜가 이미 있으면 그 뜻으로', async () => {
    expect(await restoreBulletin({ id: ID })).toMatchObject({ ok: true });
    expect(m.update.mock.calls[0][0]).toEqual({ deleted_at: null });
    m.update.mockReturnValue({ data: null, error: { code: '23505', message: 'dup' } });
    expect(await restoreBulletin({ id: ID })).toMatchObject({
      error: { message: '그 날짜의 주보가 이미 있어 복구할 수 없습니다.' },
    });
  });
  it('완전 삭제는 «완전 삭제» 권한으로, 휴지통에 든 것만 — 없으면 NOT_FOUND', async () => {
    expect(await purgeBulletin({ id: ID })).toMatchObject({ ok: true });
    expect(calls).toContainEqual(['not', 'deleted_at', 'is', null]);
    m.del.mockReturnValue({ data: [], error: null });
    expect(await purgeBulletin({ id: ID })).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });
});

describe('duplicateBulletin', () => {
  it('쪽 묶음을 복사해 이번 주일 날짜의 임시저장으로 만든다', async () => {
    const res = await duplicateBulletin({ id: ID });
    expect(m.copy).toHaveBeenCalledWith(expect.anything(), LIST);
    expect(m.insert.mock.calls[0][0]).toMatchObject({
      date: '2026-11-29',
      pages_list_id: NEW_LIST,
      status: 'DRAFT',
    });
    expect(res).toMatchObject({ ok: true, data: { id: m.insert.mock.calls[0][0].id } });
  });
  it('그 날짜가 차 있으면 다음 주일로', async () => {
    m.taken = ['2026-11-29', '2026-12-06'];
    await duplicateBulletin({ id: ID });
    expect(m.insert.mock.calls[0][0]).toMatchObject({ date: '2026-12-13' });
  });
  it('평일 호(성탄절)를 복제하면 그다음 주일로 — 평일이 이어지지 않는다', async () => {
    m.source = { date: '2026-12-25', pages_list_id: LIST };
    await duplicateBulletin({ id: ID });
    expect(m.insert.mock.calls[0][0]).toMatchObject({ date: '2026-12-27' });
  });

  it('원본이 이번 주일보다 뒤면 원본 다음 주일로', async () => {
    m.source = { date: '2026-12-20', pages_list_id: LIST };
    await duplicateBulletin({ id: ID });
    expect(m.insert.mock.calls[0][0]).toMatchObject({ date: '2026-12-27' });
  });
});
