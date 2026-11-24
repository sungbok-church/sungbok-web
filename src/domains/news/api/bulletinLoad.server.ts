// 공개 주보 읽기(설계 6.9) — DB 의 «공개 + 휴지통 아님» 주보를 읽는다. 방문자와 같은 권한(공개 키 · RLS)으로, 서버에서만.
// 서버 캐시('use cache')에 두고 태그(BULLETINS_TAG)를 단다 — 관리자가 저장하면 updateTag 로 바로 바뀐다.
// 캐시는 서버 한 대의 메모리라(ADR 0024) 다른 서버가 옛 값을 들고 있을 수 있어 60초마다 다시 확인한다(revalidate).
// stale(브라우저가 다시 묻지 않고 쓰는 시간)은 300초 — 30초면 빠른 이동용 틀(App Shell)에서 빠진다(개발 알림으로 확인, 2026-11-24).
// 실패는 값으로 담고(settle), 운영에서 다시 그리다 실패하면 직전 페이지를 계속 보인다(loadForPage).
import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다

import { loadForPage } from '@/shared/api/loadForPage.server';
import { failureCacheLife, settle, unwrap } from '@/shared/api/settled.server';
import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { createSupabaseReadClient } from '@/shared/api/supabase/readClient.server';
import { storagePublicUrl } from '@/shared/lib/storageUrl';
import { cacheLife, cacheTag } from 'next/cache';

import type { BulletinIssue } from './news.types';
import { BULLETINS_TAG } from './newsTags';

type FileRow = {
  bucket: string;
  path: string;
  kind: string;
  width: number | null;
  height: number | null;
  sort: number;
};
type Row = { date: string; file_lists: { files: FileRow[] } | null };

/** DB 의 행 → 공개 화면의 호(주소 id 는 날짜, 쪽은 순서대로). 그림이 아닌 파일은 쪽이 아니고, 쪽이 없는 호는 싣지 않는다 */
export const toIssues = (rows: readonly Row[], baseUrl: string): BulletinIssue[] =>
  rows.flatMap(r => {
    const pages = [...(r.file_lists?.files ?? [])]
      .filter(f => f.kind === 'IMAGE' && f.width && f.height)
      .sort((a, b) => a.sort - b.sort)
      .map(f => ({
        src: storagePublicUrl(baseUrl, f.bucket, f.path),
        width: f.width as number,
        height: f.height as number,
      }));
    return pages.length > 0
      ? [{ id: r.date, status: 'published' as const, date: r.date, pages }]
      : [];
  });

const readIssues = async (): Promise<BulletinIssue[]> => {
  const env = readSupabaseEnv();
  const client = env ? createSupabaseReadClient() : null;
  if (!env || !client) return [];
  const { data, error } = await client
    .from('bulletins')
    .select('date, file_lists(files(bucket, path, kind, width, height, sort))')
    .eq('status', 'PUBLISHED')
    .is('deleted_at', null)
    .order('date', { ascending: false });
  if (error) throw new Error(`주보를 읽지 못했습니다: ${error.message}`);
  return toIssues((data ?? []) as Row[], env.url);
};

const cachedIssues = async () => {
  'use cache';
  cacheTag(BULLETINS_TAG);
  const settled = await settle(readIssues);
  cacheLife(settled.ok ? { stale: 300, revalidate: 60 } : failureCacheLife(settled));
  return settled;
};

/** 공개 주보 — 최신 주일부터. DB 를 못 읽으면 운영에서는 직전 페이지를 유지하고, 빌드 · 개발에서는 빈 목록(«아직 등록된 주보가 없습니다») */
export const loadIssues = async (): Promise<BulletinIssue[]> =>
  (await loadForPage(async () => unwrap(await cachedIssues()))) ?? [];
