// 분류 관리 · 코드(공통코드) 관리 화면의 입력(화면 · Server Action 이 같은 스키마). 칸 제한은 DB(categories · codes)의 check 와 같다.
// 두 화면은 «묶음 안의 이름 목록» 으로 같고, 영문 값 칸만 다르다(분류: slug · 코드: code).
import { z } from 'zod';

const label = z.string().trim().min(1, '이름을 넣어 주세요.').max(50, '이름은 50자까지입니다.');
const groupKey = z.string().regex(/^[A-Z][A-Z0-9_]*$/);

export const categoryCreateSchema = z.object({
  groupKey,
  /** 공개 주소의 거르기 값(?category=church-event) — 한 번 정하면 바꾸지 않는다 */
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]*$/, '영문 소문자 · 숫자 · - 로 적어 주세요.')
    .max(50, '50자까지입니다.'),
  label,
});

export const codeCreateSchema = z.object({
  groupKey,
  /** 코드 값 — 영문 대문자 · 숫자 · _(영문으로 시작). 소문자로 써도 대문자로 바꾼다 */
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]*$/, '영문 대문자 · 숫자 · _ 로, 영문으로 시작해 적어 주세요.')
    .max(50, '50자까지입니다.'),
  label,
});

/** 한 줄 고치기(분류 · 코드 공통) — 이름 · 사용 여부. 영문 값은 바꾸지 않는다 */
export const itemUpdateSchema = z.object({
  id: z.uuid(),
  updatedAt: z.string().min(1),
  label,
  isActive: z.boolean(),
});
