import { describe, expect, it } from 'vitest';

import {
  departmentSaveSchema,
  MAX_DEPARTMENT_PHOTOS,
  MAX_DEPARTMENT_STAFF,
} from './departmentInput';

const LIST = '0190a0b0-0000-7000-8000-000000000001';
const ROLE = '0190a0b0-0000-7000-8000-0000000000c1';
const photo = (n: number) => ({
  path: `departments/${LIST}/0190a0b0-0000-7000-8000-00000000000${n}.webp`,
  kind: 'IMAGE',
  width: 1600,
  height: 1067,
  bytes: 1,
  originalName: `${n}.webp`,
  alt: '예배 모습',
});
const valid = {
  slug: 'infant',
  updatedAt: 't1',
  ages: ' 1~4세 ',
  tagline: '한 줄',
  intro: '소개',
  extra: '',
  photos: [photo(2)],
  staff: [{ id: null, name: '김목사', roleId: ROLE, greeting: '', photo: [photo(3)] }],
};

describe('departmentSaveSchema', () => {
  it('소개 · 사진(1장 이상) · 담당자(0명도 된다)', () => {
    const r = departmentSaveSchema.parse(valid);
    expect(r).toMatchObject({
      ages: '1~4세',
      extra: '',
      staff: [{ name: '김목사', greeting: '' }],
    });
    expect(departmentSaveSchema.safeParse({ ...valid, staff: [] }).success).toBe(true);
  });
  it('사진이 없거나 너무 많으면, 그림이 아니면, 다른 메뉴의 파일이면 안 된다', () => {
    expect(departmentSaveSchema.safeParse({ ...valid, photos: [] }).error?.issues[0]?.message).toBe(
      '사진을 한 장 이상 올려 주세요.'
    );
    const many = Array.from({ length: MAX_DEPARTMENT_PHOTOS + 1 }, () => photo(2));
    expect(departmentSaveSchema.safeParse({ ...valid, photos: many }).success).toBe(false);
    const album = { ...photo(2), path: photo(2).path.replace('departments/', 'album/') };
    expect(departmentSaveSchema.safeParse({ ...valid, photos: [album] }).success).toBe(false);
  });
  it('담당자는 이름 · 직분 꼭, 사진은 한 장까지, 사람 수 한도', () => {
    const bad = (s: object) =>
      departmentSaveSchema.safeParse({ ...valid, staff: [{ ...valid.staff[0], ...s }] }).success;
    expect(bad({ name: ' ' })).toBe(false);
    expect(bad({ roleId: '' })).toBe(false);
    expect(bad({ photo: [photo(3), photo(4)] })).toBe(false);
    expect(bad({ photo: [] })).toBe(true);
    const crowd = Array.from({ length: MAX_DEPARTMENT_STAFF + 1 }, () => valid.staff[0]);
    expect(departmentSaveSchema.safeParse({ ...valid, staff: crowd }).success).toBe(false);
  });
  it('모르는 부서는 안 된다', () => {
    expect(departmentSaveSchema.safeParse({ ...valid, slug: 'adult' }).success).toBe(false);
  });
  it('같은 담당자 id 가 두 번 오면 안 된다(순서가 비지 않게)', () => {
    const STAFF = '0190a0b0-0000-7000-8000-0000000000d1';
    const one = { ...valid.staff[0], id: STAFF };
    expect(departmentSaveSchema.safeParse({ ...valid, staff: [one, one] }).success).toBe(false);
  });
});
