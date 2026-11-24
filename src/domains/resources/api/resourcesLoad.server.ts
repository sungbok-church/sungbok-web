// 공개 설교 시트지 읽기(설계 6.9) — DB 의 «공개 + 휴지통 아님» 자료를 공개 키로, 서버에서만 읽는다(원본 · 쪽 그림 · 영상 연결까지).
// 서버 캐시('use cache')에 두고 태그(RESOURCES_TAG)를 단다 — 관리자가 저장하면 updateTag 로 바로 바뀐다. 자료실 목록 · 문서 ·
// 예배 영상의 «설교 시트지» 카드가 같이 쓴다. 실패는 값으로 담고, 운영에서 다시 그리다 실패하면 직전 페이지를 유지한다.
import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다

import { loadForPage } from '@/shared/api/loadForPage.server';
import { failureCacheLife, settle, unwrap } from '@/shared/api/settled.server';
import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { createSupabaseReadClient } from '@/shared/api/supabase/readClient.server';
import { storagePublicUrl } from '@/shared/lib/storageUrl';
import { cacheLife, cacheTag } from 'next/cache';

import type { Resource } from './resource.types';
import { RESOURCES_TAG } from './resourceTags';

type FileRow = {
  bucket: string;
  path: string;
  kind: string;
  sort: number;
  original_name?: string;
  width?: number | null;
  height?: number | null;
};
type Row = {
  slug: string;
  section: 'SUNDAY' | 'SERIES' | 'SEASONAL';
  title: string;
  episode: number | null;
  date: string | null;
  year: number | null;
  passage: string | null;
  categories: { label: string } | null;
  file: { files: FileRow[] } | null;
  pages: { files: FileRow[] } | null;
  resource_videos: { video_id: string }[];
};

const SECTIONS = { SUNDAY: 'sunday', SERIES: 'series', SEASONAL: 'seasonal' } as const;

/** DB 의 행 → 공개 자료(주소 id 는 번호, 쪽은 순서대로) */
export const toResources = (rows: readonly Row[], baseUrl: string): Resource[] =>
  rows.map(r => {
    const original = [...(r.file?.files ?? [])].sort((a, b) => a.sort - b.sort)[0];
    return {
      id: r.slug,
      status: 'published' as const,
      section: SECTIONS[r.section],
      group: r.categories?.label ?? '',
      ...(r.episode ? { episode: r.episode } : {}),
      title: r.title,
      ...(r.date ? { date: r.date } : r.year ? { year: String(r.year) } : {}),
      ...(r.passage ? { passage: r.passage } : {}),
      ...(original && original.kind !== 'IMAGE'
        ? {
            file: {
              url: storagePublicUrl(baseUrl, original.bucket, original.path),
              name: original.original_name ?? '',
              kind: original.kind === 'PDF' ? ('pdf' as const) : ('hwp' as const),
            },
          }
        : {}),
      pages: [...(r.pages?.files ?? [])]
        .filter(p => p.kind === 'IMAGE' && p.width && p.height)
        .sort((a, b) => a.sort - b.sort)
        .map(p => ({
          src: storagePublicUrl(baseUrl, p.bucket, p.path),
          width: p.width as number,
          height: p.height as number,
        })),
      videoIds: r.resource_videos.map(v => v.video_id),
    };
  });

const readResources = async (): Promise<Resource[]> => {
  const env = readSupabaseEnv();
  const client = env ? createSupabaseReadClient() : null;
  if (!env || !client) return [];
  const { data, error } = await client
    .from('resources')
    .select(
      // 묶음을 둘(원본 · 쪽) 가리키므로 연결 이름으로 나눠 읽는다
      'slug, section, title, episode, date, year, passage, categories(label), file:file_lists!resources_file_list_id_fkey(files(bucket, path, kind, original_name, sort)), pages:file_lists!resources_pages_list_id_fkey(files(bucket, path, kind, width, height, sort)), resource_videos(video_id)'
    )
    .eq('status', 'PUBLISHED')
    .is('deleted_at', null)
    // 화면이 날짜로 다시 정렬한다 — 같은 날짜(연도만 있는 것 등)끼리의 순서가 고칠 때마다 바뀌지 않게 정해 둔다
    .order('id', { ascending: false });
  if (error) throw new Error(`설교 시트지를 읽지 못했습니다: ${error.message}`);
  return toResources((data ?? []) as unknown as Row[], env.url);
};

// stale 300 — 30 이면 빠른 이동용 틀(App Shell)에서 빠진다(주보와 같다)
const cachedResources = async () => {
  'use cache';
  cacheTag(RESOURCES_TAG);
  const settled = await settle(readResources);
  cacheLife(settled.ok ? { stale: 300, revalidate: 60 } : failureCacheLife(settled));
  return settled;
};

/** 공개 설교 시트지 전부(순서는 저장소가 분류마다 정한다). DB 를 못 읽으면 운영에서는 직전 페이지를 유지하고, 빌드 · 개발에서는 빈 목록 */
export const loadResources = async (): Promise<Resource[]> =>
  (await loadForPage(async () => unwrap(await cachedResources()))) ?? [];
