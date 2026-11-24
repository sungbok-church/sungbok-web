import { describe, expect, it } from 'vitest';

import type { Album } from './news.types';
import { mergeAlbumsWithSeed, toAlbums } from './albumLoad.server';

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

const album = (id: string, title: string): Album => ({
  id,
  status: 'published',
  title,
  category: '',
  images: [{ src: 's', width: 1, height: 1 }],
});

describe('mergeAlbumsWithSeed — 옮기기 전까지', () => {
  const seed = [album('2', 'seed2'), album('4', 'seed4')];
  it('옮긴 앨범(번호 1000 미만)이 DB 에 없으면 DB 의 새 앨범이 위, 그 아래 시드', () => {
    expect(mergeAlbumsWithSeed([album('1000', 'db')], seed).map(a => a.title)).toEqual([
      'db',
      'seed2',
      'seed4',
    ]);
  });
  it('옮긴 앨범이 하나라도 있으면 DB 만 — 내린 앨범이 시드로 되살아나지 않는다', () => {
    expect(
      mergeAlbumsWithSeed([album('1000', 'db'), album('2', 'db2')], seed).map(a => a.title)
    ).toEqual(['db', 'db2']);
  });
});
