import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { copyFileList, writeFileList } from './fileList.server';

const OLD = '0190a0b0-0000-7000-8000-00000000000b';
const path = (n: number) => `bulletin/${OLD}/0190a0b0-0000-7000-8000-00000000000${n}.webp`;

const m = vi.hoisted(() => ({
  menu: { id: 'menu-1' } as { id: string } | null,
  listInsert: vi.fn(),
  filesInsert: vi.fn(),
  source: [] as Record<string, unknown>[],
  sourceList: { menus: { key: 'bulletin' } } as unknown,
}));

const client = {
  from: (table: string) => {
    if (table === 'menus')
      return {
        select: () => ({
          eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: m.menu }) }) }),
        }),
      };
    if (table === 'file_lists')
      return {
        // 돌려받기(select)를 붙이지 않는다 — 새 묶음은 같은 문장 안에서 읽기 규칙(can_read_list)이 못 본다
        insert: async (row: unknown) => m.listInsert(row),
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: m.sourceList }) }) }),
      };
    return {
      insert: async (rows: unknown) => m.filesInsert(rows),
      select: () => ({ eq: () => ({ order: async () => ({ data: m.source, error: null }) }) }),
    };
  },
} as never;

const item = (n: number) => ({
  path: path(n),
  kind: 'IMAGE' as const,
  width: 1200,
  height: 854,
  bytes: 10,
  originalName: `${n}.webp`,
  alt: null,
});

beforeEach(() => {
  m.menu = { id: 'menu-1' };
  m.listInsert.mockReset().mockResolvedValue({ error: null });
  m.filesInsert.mockReset().mockResolvedValue({ error: null });
  m.source = [];
});

describe('writeFileList', () => {
  it('그 메뉴의 새 묶음을 만들고 파일 줄을 주어진 순서(1, 2, …)로 한 번에 적는다', async () => {
    const res = await writeFileList(client, 'bulletin', [item(2), item(1)]);
    if (!res.ok || !res.data) throw new Error('fail');
    const listId = res.data.listId;
    expect(listId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(m.listInsert).toHaveBeenCalledWith({ id: listId, menu_id: 'menu-1' });
    expect(m.filesInsert).toHaveBeenCalledTimes(1);
    expect(m.filesInsert.mock.calls[0][0]).toEqual([
      {
        list_id: listId,
        sort: 1,
        bucket: 'media',
        path: path(2),
        kind: 'IMAGE',
        width: 1200,
        height: 854,
        bytes: 10,
        original_name: '2.webp',
        alt: null,
      },
      expect.objectContaining({ sort: 2, path: path(1) }),
    ]);
  });

  it('파일이 없으면 빈 묶음만', async () => {
    expect(await writeFileList(client, 'bulletin', [])).toMatchObject({ ok: true });
    expect(m.filesInsert).not.toHaveBeenCalled();
  });

  it('메뉴가 없으면 NOT_FOUND, DB 가 막으면 그 오류(원문은 숨김)', async () => {
    m.menu = null;
    expect(await writeFileList(client, 'bulletin', [])).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    m.menu = { id: 'menu-1' };
    m.filesInsert.mockResolvedValue({ error: { code: '42501', message: 'rls' } });
    expect(await writeFileList(client, 'bulletin', [item(1)])).toMatchObject({
      ok: false,
      error: { code: 'NO_PERMISSION' },
    });
  });
});

describe('copyFileList', () => {
  it('원래 묶음의 줄을 같은 Storage 파일을 가리키는 새 묶음으로 복사한다(복제)', async () => {
    m.source = [
      {
        path: path(1),
        kind: 'IMAGE',
        width: 1200,
        height: 854,
        bytes: 10,
        original_name: '1.webp',
        alt: null,
      },
    ];
    const res = await copyFileList(client, OLD);
    if (!res.ok || !res.data) throw new Error('fail');
    expect(res.data.listId).not.toBe(OLD);
    expect(m.filesInsert.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        list_id: res.data.listId,
        sort: 1,
        path: path(1),
        original_name: '1.webp',
      }),
    ]);
  });
});
