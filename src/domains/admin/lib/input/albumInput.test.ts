import { describe, expect, it } from 'vitest';

import { albumCreateSchema, albumUpdateSchema, MAX_ALBUM_IMAGES } from './albumInput';

const LIST = '0190a0b0-0000-7000-8000-000000000001';
const CAT = '0190a0b0-0000-7000-8000-0000000000c1';
const image = (n: number) => ({
  path: `album/${LIST}/0190a0b0-0000-7000-8000-00000000000${n}.webp`,
  kind: 'IMAGE',
  width: 700,
  height: 998,
  bytes: 1,
  originalName: `${n}.webp`,
});
const valid = {
  title: ' 2026 가을특별부흥집회 ',
  categoryId: CAT,
  images: [image(2)],
  status: 'DRAFT',
};

describe('albumCreateSchema', () => {
  it('제목(다듬음) · 분류 · 그림 1장 이상', () => {
    expect(albumCreateSchema.parse(valid)).toMatchObject({ title: '2026 가을특별부흥집회' });
  });
  it('그림이 없거나 너무 많거나 다른 메뉴의 파일이면 안 된다', () => {
    const r = albumCreateSchema.safeParse({ ...valid, images: [] });
    expect(r.error?.issues[0]?.message).toBe('그림을 한 장 이상 올려 주세요.');
    const many = Array.from({ length: MAX_ALBUM_IMAGES + 1 }, () => image(2));
    expect(albumCreateSchema.safeParse({ ...valid, images: many }).success).toBe(false);
    const other = { ...image(2), path: image(2).path.replace('album/', 'bulletin/') };
    expect(albumCreateSchema.safeParse({ ...valid, images: [other] }).success).toBe(false);
  });
  it('제목 · 분류는 꼭', () => {
    expect(albumCreateSchema.safeParse({ ...valid, title: ' ' }).success).toBe(false);
    expect(albumCreateSchema.safeParse({ ...valid, categoryId: '' }).success).toBe(false);
  });
});

describe('albumUpdateSchema', () => {
  it('id · 열었을 때의 수정 시각이 더 있어야 한다', () => {
    expect(albumUpdateSchema.safeParse(valid).success).toBe(false);
    expect(albumUpdateSchema.safeParse({ ...valid, id: LIST, updatedAt: 't' }).success).toBe(true);
  });
});
