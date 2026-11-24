import { describe, expect, it } from 'vitest';

import { CONTENT_MENUS, fileItemSchema, uploadRequestSchema } from './fileInput';

const LIST = '0190a0b0-0000-7000-8000-000000000001';
const FILE = '0190a0b0-0000-7000-8000-000000000002';
const image = {
  path: `bulletin/${LIST}/${FILE}.webp`,
  kind: 'IMAGE',
  width: 1200,
  height: 854,
  bytes: 100_000,
  originalName: '주보 1쪽.webp',
};

describe('fileItemSchema', () => {
  it('그 메뉴의 경로 · 맞는 확장자 · 그림이면 크기', () => {
    expect(fileItemSchema('bulletin').safeParse(image).success).toBe(true);
    expect(fileItemSchema('album').safeParse(image).success).toBe(false);
    expect(fileItemSchema('bulletin').safeParse({ ...image, kind: 'PDF' }).success).toBe(false);
    expect(
      fileItemSchema('bulletin').safeParse({ ...image, width: null, height: null }).success
    ).toBe(false);
  });
  it('폭별 파일은 [가로, 경로] — 같은 메뉴 · 같은 묶음의 그림만, 없으면 null', () => {
    const V = '0190a0b0-0000-7000-8000-000000000003';
    const dept = { ...image, path: `departments/${LIST}/${FILE}.webp` };
    expect(fileItemSchema('departments').parse(dept).variants).toBeNull();
    const ok = { ...dept, variants: [[640, `departments/${LIST}/${V}.webp`]] };
    expect(fileItemSchema('departments').parse(ok).variants).toEqual([
      [640, `departments/${LIST}/${V}.webp`],
    ]);
    const otherList = { ...dept, variants: [[640, `departments/${V}/${V}.webp`]] };
    expect(fileItemSchema('departments').safeParse(otherList).success).toBe(false);
    const otherMenu = { ...dept, variants: [[640, `album/${LIST}/${V}.webp`]] };
    expect(fileItemSchema('departments').safeParse(otherMenu).success).toBe(false);
  });
  it('대체 텍스트는 300자까지, 비우면 null', () => {
    expect(fileItemSchema('bulletin').parse({ ...image, alt: '  ' }).alt).toBeNull();
    expect(fileItemSchema('bulletin').safeParse({ ...image, alt: 'a'.repeat(301) }).success).toBe(
      false
    );
  });
});

describe('uploadRequestSchema', () => {
  it('콘텐츠 · 사이트 화면 메뉴만, 50MB 까지', () => {
    const ok = { menuKey: 'bulletin', listId: LIST, type: 'image/webp', name: 'a.webp', bytes: 1 };
    expect(uploadRequestSchema.safeParse(ok).success).toBe(true);
    expect(uploadRequestSchema.safeParse({ ...ok, menuKey: 'users' }).success).toBe(false);
    expect(uploadRequestSchema.safeParse({ ...ok, bytes: 52_428_801 }).success).toBe(false);
    expect(CONTENT_MENUS).toContain('departments');
  });
});
