// 다음세대 부서 slug — 공개 주소 · 화면 key 는 소문자 · 줄표(lower-elementary), DB enum 은 대문자 · 밑줄
// (LOWER_ELEMENTARY). 부서는 8개로 고정이다(설계 6.13 — 화면에서 더하거나 지우지 않는다). 순수 데이터 · 변환.
import type { Database } from '@/shared/api/supabase/database.types';

export const DEPARTMENT_SLUGS = [
  'infant',
  'kindergarten',
  'lower-elementary',
  'elementary',
  'middle',
  'high',
  'young-adult',
  'english',
] as const;

export type DepartmentSlug = (typeof DEPARTMENT_SLUGS)[number];
export type DepartmentDbSlug = Database['public']['Enums']['department_slug'];

export const toDbSlug = (slug: DepartmentSlug): DepartmentDbSlug =>
  slug.toUpperCase().replace(/-/g, '_') as DepartmentDbSlug;

export const fromDbSlug = (value: string): DepartmentSlug | null =>
  DEPARTMENT_SLUGS.find(s => toDbSlug(s) === value) ?? null;
