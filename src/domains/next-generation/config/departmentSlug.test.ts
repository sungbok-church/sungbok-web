import { describe, expect, it } from 'vitest';

import { DEPARTMENT_SLUGS, fromDbSlug, toDbSlug } from './departmentSlug';

describe('부서 slug — 공개 주소(소문자 · 줄표) ↔ DB enum(대문자 · 밑줄)', () => {
  it('8개 부서, 서로 바꿔도 제자리', () => {
    expect(DEPARTMENT_SLUGS).toHaveLength(8);
    for (const s of DEPARTMENT_SLUGS) expect(fromDbSlug(toDbSlug(s))).toBe(s);
    expect(toDbSlug('lower-elementary')).toBe('LOWER_ELEMENTARY');
    expect(fromDbSlug('YOUNG_ADULT')).toBe('young-adult');
  });
  it('모르는 값은 null', () => {
    expect(fromDbSlug('NOPE')).toBeNull();
  });
});
