// 교회앨범 등록 · 수정의 입력(화면 · Server Action 이 같은 스키마). 칸 제한은 DB(albums)의 check 와 같다.
import { z } from 'zod';

import { fileItemSchema } from './fileInput';

/** 한 건의 그림 한도 — 기존 앨범은 화보 · 포스터 한 장씩 */
export const MAX_ALBUM_IMAGES = 30;

export const albumFormSchema = z.object({
  title: z.string().trim().min(1, '제목을 넣어 주세요.').max(200, '제목은 200자까지입니다.'),
  categoryId: z.uuid('분류를 골라 주세요.'),
  images: z
    .array(fileItemSchema('album'))
    .min(1, '그림을 한 장 이상 올려 주세요.')
    .max(MAX_ALBUM_IMAGES, `그림은 ${MAX_ALBUM_IMAGES}장까지입니다.`),
});

export const albumCreateSchema = albumFormSchema.extend({
  status: z.enum(['DRAFT', 'PUBLISHED']),
});

export const albumUpdateSchema = albumCreateSchema.extend({
  id: z.uuid(),
  /** 화면이 열었을 때의 수정 시각(동시 수정 막기) */
  updatedAt: z.string().min(1),
});
