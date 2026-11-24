// 주보 등록 · 수정의 입력(화면 · Server Action 이 같은 스키마). 날짜는 요일을 묻지 않는다(성탄절 등 평일 주보 — 사용자 확인 2026-11-24).
// «같은 날짜에 하나» 는 DB 가 막는다(휴지통에 든 것은 빼고 — bulletins_date_key).
import { z } from 'zod';

import { isCalendarDate } from '../content';
import { fileItemSchema } from './fileInput';

/** 한 호의 쪽(펼친 두 면 그림) 한도 — 기존 주보는 4장 */
export const MAX_BULLETIN_PAGES = 20;

const date = z.string().refine(isCalendarDate, '날짜를 골라 주세요.');

export const bulletinCreateSchema = z.object({
  date,
  pages: z
    .array(fileItemSchema('bulletin'))
    .min(1, '쪽을 한 장 이상 올려 주세요.')
    .max(MAX_BULLETIN_PAGES, `쪽은 ${MAX_BULLETIN_PAGES}장까지입니다.`)
    .refine(fs => fs.every(f => f.kind === 'IMAGE'), '쪽은 그림 파일입니다.'),
  status: z.enum(['DRAFT', 'PUBLISHED']),
});

export const bulletinUpdateSchema = bulletinCreateSchema.extend({
  id: z.uuid(),
  /** 화면이 열었을 때의 수정 시각(동시 수정 막기) */
  updatedAt: z.string().min(1),
});

export type BulletinCreateInput = z.input<typeof bulletinCreateSchema>;
