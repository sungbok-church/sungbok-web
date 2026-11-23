import { describe, expect, it } from 'vitest';

import type { Permission } from './adminNav';
import {
  ACTION_LABELS,
  buildMatrix,
  checkedKeys,
  diffPermissions,
  keysToPermissions,
  type MatrixMenu,
  permissionKey,
} from './permissionMatrix';

const MENUS: MatrixMenu[] = [
  { key: 'system', label: '시스템', parentKey: null, sort: 40, actions: [] },
  { key: 'content', label: '콘텐츠', parentKey: null, sort: 10, actions: [] },
  { key: 'dashboard', label: '첫 화면', parentKey: null, sort: 0, actions: [] },
  {
    key: 'users',
    label: '사용자',
    parentKey: 'system',
    sort: 10,
    actions: ['READ', 'CREATE', 'UPDATE', 'HISTORY'],
  },
  {
    key: 'bulletin',
    label: '주보',
    parentKey: 'content',
    sort: 10,
    actions: ['READ', 'UPDATE', 'PURGE'],
  },
];

describe('buildMatrix', () => {
  it('기능이 있는 화면만, 묶음 순서 · 화면 순서대로, 칸은 그 화면의 기능만', () => {
    const rows = buildMatrix(MENUS, [], [], false);
    expect(rows.map(r => [r.groupLabel, r.menuKey, r.cells.map(c => c.action)])).toEqual([
      ['콘텐츠', 'bulletin', ['READ', 'UPDATE', 'PURGE']],
      ['시스템', 'users', ['READ', 'CREATE', 'UPDATE', 'HISTORY']],
    ]);
  });

  it('그룹이 가진 권한은 체크, 내가 없는 권한은 고칠 수 없다(전체 관리는 모두 고친다)', () => {
    const granted: Permission[] = [{ menuKey: 'bulletin', action: 'READ' }];
    const mine: Permission[] = [
      { menuKey: 'bulletin', action: 'READ' },
      { menuKey: 'bulletin', action: 'UPDATE' },
    ];
    const [bulletin] = buildMatrix(MENUS, granted, mine, false);
    expect(bulletin.cells).toEqual([
      { action: 'READ', label: '조회', checked: true, disabled: false },
      { action: 'UPDATE', label: '수정', checked: false, disabled: false },
      { action: 'PURGE', label: '완전 삭제', checked: false, disabled: true },
    ]);
    expect(buildMatrix(MENUS, granted, [], true)[0].cells.every(c => !c.disabled)).toBe(true);
  });

  it('기능 이름 7개', () => {
    expect(ACTION_LABELS).toEqual({
      READ: '조회',
      CREATE: '등록',
      UPDATE: '수정',
      DELETE: '삭제',
      PURGE: '완전 삭제',
      EXPORT: '엑셀 다운로드',
      HISTORY: '이력조회',
    });
  });
});

describe('diffPermissions', () => {
  it('넣을 것 · 뺄 것만', () => {
    const before: Permission[] = [
      { menuKey: 'bulletin', action: 'READ' },
      { menuKey: 'users', action: 'READ' },
    ];
    const after: Permission[] = [
      { menuKey: 'bulletin', action: 'READ' },
      { menuKey: 'bulletin', action: 'UPDATE' },
    ];
    expect(diffPermissions(before, after)).toEqual({
      add: [{ menuKey: 'bulletin', action: 'UPDATE' }],
      remove: [{ menuKey: 'users', action: 'READ' }],
    });
  });
});

describe('칸 key ↔ 권한', () => {
  it('체크된 칸만 «메뉴:기능» key 로', () => {
    const rows = buildMatrix(MENUS, [{ menuKey: 'users', action: 'HISTORY' }], [], true);
    expect(checkedKeys(rows)).toEqual(['users:HISTORY']);
    expect(permissionKey('bulletin', 'READ')).toBe('bulletin:READ');
  });

  it('key 를 권한으로 되돌린다(모양이 틀린 key 는 버린다)', () => {
    expect(
      keysToPermissions(['users:READ', 'bulletin:PURGE', 'broken', 'x:nope', 'users:read'])
    ).toEqual([
      { menuKey: 'users', action: 'READ' },
      { menuKey: 'bulletin', action: 'PURGE' },
    ]);
  });
});
