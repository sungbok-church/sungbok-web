// 공개 교회앨범 읽기(설계 6.9) — DB 의 «공개 + 휴지통 아님» 앨범을 공개 키로, 서버에서만 읽는다. 최신 등록이 위.
// 서버 캐시('use cache')에 두고 태그(ALBUMS_TAG)를 단다 — 관리자가 저장하면 updateTag 로 바로 바뀐다(주보와 같다 — bulletinLoad.server).
import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다

import { loadForPage } from '@/shared/api/loadForPage.server';
import { failureCacheLife, settle, unwrap } from '@/shared/api/settled.server';
import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { createSupabaseReadClient } from '@/shared/api/supabase/readClient.server';
import { storagePublicUrl } from '@/shared/lib/storageUrl';
import { cacheLife, cacheTag } from 'next/cache';

import { ALBUM_SEED } from '../data/albumSeed';
import type { Album } from './news.types';
import { ALBUMS_TAG } from './newsTags';

type FileRow = {
  bucket: string;
  path: string;
  kind: string;
  width: number | null;
  height: number | null;
  sort: number;
};
type Row = {
  slug: string;
  title: string;
  categories: { label: string } | null;
  file_lists: { files: FileRow[] } | null;
};

/** DB 의 행 → 공개 화면의 앨범(주소 id 는 번호, 그림은 순서대로). 그림이 없는 앨범은 싣지 않는다 */
export const toAlbums = (rows: readonly Row[], baseUrl: string): Album[] =>
  rows.flatMap(r => {
    const images = [...(r.file_lists?.files ?? [])]
      .filter(f => f.kind === 'IMAGE' && f.width && f.height)
      .sort((a, b) => a.sort - b.sort)
      .map(f => ({
        src: storagePublicUrl(baseUrl, f.bucket, f.path),
        width: f.width as number,
        height: f.height as number,
      }));
    return images.length > 0
      ? [
          {
            id: r.slug,
            status: 'published' as const,
            title: r.title,
            category: r.categories?.label ?? '',
            images,
          },
        ]
      : [];
  });

/** 옮긴 앨범의 번호 — 새 앨범은 1000 부터(DB 시퀀스) */
const isMigrated = (a: Album) => Number(a.id) < 1000;

/**
 * 옮기기가 끝나기 전까지 — 옮긴 앨범(번호 1000 미만)이 DB 에 하나라도 있으면 DB 만, 없으면 DB 의 새 앨범 아래에 시드.
 * 운영 옮기기를 확인한 뒤 시드와 함께 없앤다(패키지 B 계획 B3).
 */
export const mergeAlbumsWithSeed = (db: readonly Album[], seed: readonly Album[]): Album[] =>
  db.some(isMigrated) ? [...db] : [...db, ...seed];

const readAlbums = async (): Promise<Album[]> => {
  const env = readSupabaseEnv();
  const client = env ? createSupabaseReadClient() : null;
  if (!env || !client) return [];
  const { data, error } = await client
    .from('albums')
    .select(
      'slug, title, categories(label), file_lists(files(bucket, path, kind, width, height, sort))'
    )
    .eq('status', 'PUBLISHED')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw new Error(`교회앨범을 읽지 못했습니다: ${error.message}`);
  return toAlbums((data ?? []) as Row[], env.url);
};

// stale 300 — 30 이면 빠른 이동용 틀(App Shell)에서 빠진다(주보와 같다)
const cachedAlbums = async () => {
  'use cache';
  cacheTag(ALBUMS_TAG);
  const settled = await settle(readAlbums);
  cacheLife(settled.ok ? { stale: 300, revalidate: 60 } : failureCacheLife(settled));
  return settled;
};

/** 공개 교회앨범 — 최신 등록이 위. DB 를 못 읽으면 운영에서는 직전 페이지를 유지한다 */
export const loadAlbums = async (): Promise<Album[]> =>
  mergeAlbumsWithSeed(
    (await loadForPage(async () => unwrap(await cachedAlbums()))) ?? [],
    ALBUM_SEED
  );
