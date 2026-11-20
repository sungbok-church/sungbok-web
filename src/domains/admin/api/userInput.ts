// 사용자 화면의 입력(화면 · Server Action 이 같은 스키마). 칸 제한은 DB(profiles)의 check 와 같다.
import type { Database } from '@/shared/api/supabase/database.types';
import { z } from 'zod';

/** 다음세대 부서 코드(DB enum department_slug — 대문자) */
type DepartmentSlug = Database['public']['Enums']['department_slug'];

export const DEPARTMENTS: readonly { value: DepartmentSlug; label: string }[] = [
  { value: 'INFANT', label: '영아부' },
  { value: 'KINDERGARTEN', label: '유치부' },
  { value: 'LOWER_ELEMENTARY', label: '유년부' },
  { value: 'ELEMENTARY', label: '초등부' },
  { value: 'MIDDLE', label: '중등부' },
  { value: 'HIGH', label: '고등부' },
  { value: 'YOUNG_ADULT', label: '청년부' },
  { value: 'ENGLISH', label: '영어예배부' },
];

const name = z.string().trim().min(1, '이름을 넣어 주세요.').max(50, '이름은 50자까지입니다.');
const groupIds = z.array(z.uuid('그룹을 다시 골라 주세요.')).max(20);
// 빈 값 = 모든 부서
const department = z
  .union([
    z.enum(DEPARTMENTS.map(d => d.value) as [DepartmentSlug, ...DepartmentSlug[]]),
    z.literal(''),
    z.null(),
  ])
  .transform(v => (v ? v : null));

export const userCreateSchema = z.object({
  name,
  email: z.string().trim().toLowerCase().pipe(z.email('이메일 주소를 확인해 주세요.')),
  groupIds,
  department,
});

export const userUpdateSchema = z.object({
  id: z.uuid(),
  /** 화면이 열었을 때의 updated_at — 동시 수정 막기 */
  updatedAt: z.string().min(1),
  name,
  groupIds,
  department,
  isActive: z.boolean(),
  /** 화면을 열었을 때의 그룹 목록 — 그 뒤 다른 사람이 그룹을 바꿨으면 저장하지 않는다(남의 변경을 덮지 않게) */
  seenGroupIds: groupIds,
});

export type UserCreateInput = z.input<typeof userCreateSchema>;
export type UserUpdateInput = z.input<typeof userUpdateSchema>;
