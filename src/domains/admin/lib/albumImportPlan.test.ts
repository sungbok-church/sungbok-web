import { describe, expect, it } from 'vitest';

import { planAlbumImport } from './albumImportPlan';

const album = (id: string, category = '교회행사') => ({
  id,
  status: 'published' as const,
  title: `앨범 ${id}`,
  category,
  images: [{ src: `/files/album/${id}-1.webp`, width: 700, height: 998 }],
});
const CATS = { 교회행사: 'c1', 다음세대: 'c2' };

describe('planAlbumImport', () => {
  it('DB 에 없는 번호만, 시드의 뒤(오래된 것)부터 — 등록 순서가 공개 순서(최신이 위)가 되게', () => {
    const plan = planAlbumImport(
      [album('2'), album('4', '다음세대'), album('1')],
      new Set(['4']),
      CATS
    );
    expect(plan.skipped).toEqual(['4']);
    expect(plan.albums.map(a => a.slug)).toEqual(['1', '2']);
    expect(plan.albums[1]).toEqual({
      slug: '2',
      title: '앨범 2',
      categoryId: 'c1',
      images: [
        { file: 'public/files/album/2-1.webp', originalName: '2-1.webp', width: 700, height: 998 },
      ],
    });
  });
  it('분류를 못 찾거나 그림이 없거나 public/files 밖이면 옮기지 않고 알린다', () => {
    const plan = planAlbumImport(
      [
        album('9', '없음'),
        { ...album('8'), images: [] },
        { ...album('7'), images: [{ src: '/../x.webp', width: 1, height: 1 }] },
      ],
      new Set(),
      CATS
    );
    expect(plan.albums).toEqual([]);
    expect(plan.invalid).toEqual(['9', '8', '7']);
  });
});
