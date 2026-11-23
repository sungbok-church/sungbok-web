// 메뉴 관리 화면의 입력(화면 · Server Action 이 같은 스키마). 칸 제한은 DB(menus)의 check 와 같다.
import { z } from 'zod';

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
