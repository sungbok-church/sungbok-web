// 다음세대 부서 저장의 입력(화면 · Server Action 이 같은 스키마, 설계 6.13). 칸 제한은 DB(departments · department_staff)의
// check 와 같다. 사진은 첫 장이 도입부, 나머지가 쇼케이스 — 최소 한 장. 담당자는 0명도 된다(그 구역을 그리지 않는다).
import { DEPARTMENT_SLUGS } from '@/domains/next-generation/config/departmentSlug';
import { z } from 'zod';

import { fileItemSchema } from './fileInput';

export const MAX_DEPARTMENT_PHOTOS = 30;
export const MAX_DEPARTMENT_STAFF = 10;

/** 꼭 넣는 칸 — «<칸>을 넣어 주세요» · «<칸>은 N자까지입니다» 는 받침에 맞춰 화면 문장으로 준다 */
const text = (required: string, tooLong: string, max: number) =>
  z.string().trim().min(1, required).max(max, tooLong);
const optional = (tooLong: string, max: number) => z.string().trim().max(max, tooLong);
const images = (max: number) =>
  z
    .array(fileItemSchema('departments'))
    .max(max, `사진은 ${max}장까지입니다.`)
    .refine(fs => fs.every(f => f.kind === 'IMAGE'), '사진은 그림 파일입니다.');

export const departmentStaffSchema = z.object({
  /** 이미 있는 담당자의 id — 새 사람은 null */
  id: z.uuid().nullable(),
  name: text('이름을 넣어 주세요.', '이름은 50자까지입니다.', 50),
  roleId: z.uuid('직분을 골라 주세요.'),
  greeting: optional('인사말은 1000자까지입니다.', 1000),
  /** 담당자 사진 — 없거나 한 장 */
  photo: images(1),
});

export const departmentSaveSchema = z.object({
  slug: z.enum(DEPARTMENT_SLUGS),
  /** 화면이 열었을 때의 수정 시각(동시 수정 막기) */
  updatedAt: z.string().min(1),
  ages: text('대상 나이를 넣어 주세요.', '대상 나이는 50자까지입니다.', 50),
  tagline: text('사진 위 한 줄을 넣어 주세요.', '사진 위 한 줄은 100자까지입니다.', 100),
  intro: text('소개를 넣어 주세요.', '소개는 3000자까지입니다.', 3000),
  extra: optional('맨 아래 한 줄은 300자까지입니다.', 300),
  photos: images(MAX_DEPARTMENT_PHOTOS).refine(
    fs => fs.length > 0,
    '사진을 한 장 이상 올려 주세요.'
  ),
  staff: z
    .array(departmentStaffSchema)
    .max(MAX_DEPARTMENT_STAFF, `담당자는 ${MAX_DEPARTMENT_STAFF}명까지입니다.`),
});

export type DepartmentSaveInput = z.input<typeof departmentSaveSchema>;
export type DepartmentStaffInput = z.input<typeof departmentStaffSchema>;
