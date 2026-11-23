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

  it('applySetChanges: 바꿀 수 있는 것(only)이 주어지면 그 밖의 변경은 버린다 — 옛 임시저장이 잠긴 · 없어진 그룹을 건드리지 않게', () => {
    // 잠긴 «전체 관리»(sys)를 뺐다고, 이제 고를 수 없는 그룹(gone)을 넣었다고 적힌 옛 임시저장 — b 를 뺀 것만 얹는다
    expect(
      [
        ...applySetChanges(
          ['sys', 'b'],
          { added: ['gone', 'c'], removed: ['sys', 'b'] },
          ['b', 'c']
        ),
      ].sort()
    ).toEqual(['c', 'sys']);
  });
});
