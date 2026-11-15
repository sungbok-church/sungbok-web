import { describe, expect, it } from 'vitest';

import { albumCategories, albumMeta, filterAlbums } from './albumList';
import type { Album } from './news.types';

const album = (id: string, title: string, category: string, images = 1): Album => ({
  id,
  status: 'published',
  title,
  category,
  images: Array.from({ length: images }, (_, i) => ({
    src: `/a/${id}-${i + 1}.webp`,
    width: 700,
    height: 990,
  })),
});
const ALBUMS = [
  album('2', '2026 가을특별부흥집회', '교회행사'),
  album('4', '여름성경학교 · 유치부·영아부', '다음세대'),
  album('5', '중·고등부 연합수련회', '다음세대', 3),
];
const ids = (list: Album[]) => list.map(a => a.id);

describe('albumCategories', () => {
  it('자료에 있는 분류를 나온 순서대로 한 번씩', () => {
    expect(albumCategories(ALBUMS)).toEqual(['교회행사', '다음세대']);
    expect(albumCategories([])).toEqual([]);
  });
});

describe('filterAlbums', () => {
  it('조건이 없으면 전부, 등록된 순서 그대로', () => {
    expect(ids(filterAlbums(ALBUMS, { q: '', category: '' }))).toEqual(['2', '4', '5']);
  });

  it('분류로 거른다', () => {
    expect(ids(filterAlbums(ALBUMS, { q: '', category: '다음세대' }))).toEqual(['4', '5']);
  });

  it('행사 이름으로 찾는다 — 띄어쓰기·가운뎃점·대소문자는 무시', () => {
    expect(ids(filterAlbums(ALBUMS, { q: '부흥 집회', category: '' }))).toEqual(['2']);
    expect(ids(filterAlbums(ALBUMS, { q: '중고등부', category: '' }))).toEqual(['5']);
    expect(ids(filterAlbums(ALBUMS, { q: '수련회', category: '교회행사' }))).toEqual([]);
  });
});

describe('albumMeta', () => {
  it('«분류 · N장의 화보»', () => {
    expect(albumMeta(ALBUMS[0])).toBe('교회행사 · 1장의 화보');
    expect(albumMeta(ALBUMS[2])).toBe('다음세대 · 3장의 화보');
  });
});
