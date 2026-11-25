// 새가족 접수함에서 고치는 값(화면 · Server Action 이 같은 스키마) — 처리 상태 · 메모만. 접수 내용(이름 · 연락처 …)은 고치지 않는다.
import { z } from 'zod';

import { NEWCOMER_STATUSES, type NewcomerStatus } from '../newcomer';

export const newcomerUpdateSchema = z.object({
  id: z.uuid(),
  /** 화면이 열었을 때의 수정 시각(동시 수정 막기) */
  updatedAt: z.string().min(1),
  status: z.enum(NEWCOMER_STATUSES.map(s => s.value) as [NewcomerStatus, ...NewcomerStatus[]]),
  note: z.string().trim().max(2000, '메모는 2000자까지입니다.'),
});

export type NewcomerUpdateInput = z.input<typeof newcomerUpdateSchema>;
