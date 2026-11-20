// 그룹 · 권한 화면의 입력(화면 · Server Action 이 같은 스키마). 칸 제한은 DB(groups)의 check 와 같다.
import { z } from 'zod';

const ACTIONS = ['READ', 'CREATE', 'UPDATE', 'DELETE', 'PURGE', 'EXPORT', 'HISTORY'] as const;

const name = z
  .string()
  .trim()
  .min(1, '그룹 이름을 넣어 주세요.')
  .max(50, '그룹 이름은 50자까지입니다.');
const description = z
  .string()
  .trim()
  .max(200, '설명은 200자까지입니다.')
  .nullable()
  .transform(v => (v ? v : null));

const permissions = z
  .array(z.object({ menuKey: z.string().regex(/^[a-z][a-z0-9-]*$/), action: z.enum(ACTIONS) }))
  .max(200);

/** 그룹 만들기 — 처음 권한 표를 함께(create_group, 한 트랜잭션) */
export const groupCreateSchema = z.object({
  name,
  description,
  permissions: permissions.default([]),
});

/** 상세의 사용 여부 바꾸기 등 — 그룹 정보만 */
export const groupUpdateSchema = z.object({
  id: z.uuid(),
  updatedAt: z.string().min(1),
  name,
  description,
  isActive: z.boolean(),
});

/**
 * 그룹 고치기 — 그룹 정보와 권한 표를 한 번에(save_group, 한 트랜잭션). 권한 표가 없으면(«전체 관리») 권한은 그대로.
 * seenPermissions 는 화면을 열었을 때의 권한 표 — 그 뒤 다른 사람이 바꿨으면 저장하지 않는다.
 */
export const groupSaveSchema = groupUpdateSchema.extend({
  permissions: permissions.optional(),
  seenPermissions: permissions.optional(),
});
