import { describe, expect, it } from 'vitest';

import { groupCreateSchema, groupSaveSchema, groupUpdateSchema } from './groupInput';

describe('groupInput', () => {
  it('이름은 1~50자, 설명은 200자까지(빈 설명은 null)', () => {
    expect(groupCreateSchema.parse({ name: ' 주보 담당 ', description: ' ' })).toEqual({
      name: '주보 담당',
      description: null,
      permissions: [], // 처음 권한을 안 주면 빈 표
    });
    expect(
      groupCreateSchema.safeParse({ name: '', description: '' }).error?.issues[0].message
    ).toBe('그룹 이름을 넣어 주세요.');
    expect(groupCreateSchema.safeParse({ name: '가', description: 'ㄱ'.repeat(201) }).success).toBe(
      false
    );
  });

  it('고칠 때는 id · 열었던 시각 · 사용 여부를 함께', () => {
    expect(
      groupUpdateSchema.parse({
        id: '0190a0b0-0000-7000-8000-000000000001',
        updatedAt: 't',
        name: '가',
        description: null,
        isActive: false,
      })
    ).toMatchObject({ isActive: false });
  });

  it('권한은 (메뉴 key, 정해진 기능) 목록 — 고칠 때는 열었을 때의 표도 함께, 표가 없으면(«전체 관리») 둘 다 빼도 된다', () => {
    const base = {
      id: '0190a0b0-0000-7000-8000-000000000001',
      updatedAt: 't',
      name: '가',
      description: null,
      isActive: true,
    };
    expect(
      groupSaveSchema.safeParse({
        ...base,
        permissions: [{ menuKey: 'bulletin', action: 'READ' }],
        seenPermissions: [],
      }).success
    ).toBe(true);
    expect(
      groupSaveSchema.safeParse({ ...base, permissions: [{ menuKey: 'bulletin', action: 'drop' }] })
        .success
    ).toBe(false);
    expect(groupSaveSchema.parse(base)).not.toHaveProperty('permissions');
  });
});
