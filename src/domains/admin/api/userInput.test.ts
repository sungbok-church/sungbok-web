import { describe, expect, it } from 'vitest';

import { userCreateSchema, userUpdateSchema } from './userInput';

const G = '0190a0b0-0000-7000-8000-000000000001';

describe('userCreateSchema', () => {
  it('이름 · 이메일 · 그룹 · 부서(없어도 됨)', () => {
    expect(
      userCreateSchema.parse({
        name: ' 홍길동 ',
        email: ' Hong@Church.KR ',
        groupIds: [G],
        department: '',
      })
    ).toEqual({ name: '홍길동', email: 'hong@church.kr', groupIds: [G], department: null });
  });

  it('부서는 정해진 8개 중 하나', () => {
    expect(
      userCreateSchema.parse({ name: '가', email: 'a@b.kr', groupIds: [], department: 'INFANT' })
        .department
    ).toBe('INFANT');
    expect(
      userCreateSchema.safeParse({ name: '가', email: 'a@b.kr', groupIds: [], department: 'adult' })
        .success
    ).toBe(false);
  });

  it('틀린 값의 문구', () => {
    const r = userCreateSchema.safeParse({
      name: '',
      email: 'not-mail',
      groupIds: ['x'],
      department: null,
    });
    expect(r.error?.issues.map(i => `${String(i.path[0])}:${i.message}`)).toEqual([
      'name:이름을 넣어 주세요.',
      'email:이메일 주소를 확인해 주세요.',
      'groupIds:그룹을 다시 골라 주세요.',
    ]);
  });
});

describe('userUpdateSchema', () => {
  it('열었던 시각(updatedAt) · 열었을 때의 그룹 목록과 사용 여부를 함께 받는다', () => {
    const input = {
      id: G,
      updatedAt: '2026-11-19T10:00:00.123456+00:00',
      name: '홍길동',
      groupIds: [],
      department: null,
      isActive: false,
    };
    expect(userUpdateSchema.parse({ ...input, seenGroupIds: [G] })).toMatchObject({
      id: G,
      isActive: false,
      seenGroupIds: [G],
    });
    // 열었을 때의 그룹 목록이 없으면 받지 않는다 — 남의 변경을 덮을 수 있다
    expect(userUpdateSchema.safeParse(input).success).toBe(false);
  });
});
