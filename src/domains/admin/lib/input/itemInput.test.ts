import { describe, expect, it } from 'vitest';

import { categoryCreateSchema, codeCreateSchema, itemUpdateSchema } from './itemInput';

describe('codeCreateSchema', () => {
  it('코드는 영문 대문자 · 숫자 · _(소문자로 써도 대문자로), 이름은 1~50자', () => {
    expect(
      codeCreateSchema.parse({ groupKey: 'STAFF_ROLE', code: ' elder ', label: ' 장로 ' })
    ).toEqual({
      groupKey: 'STAFF_ROLE',
      code: 'ELDER',
      label: '장로',
    });
    const r = codeCreateSchema.safeParse({ groupKey: 'STAFF_ROLE', code: '장로-1', label: '' });
    expect(r.error?.issues.map(i => String(i.path[0]))).toEqual(['code', 'label']);
  });

  it('숫자로 시작하거나 - 를 쓰면 안 된다(DB check 와 같게)', () => {
    expect(
      codeCreateSchema.safeParse({ groupKey: 'STAFF_ROLE', code: '1ST', label: '가' }).success
    ).toBe(false);
    expect(
      codeCreateSchema.safeParse({ groupKey: 'STAFF_ROLE', code: 'A-B', label: '가' }).success
    ).toBe(false);
  });
});

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

describe('itemUpdateSchema', () => {
  it('코드 · 분류 공통: 이름 · 사용 여부', () => {
    expect(
      itemUpdateSchema.parse({
        id: '0190a0b0-0000-7000-8000-000000000001',
        updatedAt: 't',
        label: '가',
        isActive: false,
      })
    ).toMatchObject({ isActive: false });
  });

  it('이름은 비울 수 없다', () => {
    expect(
      itemUpdateSchema.safeParse({
        id: '0190a0b0-0000-7000-8000-000000000001',
        updatedAt: 't',
        label: ' ',
        isActive: true,
      }).success
    ).toBe(false);
  });
});
