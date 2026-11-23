// 끌어서 옮긴 순서의 입력(메뉴 · 분류 · 코드 공통 — 화면 · Server Action 이 같은 스키마).
import { z } from 'zod';

/** 한 무리의 모든 id 를 새 순서대로. 무리가 맞는지는 DB(reorder_rows)가 본다 */
export const reorderSchema = z.object({
  ids: z
    .array(z.uuid())
    .min(1)
    .max(200)
    .refine(ids => new Set(ids).size === ids.length, '같은 줄이 두 번 들어 있습니다.'),
});
