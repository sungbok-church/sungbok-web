// 공개 다음세대 부서 읽기(설계 6.9 · 6.13) — 부서 8곳의 소개 · 담당자 · 사진을 공개 키로, 서버에서만 한 번에 읽는다.
// 서버 캐시('use cache')에 두고 태그(DEPARTMENTS_TAG)를 단다 — 관리자가 저장하면 updateTag 로 바로 바뀐다.
// 옮기기(패키지 C1 T7) 전까지 DB 에 없는 부서는 지금 코드의 값(data/departments)으로 그린다 — 옮긴 뒤 정리(T8)에서 지운다.
import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다

import { loadForPage } from '@/shared/api/loadForPage.server';
import { failureCacheLife, settle, unwrap } from '@/shared/api/settled.server';
import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { createSupabaseReadClient } from '@/shared/api/supabase/readClient.server';
import { cacheLife, cacheTag } from 'next/cache';

import type { DepartmentPageProps } from '../components/widgets/DepartmentPage/types';
import { type DepartmentSlug, fromDbSlug } from '../config/departmentSlug';
import { DEPARTMENTS } from '../data/departments';
import { type DepartmentRow, rowToDepartmentData, toDepartmentPage } from './departmentPage';
import { DEPARTMENTS_TAG } from './departmentTags';

const FILES = 'files(path, kind, width, height, alt, sort, variants)';

const readDepartments = async (): Promise<Partial<Record<DepartmentSlug, DepartmentPageProps>>> => {
  const env = readSupabaseEnv();
  const client = env ? createSupabaseReadClient() : null;
  if (!env || !client) return {};
  const { data, error } = await client
    .from('departments')
    .select(
      `slug, ages, tagline, intro, extra, photos:file_lists!departments_photos_list_id_fkey(${FILES}), department_staff(sort, name, greeting, role:codes(label), photo:file_lists(${FILES}))`
    );
  if (error) throw new Error(`다음세대 부서를 읽지 못했습니다: ${error.message}`);
  const out: Partial<Record<DepartmentSlug, DepartmentPageProps>> = {};
  for (const row of data ?? []) {
    const slug = fromDbSlug(row.slug);
    if (!slug) continue;
    const page = toDepartmentPage(
      slug,
      env.url,
      rowToDepartmentData(row as unknown as DepartmentRow)
    );
    // 사진이 하나도 없으면 도입부를 그릴 수 없다 — 코드의 값으로(관리자는 사진을 한 장 이상 받는다)
    if (page.photos.length > 0) out[slug] = page;
  }
  return out;
};

// stale 300 — 30 이면 빠른 이동용 틀(App Shell)에서 빠진다(주보와 같다)
const cachedDepartments = async () => {
  'use cache';
  cacheTag(DEPARTMENTS_TAG);
  const settled = await settle(readDepartments);
  cacheLife(settled.ok ? { stale: 300, revalidate: 60 } : failureCacheLife(settled));
  return settled;
};

/** 공개 부서 페이지 하나 — DB 를 못 읽으면 운영에서는 직전 페이지를 유지하고, 빌드 · 개발에서는 코드의 값 */
export const loadDepartmentPage = async (slug: DepartmentSlug): Promise<DepartmentPageProps> => {
  const all = await loadForPage(async () => unwrap(await cachedDepartments()));
  return all?.[slug] ?? DEPARTMENTS[slug];
};
