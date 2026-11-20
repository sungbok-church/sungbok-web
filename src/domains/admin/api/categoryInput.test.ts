import { describe, expect, it } from 'vitest';

import { categoryCreateSchema, categoryUpdateSchema } from './categoryInput';

describe('categoryCreateSchema', () => {
  it('영문 이름(slug)은 공개 주소의 거르기 값 — 소문자 · 숫자 · -, 이름은 1~50자', () => {
    expect(
      categoryCreateSchema.parse({
        groupKey: 'ALBUM_CATEGORY',
        slug: ' Church-Event ',
        label: ' 교회행사 ',
      })
    ).toEqual({
      groupKey: 'ALBUM_CATEGORY',
      slug: 'church-event',
      label: '교회행사',
    });
    const r = categoryCreateSchema.safeParse({
      groupKey: 'ALBUM_CATEGORY',
      slug: '교회_행사',
      label: '',
    });
    expect(r.error?.issues.map(i => String(i.path[0]))).toEqual(['slug', 'label']);
  });

  it('묶음 key 는 대문자', () => {
    expect(
      categoryCreateSchema.safeParse({ groupKey: 'album_category', slug: 'a', label: '가' }).success
    ).toBe(false);
  });
});

describe('categoryUpdateSchema', () => {
  it('이름 · 사용 여부', () => {
    expect(
      categoryUpdateSchema.parse({
        id: '0190a0b0-0000-7000-8000-000000000001',
        updatedAt: 't',
        label: '가',
        isActive: false,
      })
    ).toMatchObject({ isActive: false });
  });
});
