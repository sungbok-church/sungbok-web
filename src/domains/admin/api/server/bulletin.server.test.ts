import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { loadBulletin } from './bulletin.server';

const ID = '0190a0b0-0000-7000-8000-0000000000b1';
const file = (sort: number) => ({
  path: `bulletin/l/${sort}.webp`,
  kind: 'IMAGE',
  width: 1200,
  height: 854,
  bytes: 9,
  original_name: `${sort}.webp`,
  alt: null,
  sort,
});

const clientWith = (data: unknown) => {
  const eq = vi.fn(() => ({ maybeSingle: async () => ({ data, error: null }) }));
  return { client: { from: () => ({ select: () => ({ eq }) }) } as never, eq };
};

describe('loadBulletin', () => {
  it('주보 한 호와 쪽(순서대로, 화면의 파일 모양으로)', async () => {
    const { client, eq } = clientWith({
      id: ID,
      date: '2026-11-29',
      status: 'PUBLISHED',
      deleted_at: null,
      created_at: 'c',
      created_by: 'u1',
      updated_at: 'u',
      updated_by: null,
      file_lists: { files: [file(2), file(1)] },
    });
    const b = await loadBulletin(client, ID);
    expect(eq).toHaveBeenCalledWith('id', ID);
    expect(b).toMatchObject({ id: ID, date: '2026-11-29', status: 'PUBLISHED', trashed: false });
    expect(b?.pages.map(p => p.originalName)).toEqual(['1.webp', '2.webp']);
    expect(b?.pages[0]).toEqual({
      path: 'bulletin/l/1.webp',
      kind: 'IMAGE',
      width: 1200,
      height: 854,
      bytes: 9,
      originalName: '1.webp',
      alt: null,
    });
  });

  it('없으면 null', async () => {
    expect(await loadBulletin(clientWith(null).client, ID)).toBeNull();
  });
});
