import { describe, expect, it } from 'vitest';

import { toAlbums } from './albumLoad.server';

const BASE = 'https://x.supabase.co';
const file = (sort: number) => ({
  bucket: 'media',
  path: `album/l/${sort}.webp`,
  kind: 'IMAGE',
  width: 700,
  height: 998,
  sort,
});

describe('toAlbums', () => {
  it('DB 의 앨범을 공개 화면 모양으로 — 주소 id 는 번호, 그림은 순서대로 Storage 주소, 그림 없는 것은 뺀다', () => {
    expect(
      toAlbums(
        [
          {
            slug: '1000',
            title: '새 앨범',
            categories: { label: '교회행사' },
            file_lists: { files: [file(2), file(1)] },
          },
          { slug: '1001', title: '빈 앨범', categories: null, file_lists: { files: [] } },
        ],
        BASE
      )
    ).toEqual([
      {
        id: '1000',
        status: 'published',
        title: '새 앨범',
        category: '교회행사',
        images: [
          { src: `${BASE}/storage/v1/object/public/media/album/l/1.webp`, width: 700, height: 998 },
          { src: `${BASE}/storage/v1/object/public/media/album/l/2.webp`, width: 700, height: 998 },
        ],
      },
    ]);
  });
});
