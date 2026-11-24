import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { loadAlbum } from './album.server';

const ID = '0190a0b0-0000-7000-8000-0000000000b1';
const file = (sort: number) => ({
  path: `album/l/${sort}.webp`,
  kind: 'IMAGE',
  width: 700,
  height: 998,
  bytes: 9,
  original_name: `${sort}.webp`,
  alt: null,
  sort,
});
const clientWith = (data: unknown) => {
  const c = { eq: () => c, maybeSingle: async () => ({ data, error: null }) };
  return { from: () => ({ select: () => c }) } as never;
};

describe('loadAlbum', () => {
  it('한 건 — 주소 번호 · 분류 이름 · 그림(순서대로)', async () => {
    const a = await loadAlbum(
      clientWith({
        id: ID,
        slug: '1000',
        title: '여름성경학교',
        category_id: 'c1',
        categories: { label: '다음세대' },
        status: 'DRAFT',
        deleted_at: null,
        created_at: 'c',
        created_by: null,
        updated_at: 'u',
        updated_by: 'u1',
        file_lists: { files: [file(2), file(1)] },
      }),
      ID
    );
    expect(a).toMatchObject({
      id: ID,
      slug: '1000',
      title: '여름성경학교',
      categoryId: 'c1',
      categoryLabel: '다음세대',
      status: 'DRAFT',
      trashed: false,
    });
    expect(a?.images.map(i => i.originalName)).toEqual(['1.webp', '2.webp']);
  });
  it('없으면 null', async () => {
    expect(await loadAlbum(clientWith(null), ID)).toBeNull();
  });
});
