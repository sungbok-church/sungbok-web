// 교회앨범 목록 계산(순수) — 분류 칩·검색·표시 문구. 앨범 화면(AlbumPage)이 쓴다.
import type { Album } from './news.types';

export type AlbumQuery = {
  q: string;
  /** 고른 분류. '' 이면 전체 */
  category: string;
};

/** 분류 칩 — 자료에 있는 분류를 나온 순서대로(«전체» 는 화면이 앞에 붙인다). */
export const albumCategories = (albums: readonly Album[]): string[] => [
  ...new Set(albums.map(a => a.category)),
];

// 띄어쓰기·가운뎃점·대소문자는 무시한다 — «중고등부» 로 «중·고등부» 를 찾는다
const squash = (v: string) => v.toLowerCase().replace(/[\s·.]/g, '');

/** 분류와 행사 이름으로 거른다. 순서는 받은 그대로(등록된 순서). */
export const filterAlbums = (albums: readonly Album[], query: AlbumQuery): Album[] => {
  const key = squash(query.q);
  return albums.filter(
    a =>
      (!query.category || a.category === query.category) && (!key || squash(a.title).includes(key))
  );
};

/** «교회행사 · 1장의 화보» */
export const albumMeta = (album: Album): string =>
  `${album.category} · ${album.images.length}장의 화보`;
