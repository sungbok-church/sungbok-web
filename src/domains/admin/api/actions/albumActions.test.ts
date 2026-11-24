import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createAlbum,
  duplicateAlbum,
  purgeAlbum,
  restoreAlbum,
  trashAlbum,
  updateAlbum,
} from './albumActions';

const LIST = '0190a0b0-0000-7000-8000-00000000000a';
const ID = '0190a0b0-0000-7000-8000-0000000000b1';
const CAT = '0190a0b0-0000-7000-8000-0000000000c1';
const NEW_LIST = '0190a0b0-0000-7000-8000-0000000000d1';

const m = vi.hoisted(() => ({
  allowed: new Set<string>(),
  write: vi.fn(),
  copy: vi.fn(),
  versioned: vi.fn(),
  insert: vi.fn(),
  setTrashed: vi.fn(),
  purgeRow: vi.fn(),
  source: null as null | Record<string, unknown>,
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
vi.mock('../server/contentState.server', () => ({
  setTrashed: m.setTrashed,
  purgeRow: m.purgeRow,
}));
vi.mock('@/shared/api/supabase/serverClient.server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    from: () => ({
      insert: async (row: unknown) => m.insert(row),
      select: () => {
        const c = { eq: () => c, maybeSingle: async () => ({ data: m.source, error: null }) };
        return c;
      },
    }),
  })),
}));

const image = {
  path: `album/${LIST}/0190a0b0-0000-7000-8000-000000000002.webp`,
  kind: 'IMAGE',
  width: 700,
  height: 998,
  bytes: 1,
  originalName: '1.webp',
};
const input = { title: '여름성경학교', categoryId: CAT, images: [image], status: 'PUBLISHED' };

beforeEach(() => {
  m.allowed = new Set(['CREATE', 'UPDATE', 'DELETE', 'PURGE'].map(a => `album:${a}`));
  m.write.mockResolvedValue({ ok: true, data: { listId: NEW_LIST } });
  m.copy.mockResolvedValue({ ok: true, data: { listId: NEW_LIST } });
  m.versioned.mockResolvedValue({ ok: true, data: { updatedAt: 't2' }, message: '저장했습니다.' });
  m.insert.mockResolvedValue({ error: null });
  m.setTrashed.mockResolvedValue({ ok: true, message: '휴지통으로 보냈습니다.' });
  m.purgeRow.mockResolvedValue({ ok: true, message: '완전히 지웠습니다.' });
  m.source = { title: '여름성경학교', category_id: CAT, images_list_id: LIST };
});
afterEach(() => vi.clearAllMocks());

describe('createAlbum', () => {
  it('그림을 새 묶음에 적고 그 묶음을 가리키는 앨범을 넣는다(주소 번호는 DB 가) — 공개 태그 갱신', async () => {
    const res = await createAlbum(input);
    expect(m.write).toHaveBeenCalledWith(expect.anything(), 'album', [{ ...image, alt: null }]);
    const row = m.insert.mock.calls[0][0];
    expect(row).toEqual({
      id: expect.any(String),
      title: '여름성경학교',
      category_id: CAT,
      images_list_id: NEW_LIST,
      status: 'PUBLISHED',
    });
    expect(res).toEqual({ ok: true, data: { id: row.id }, message: '공개했습니다.' });
    expect(m.updateTag).toHaveBeenCalledWith('albums');
    expect(m.revalidatePath).toHaveBeenCalledWith('/admin/album', 'layout');
  });
  it('권한 · 입력이 틀리면 묶음을 만들지 않는다', async () => {
    m.allowed = new Set();
    expect(await createAlbum(input)).toMatchObject({ error: { code: 'NO_PERMISSION' } });
    m.allowed = new Set(['album:CREATE']);
    expect(await createAlbum({ ...input, images: [] })).toMatchObject({
      error: { code: 'INVALID_INPUT' },
    });
    expect(m.write).not.toHaveBeenCalled();
  });
});

describe('updateAlbum', () => {
  it('새 묶음에 적은 뒤 열었을 때의 수정 시각으로 바꿔 끼운다', async () => {
    const res = await updateAlbum({ ...input, id: ID, updatedAt: 't1', status: 'DRAFT' });
    expect(m.versioned).toHaveBeenCalledWith(expect.anything(), 'albums', ID, 't1', {
      title: '여름성경학교',
      category_id: CAT,
      images_list_id: NEW_LIST,
      status: 'DRAFT',
    });
    expect(res).toMatchObject({ ok: true, message: '임시저장했습니다.' });
    expect(m.updateTag).toHaveBeenCalledWith('albums');
  });
});

describe('휴지통 · 복구 · 완전 삭제', () => {
  it('«교회앨범» 의 삭제 · 완전 삭제 권한으로', async () => {
    await trashAlbum({ id: ID });
    expect(m.setTrashed).toHaveBeenCalledWith(
      expect.anything(),
      'albums',
      ID,
      true,
      {},
      expect.any(String)
    );
    await restoreAlbum({ id: ID });
    expect(m.setTrashed).toHaveBeenLastCalledWith(
      expect.anything(),
      'albums',
      ID,
      false,
      {},
      '같은 주소 번호의 앨범이 있어 복구할 수 없습니다.'
    );
    await purgeAlbum({ id: ID });
    expect(m.purgeRow).toHaveBeenCalledWith(expect.anything(), 'albums', ID, {});
    m.allowed = new Set();
    expect(await trashAlbum({ id: ID })).toMatchObject({ error: { code: 'NO_PERMISSION' } });
  });
});

describe('duplicateAlbum', () => {
  it('제목 · 분류 · 그림(같은 파일을 가리키는 새 묶음)을 복사한 임시저장', async () => {
    const res = await duplicateAlbum({ id: ID });
    expect(m.copy).toHaveBeenCalledWith(expect.anything(), LIST);
    const row = m.insert.mock.calls[0][0];
    expect(row).toMatchObject({
      title: '여름성경학교',
      category_id: CAT,
      images_list_id: NEW_LIST,
      status: 'DRAFT',
    });
    expect(res).toMatchObject({ ok: true, data: { id: row.id } });
  });
});
