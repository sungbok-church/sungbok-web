// DB 의 부서 한 곳 → 공개 부서 페이지(DepartmentPage)의 값 — 공개 저장소와 관리자 미리보기가 같이 쓴다(설계 6.13).
// 이름 · 예배 요일/시간/장소는 코드(DEPARTMENT_INFO), 소개 · 담당자 · 사진은 DB. 사진은 순서대로, 첫 장이 도입부.
import { toUploadedPhoto } from '@/shared/lib/uploadedPhoto';

import type { DepartmentPageProps, Photo, Staff } from '../components/widgets/DepartmentPage/types';
import { DEPARTMENT_INFO } from '../config/departmentInfo';
import type { DepartmentSlug } from '../config/departmentSlug';

type FileLike = Parameters<typeof toUploadedPhoto>[1] & { alt?: string | null };

export type DepartmentData = {
  ages: string;
  tagline: string;
  intro: string;
  extra: string | null;
  staff: { name: string; roleLabel: string; greeting: string | null; photo: FileLike | null }[];
  photos: FileLike[];
};

export const toDepartmentPage = (
  slug: DepartmentSlug,
  baseUrl: string,
  data: DepartmentData
): DepartmentPageProps => {
  const info = DEPARTMENT_INFO[slug];
  const staff = data.staff.map((s): Staff => {
    const photo = s.photo ? toUploadedPhoto(baseUrl, s.photo) : null;
    return {
      name: s.name,
      role: s.roleLabel,
      ...(s.greeting ? { greeting: s.greeting } : {}),
      ...(photo ? { photo } : {}),
    };
  });
  const photos = data.photos.flatMap((f, i): Photo[] => {
    const src = toUploadedPhoto(baseUrl, f);
    return src ? [{ id: `p${i + 1}`, src, alt: f.alt || `${info.name} 사진 ${i + 1}` }] : [];
  });
  return {
    dept: {
      name: info.name,
      worship: info.worship,
      ages: data.ages,
      tagline: data.tagline,
      intro: data.intro,
      extra: data.extra ?? '',
      staff,
    },
    photos,
  };
};

type FileRow = {
  path: string;
  kind: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  sort: number;
  variants: unknown;
};

/** DB 행 — 사진 묶음 · 담당자(직분 이름 · 사진 묶음)를 조인해 읽은 모양 */
export type DepartmentRow = {
  ages: string;
  tagline: string;
  intro: string;
  extra: string | null;
  photos: { files: FileRow[] } | null;
  department_staff: {
    sort: number;
    name: string;
    greeting: string | null;
    role: { label: string } | null;
    photo: { files: FileRow[] } | null;
  }[];
};

const images = (files: readonly FileRow[] = []) =>
  [...files].filter(f => f.kind === 'IMAGE').sort((a, b) => a.sort - b.sort);

/** DB 행 → 부서 값(사진 · 담당자는 순서대로, 그림이 아닌 파일은 뺀다) */
export const rowToDepartmentData = (row: DepartmentRow): DepartmentData => ({
  ages: row.ages,
  tagline: row.tagline,
  intro: row.intro,
  extra: row.extra,
  photos: images(row.photos?.files),
  staff: [...row.department_staff]
    .sort((a, b) => a.sort - b.sort)
    .map(s => ({
      name: s.name,
      roleLabel: s.role?.label ?? '',
      greeting: s.greeting,
      photo: images(s.photo?.files)[0] ?? null,
    })),
});
