import { describe, expect, it } from 'vitest';

import { groupCreateSchema, groupPermissionsSchema, groupUpdateSchema } from './groupInput';

describe('groupInput', () => {
  it('이름은 1~50자, 설명은 200자까지(빈 설명은 null)', () => {
    expect(groupCreateSchema.parse({ name: ' 주보 담당 ', description: ' ' })).toEqual({
      name: '주보 담당',
      description: null,
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

  it('권한은 (메뉴 key, 정해진 기능) 목록', () => {
    expect(
      groupPermissionsSchema.safeParse({
        groupId: '0190a0b0-0000-7000-8000-000000000001',
        permissions: [{ menuKey: 'bulletin', action: 'READ' }],
      }).success
    ).toBe(true);
    expect(
      groupPermissionsSchema.safeParse({
        groupId: '0190a0b0-0000-7000-8000-000000000001',
        permissions: [{ menuKey: 'bulletin', action: 'drop' }],
      }).success
    ).toBe(false);
  });
});
