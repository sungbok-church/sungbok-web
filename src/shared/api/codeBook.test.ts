import { describe, expect, it } from 'vitest';

import { categoryOptions, codeLabel, codeOptions, groupRows } from './codeBook';

const BOOK = groupRows([
  { group_key: 'STAFF_ROLE', code: 'PASTOR', label: '목사', is_active: true },
  { group_key: 'STAFF_ROLE', code: 'ELDER', label: '장로', is_active: false },
  { group_key: 'NEWCOMER_STATUS', code: 'NEW', label: '접수', is_active: true },
]);

describe('groupRows', () => {
  it('묶음 key 별로 나누고, 받은 순서(= sort 순)를 지킨다', () => {
    expect(Object.keys(BOOK)).toEqual(['STAFF_ROLE', 'NEWCOMER_STATUS']);
    expect(BOOK.STAFF_ROLE.map(c => c.code)).toEqual(['PASTOR', 'ELDER']);
  });
});

describe('codeOptions — 드롭다운 · 조건', () => {
  it('켜진 코드만', () => {
    expect(codeOptions(BOOK, 'STAFF_ROLE')).toEqual([{ value: 'PASTOR', label: '목사' }]);
  });

  it('수정 화면: 이미 고른 값이 꺼졌어도 그 값은 남긴다(고른 값이 사라지지 않게)', () => {
    expect(codeOptions(BOOK, 'STAFF_ROLE', 'ELDER')).toEqual([
      { value: 'PASTOR', label: '목사' },
      { value: 'ELDER', label: '장로(사용 안 함)' },
    ]);
  });

  it('없는 묶음은 빈 목록', () => {
    expect(codeOptions(BOOK, 'NOPE')).toEqual([]);
  });
});

describe('codeLabel — 표 · 상세에 이름 보이기', () => {
  it('코드 값 → 이름, 모르는 값은 값 그대로', () => {
    expect(codeLabel(BOOK, 'NEWCOMER_STATUS', 'NEW')).toBe('접수');
    expect(codeLabel(BOOK, 'NEWCOMER_STATUS', 'GONE')).toBe('GONE');
  });
});

describe('categoryOptions', () => {
  it('분류는 id 를 값으로(글이 id 로 가리킨다), 켜진 것만', () => {
    const book = groupRows([
      {
        group_key: 'ALBUM_CATEGORY',
        id: 'a1',
        slug: 'church-event',
        label: '교회행사',
        is_active: true,
      },
      { group_key: 'ALBUM_CATEGORY', id: 'a2', slug: 'old', label: '옛 분류', is_active: false },
    ]);
    expect(categoryOptions(book, 'ALBUM_CATEGORY')).toEqual([{ value: 'a1', label: '교회행사' }]);
  });
});
