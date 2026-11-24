import 'server-only';

import {
  type DepartmentSlug,
  fromDbSlug,
  toDbSlug,
} from '@/domains/next-generation/config/departmentSlug';
import type { Database } from '@/shared/api/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { FileItem } from '../../lib/input/fileInput';
import { toFileItems } from './bulletin.server';

// 다음세대 부서 읽기(관리자, 설계 6.13) — 로그인한 사람의 세션으로 읽는다(부서 · 담당자는 누구나 읽는 표, 고치기만 RLS).

type Client = SupabaseClient<Database>;
type FileRows = Parameters<typeof toFileItems>[0];

const FILES = 'files(path, kind, width, height, bytes, original_name, alt, sort, variants)';

export type AdminDepartmentStaff = {
  id: string;
  name: string;
  roleId: string;
  greeting: string;
  photo: FileItem[];
};

export type AdminDepartment = {
  id: string;
  slug: DepartmentSlug;
  ages: string;
  tagline: string;
  intro: string;
  extra: string;
  updatedAt: string;
  updatedBy: string | null;
  photos: FileItem[];
  staff: AdminDepartmentStaff[];
};

export type StaffRoleOption = { value: string; label: string };

/** 부서 한 곳 — 소개 · 사진 · 담당자(순서대로) */
export const loadDepartment = async (
  client: Client,
  slug: DepartmentSlug
): Promise<AdminDepartment | null> => {
  const { data } = await client
    .from('departments')
    .select(
      `id, slug, ages, tagline, intro, extra, updated_at, updated_by, photos:file_lists!departments_photos_list_id_fkey(${FILES}), department_staff(id, sort, name, role_id, greeting, photo:file_lists(${FILES}))`
    )
    .eq('slug', toDbSlug(slug))
    .maybeSingle();
  if (!data) return null;
  const staff = (
    (data.department_staff ?? []) as {
      id: string;
      sort: number;
      name: string;
      role_id: string;
      greeting: string | null;
      photo: { files: FileRows } | null;
    }[]
  ).sort((a, b) => a.sort - b.sort);
  return {
    id: data.id,
    slug,
    ages: data.ages,
    tagline: data.tagline,
    intro: data.intro,
    extra: data.extra ?? '',
    updatedAt: data.updated_at,
    updatedBy: data.updated_by,
    photos: toFileItems((data.photos as { files: FileRows } | null)?.files ?? []),
    staff: staff.map(s => ({
      id: s.id,
      name: s.name,
      roleId: s.role_id,
      greeting: s.greeting ?? '',
      photo: toFileItems(s.photo?.files ?? []),
    })),
  };
};

/** 부서 목록(고르기) — 8곳의 slug · 사진 수 · 담당자 수 · 마지막 수정 */
export const loadDepartmentList = async (client: Client) => {
  const { data } = await client
    .from('departments')
    .select(
      'slug, ages, updated_at, updated_by, department_staff(count), photos:file_lists!departments_photos_list_id_fkey(files(count))'
    );
  return (data ?? []).flatMap(r => {
    const slug = fromDbSlug(r.slug);
    if (!slug) return [];
    return [
      {
        slug,
        ages: r.ages,
        updatedAt: r.updated_at,
        updatedBy: r.updated_by,
        staff: (r.department_staff as { count: number }[] | null)?.[0]?.count ?? 0,
        photos: (r.photos as { files: { count: number }[] } | null)?.files?.[0]?.count ?? 0,
      },
    ];
  });
};

/** 담당자 직분(공통코드 STAFF_ROLE) — 쓰는 것만, 이미 고른 값은 꺼졌어도 남긴다 */
export const loadStaffRoles = async (
  client: Client,
  selected: readonly string[] = []
): Promise<StaffRoleOption[]> => {
  const { data } = await client
    .from('codes')
    .select('id, label, is_active')
    .eq('group_key', 'STAFF_ROLE')
    .order('sort');
  return (data ?? [])
    .filter(c => c.is_active || selected.includes(c.id))
    .map(c => ({ value: c.id, label: c.label }));
};
