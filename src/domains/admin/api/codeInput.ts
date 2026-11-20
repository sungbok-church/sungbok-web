// 코드(공통코드) 관리 · 메뉴 관리 화면의 입력(화면 · Server Action 이 같은 스키마). 칸 제한은 DB 의 check 와 같다.
import { z } from 'zod';

const label = z.string().trim().min(1, '이름을 넣어 주세요.').max(50, '이름은 50자까지입니다.');

export const codeCreateSchema = z.object({
  groupKey: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  /** 코드 값 — 영문 대문자 · 숫자 · _(영문으로 시작). 소문자로 써도 대문자로 바꾼다 */
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]*$/, '영문 대문자 · 숫자 · _ 로, 영문으로 시작해 적어 주세요.')
    .max(50, '50자까지입니다.'),
  label,
});

export const codeUpdateSchema = z.object({
  id: z.uuid(),
  updatedAt: z.string().min(1),
  label,
  isActive: z.boolean(),
});

export const menuUpdateSchema = z.object({
  id: z.uuid(),
  updatedAt: z.string().min(1),
  /** 비우면 기본 이름(default_label)으로 */
  label: z
    .string()
    .trim()
    .max(50, '이름은 50자까지입니다.')
    .transform(v => (v ? v : null)),
  isActive: z.boolean(),
});

export const moveSchema = z.object({ id: z.uuid(), dir: z.enum(['up', 'down']) });
