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

export const groupCreateSchema = z.object({ name, description });

export const groupUpdateSchema = z.object({
  id: z.uuid(),
  updatedAt: z.string().min(1),
  name,
  description,
  isActive: z.boolean(),
});

export const groupPermissionsSchema = z.object({
  groupId: z.uuid(),
  permissions: z
    .array(z.object({ menuKey: z.string().regex(/^[a-z][a-z0-9-]*$/), action: z.enum(ACTIONS) }))
    .max(200),
});
