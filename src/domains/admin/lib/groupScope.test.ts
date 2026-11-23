import { describe, expect, it } from 'vitest';

import { groupChoices, outsideGroups, touchesSystemGroup } from './groupScope';

const GROUPS = [
  { id: 'sys', name: '전체 관리', description: null, is_system: true, is_active: true },
  { id: 'g1', name: '주보', description: '주보 담당', is_system: false, is_active: true },
  { id: 'g2', name: '앨범', description: null, is_system: false, is_active: true },
  { id: 'g3', name: '옛 그룹', description: null, is_system: false, is_active: false },
  { id: 'g4', name: '꺼진 내 그룹', description: null, is_system: false, is_active: false },
];

const FULL = { fullAdmin: true, groupIds: [] };
const MINE = { fullAdmin: false, groupIds: ['g1', 'g4'] };

describe('groupChoices — 사용자 폼의 그룹 고르기', () => {
  it('«전체 관리» 는 켜진 그룹을 모두 고른다 — «전체 관리» 그룹은 누구에게도 고를 거리가 아니다', () => {
    expect(groupChoices(GROUPS, FULL, [])).toEqual([
      { id: 'g1', name: '주보', description: '주보 담당', locked: false },
      { id: 'g2', name: '앨범', description: null, locked: false },
    ]);
  });

  it('대상이 이미 «전체 관리» 구성원이면 잠긴 채 보인다(화면에서 바꾸지 않는다)', () => {
    expect(groupChoices(GROUPS, FULL, ['sys'])[0]).toEqual({
      id: 'sys',
      name: '전체 관리',
      description: null,
      locked: true,
    });
  });

  it('꺼진 그룹은 대상이 이미 속했을 때만 보인다', () => {
    expect(groupChoices(GROUPS, FULL, ['g3']).map(g => g.id)).toEqual(['g1', 'g2', 'g3']);
  });

  it('«전체 관리» 가 아니면 켜진 내 그룹 + 대상이 속한 꺼진 내 그룹만 고른다', () => {
    expect(groupChoices(GROUPS, MINE, [])).toEqual([
      { id: 'g1', name: '주보', description: '주보 담당', locked: false },
    ]);
    expect(groupChoices(GROUPS, MINE, ['g4']).map(g => g.id)).toEqual(['g1', 'g4']);
  });

  it('남의 그룹은 보이지 않는다(남의 그룹에 속한 사람은 관리하지 못해 수정 화면이 열리지 않는다)', () => {
    expect(groupChoices(GROUPS, MINE, ['g2']).map(g => g.id)).toEqual(['g1']);
  });

  it('내 그룹이 없으면 고를 그룹이 없다(그룹 없이 만든다)', () => {
    expect(groupChoices(GROUPS, { fullAdmin: false, groupIds: [] }, [])).toEqual([]);
  });
});

describe('touchesSystemGroup — «전체 관리» 소속을 넣거나 빼는가', () => {
  it('넣거나 빼면 참', () => {
    expect(touchesSystemGroup(['sys'], [], ['g1', 'sys'])).toBe(true);
    expect(touchesSystemGroup(['sys'], ['sys', 'g1'], ['g1'])).toBe(true);
  });

  it('그대로 두거나 다른 그룹만 바꾸면 거짓', () => {
    expect(touchesSystemGroup(['sys'], ['sys'], ['sys', 'g1'])).toBe(false);
    expect(touchesSystemGroup(['sys'], ['g1'], ['g2'])).toBe(false);
    expect(touchesSystemGroup([], ['g1'], ['g2'])).toBe(false);
  });
});

describe('outsideGroups — 넣거나 뺀 그룹 중 내 그룹이 아닌 것', () => {
  it('«전체 관리» 는 늘 없음', () => {
    expect(outsideGroups(FULL, ['g1'], ['sys', 'g2'])).toEqual([]);
  });

  it('넣은 것 · 뺀 것 중 내 그룹이 아닌 것만(그대로 둔 남의 그룹은 괜찮다)', () => {
    expect(outsideGroups(MINE, ['g2', 'g3'], ['g2', 'g1', 'sys'])).toEqual(['sys', 'g3']);
    expect(outsideGroups(MINE, ['g2'], ['g2', 'g1'])).toEqual([]);
  });

  it('같은 id 가 여러 번 와도 한 번만', () => {
    expect(outsideGroups(MINE, [], ['g2', 'g2'])).toEqual(['g2']);
  });
});
