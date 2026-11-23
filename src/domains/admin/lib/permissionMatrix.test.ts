import { describe, expect, it } from 'vitest';

import type { Permission } from './adminNav';
import {
  ACTION_LABELS,
  buildMatrix,
  bulkState,
  checkedKeys,
  columnKeys,
  diffPermissions,
  keysToPermissions,
  type MatrixMenu,
  NO_ACTION,
  permissionKey,
  rowKeys,
  toggleCells,
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
    const rows = buildMatrix(MENUS, []);
    expect(rows.map(r => [r.groupLabel, r.menuKey, r.cells.map(c => c.action)])).toEqual([
      ['콘텐츠', 'bulletin', ['READ', 'UPDATE', 'PURGE']],
      ['시스템', 'users', ['READ', 'CREATE', 'UPDATE', 'HISTORY']],
    ]);
  });

  it('그룹이 가진 권한은 체크(표는 «전체 관리» 만 고치므로 막힌 칸이 없다)', () => {
    const [bulletin] = buildMatrix(MENUS, [{ menuKey: 'bulletin', action: 'READ' }]);
    expect(bulletin.cells).toEqual([
      { action: 'READ', label: '조회', checked: true },
      { action: 'UPDATE', label: '수정', checked: false },
      { action: 'PURGE', label: '영구 삭제', checked: false },
    ]);
  });

  it('기능 이름 7개 · 메뉴에 없는 기능의 까닭', () => {
    expect(ACTION_LABELS).toEqual({
      READ: '조회',
      CREATE: '등록',
      UPDATE: '수정',
      DELETE: '삭제',
      PURGE: '영구 삭제',
      EXPORT: '엑셀로 받기',
      HISTORY: '변경 이력 보기',
    });
    expect(NO_ACTION).toBe('이 메뉴에는 없는 기능입니다');
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
    const rows = buildMatrix(MENUS, [{ menuKey: 'users', action: 'HISTORY' }]);
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

describe('한꺼번에 고르기(줄 · 칸)', () => {
  const rows = buildMatrix(MENUS, [{ menuKey: 'users', action: 'HISTORY' }]);
  const [bulletin, users] = rows;

  it('줄의 key 는 그 메뉴의 모든 칸', () => {
    expect(rowKeys(bulletin)).toEqual(['bulletin:READ', 'bulletin:UPDATE', 'bulletin:PURGE']);
    expect(rowKeys(users)).toEqual(['users:READ', 'users:CREATE', 'users:UPDATE', 'users:HISTORY']);
  });

  it('칸(기능)의 key 는 그 기능이 있는 메뉴만', () => {
    expect(columnKeys(rows, 'READ')).toEqual(['bulletin:READ', 'users:READ']);
    expect(columnKeys(rows, 'PURGE')).toEqual(['bulletin:PURGE']);
    expect(columnKeys(rows, 'DELETE')).toEqual([]);
  });

  it('상태 — 모두 · 일부 · 없음, 칸이 없으면 null', () => {
    const keys = rowKeys(bulletin);
    expect(bulkState(keys, new Set())).toEqual({ checked: false, indeterminate: false });
    expect(bulkState(keys, new Set(['bulletin:READ']))).toEqual({
      checked: false,
      indeterminate: true,
    });
    expect(bulkState(keys, new Set(keys))).toEqual({ checked: true, indeterminate: false });
    expect(bulkState([], new Set(['users:HISTORY']))).toBeNull();
  });

  it('켜고 끄기는 준 key 만 — 다른 칸은 그대로, 원래 집합은 바꾸지 않는다', () => {
    const before = new Set(['users:HISTORY', 'bulletin:READ']);
    const on = toggleCells(rows, before, rowKeys(bulletin), true);
    expect([...on].sort()).toEqual([
      'bulletin:PURGE',
      'bulletin:READ',
      'bulletin:UPDATE',
      'users:HISTORY',
    ]);
    const off = toggleCells(rows, on, rowKeys(bulletin), false);
    expect([...off].sort()).toEqual(['users:HISTORY']);
    expect([...before].sort()).toEqual(['bulletin:READ', 'users:HISTORY']);
  });
});

describe('조회가 있어야 다른 기능(toggleCells)', () => {
  const rows = buildMatrix(MENUS, []);

  it('조회가 아닌 칸을 켜면 그 줄의 조회도 켠다', () => {
    expect([...toggleCells(rows, new Set(), ['bulletin:PURGE'], true)].sort()).toEqual([
      'bulletin:PURGE',
      'bulletin:READ',
    ]);
  });

  it('조회를 끄면 그 줄의 다른 칸도 끈다', () => {
    const before = new Set(['users:READ', 'users:CREATE', 'users:HISTORY', 'bulletin:READ']);
    expect([...toggleCells(rows, before, ['users:READ'], false)]).toEqual(['bulletin:READ']);
  });

  it('조회가 아닌 칸을 끄면 그 칸만 끈다', () => {
    const before = new Set(['bulletin:READ', 'bulletin:UPDATE', 'bulletin:PURGE']);
    expect([...toggleCells(rows, before, ['bulletin:UPDATE'], false)].sort()).toEqual([
      'bulletin:PURGE',
      'bulletin:READ',
    ]);
  });

  it('기능 칸을 한꺼번에 켜면 줄마다 조회도 켠다', () => {
    expect([...toggleCells(rows, new Set(), columnKeys(rows, 'UPDATE'), true)].sort()).toEqual([
      'bulletin:READ',
      'bulletin:UPDATE',
      'users:READ',
      'users:UPDATE',
    ]);
  });

  it('조회 칸을 한꺼번에 끄면 줄마다 다른 칸도 끈다', () => {
    const before = new Set(['users:READ', 'users:CREATE', 'bulletin:READ', 'bulletin:PURGE']);
    expect([...toggleCells(rows, before, columnKeys(rows, 'READ'), false)]).toEqual([]);
  });

  it('표에 없는 칸 key 는 건드리지 않는다', () => {
    expect([...toggleCells(rows, new Set(), ['users:DELETE', 'nope:READ'], true)]).toEqual([]);
  });
});
