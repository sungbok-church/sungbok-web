// 분류 관리 화면의 입력(화면 · Server Action 이 같은 스키마). 칸 제한은 DB(categories)의 check 와 같다.
import { z } from 'zod';

const label = z.string().trim().min(1, '이름을 넣어 주세요.').max(50, '이름은 50자까지입니다.');

export const categoryCreateSchema = z.object({
  groupKey: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  /** 공개 주소의 거르기 값(?category=church-event) — 한 번 정하면 바꾸지 않는다 */
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]*$/, '영문 소문자 · 숫자 · - 로 적어 주세요.')
    .max(50, '50자까지입니다.'),
  label,
});

export const categoryUpdateSchema = z.object({
  id: z.uuid(),
  updatedAt: z.string().min(1),
  label,
  isActive: z.boolean(),
});
