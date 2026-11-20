import { describe, expect, it } from 'vitest';

import { applySetChanges, changedFields, setChanges } from './draftChanges';

describe('draftChanges — 임시저장은 «내가 바꾼 것» 만 담고, 되살릴 때 새 화면 위에 얹는다', () => {
  it('changedFields: 열었을 때와 다른 칸만', () => {
    expect(
      changedFields(
        { name: '콘텐츠 담당', description: '설명', isActive: true },
        { name: '내 이름', description: '설명', isActive: true }
      )
    ).toEqual({ name: '내 이름' });
  });

  it('changedFields: 배열 칸은 내용으로 비교한다', () => {
    expect(changedFields({ ids: ['a', 'b'] }, { ids: ['a', 'b'] })).toEqual({});
    expect(changedFields({ ids: ['a'] }, { ids: ['a', 'b'] })).toEqual({ ids: ['a', 'b'] });
  });

  it('setChanges: 열었을 때와 비교해 넣은 것 · 뺀 것', () => {
    expect(setChanges(['a', 'b'], ['b', 'c'])).toEqual({ added: ['c'], removed: ['a'] });
  });

  it('applySetChanges: 새로 받은 목록에 내 변경만 얹는다 — 그 사이 다른 사람이 넣은 것은 남는다', () => {
    // 열 때 [a, b] → 나는 a 를 빼고 c 를 넣음. 그 사이 다른 사람이 d 를 넣어 새 목록은 [a, b, d]
    expect([...applySetChanges(['a', 'b', 'd'], { added: ['c'], removed: ['a'] })].sort()).toEqual([
      'b',
      'c',
      'd',
    ]);
  });
});
