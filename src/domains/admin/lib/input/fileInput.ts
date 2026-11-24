// 파일 올리기 통로의 입력(화면 · Server Action 이 같은 스키마, 설계 6.8). 칸 제한은 DB(files)의 check 와 같다.
import { z } from 'zod';

import { isAllowedPath } from '../fileUpload';

/** 파일을 올리는 메뉴 — 콘텐츠 5종 + 사이트 화면 둘(Storage 경로의 첫 조각) */
export const CONTENT_MENUS = [
  'bulletin',
  'announcements',
  'garden',
  'album',
  'resources',
  'home-hero',
  'departments',
] as const;
export type ContentMenu = (typeof CONTENT_MENUS)[number];

/** 한 파일 50MB — 버킷 한도(reference.sql, 무료 요금제 한도)와 같다 */
export const MAX_FILE_BYTES = 52_428_800;

const uuid = z.uuid();

/** 글이 가리킬 파일 한 개 — 저장할 때 이 순서대로 새 묶음에 적는다 */
export const fileItemSchema = (menuKey: ContentMenu) =>
  z
    .object({
      path: z.string(),
      kind: z.enum(['IMAGE', 'PDF', 'HWP']),
      width: z.number().int().positive().nullable(),
      height: z.number().int().positive().nullable(),
      bytes: z.number().int().min(0).max(MAX_FILE_BYTES),
      originalName: z.string().trim().min(1).max(255),
      alt: z
        .string()
        .trim()
        .max(300, '대체 텍스트는 300자까지입니다.')
        .nullish()
        .transform(v => v || null),
    })
    .refine(f => isAllowedPath(f.path, menuKey, f.kind), { message: '올릴 수 없는 파일입니다.' })
    .refine(f => (f.width === null) === (f.height === null) && (f.kind !== 'IMAGE' || f.width), {
      message: '그림의 크기를 읽지 못했습니다. 다시 올려 주세요.',
    });

export type FileItem = z.output<ReturnType<typeof fileItemSchema>>;

/** 한 파일을 올릴 한 번 쓰는 주소를 달라는 요청 */
export const uploadRequestSchema = z.object({
  menuKey: z.enum(CONTENT_MENUS),
  listId: uuid,
  type: z.string().max(100),
  name: z.string().min(1).max(255),
  bytes: z.number().int().min(1).max(MAX_FILE_BYTES, '파일은 50MB 까지 올릴 수 있습니다.'),
});
