import { describe, expect, it } from 'vitest';

import type { MatrixMenu } from './permissionMatrix';
import {
  departmentNotes,
  type GrantedMenu,
  menuDigest,
  mergeGrants,
  readMenuRows,
  summaryLines,
} from './permissionSummary';

const MENUS: MatrixMenu[] = [
  { key: 'content', label: '콘텐츠', parentKey: null, sort: 10, actions: [] },
  { key: 'system', label: '시스템', parentKey: null, sort: 40, actions: [] },
  { key: 'users', label: '사용자', parentKey: 'system', sort: 10, actions: ['READ', 'UPDATE'] },
  {
    key: 'album',
    label: '교회앨범',
    parentKey: 'content',
    sort: 40,
    actions: ['READ', 'CREATE', 'UPDATE'],
  },
  {
    key: 'bulletin',
    label: '주보',
    parentKey: 'content',
    sort: 10,
    actions: ['READ', 'CREATE', 'UPDATE'],
  },
  {
    key: 'newcomers',
    label: '새가족',
    parentKey: 'content',
    sort: 50,
    actions: ['READ', 'EXPORT', 'UPDATE'],
  },
];

describe('mergeGrants — 고른 그룹의 권한을 합친다', () => {
  it('표와 같은 메뉴 순서로, 기능은 정해진 순서로 합친다 — 권한 없는 메뉴는 뺀다', () => {
    const merged = mergeGrants(MENUS, [
      [
        { menuKey: 'users', action: 'READ' },
        { menuKey: 'bulletin', action: 'UPDATE' },
      ],
      [
        { menuKey: 'bulletin', action: 'READ' },
        { menuKey: 'newcomers', action: 'EXPORT' },
        { menuKey: 'newcomers', action: 'UPDATE' },
      ],
    ]);
    expect(merged).toEqual([
      { menuKey: 'bulletin', label: '주보', actions: ['READ', 'UPDATE'] },
      { menuKey: 'newcomers', label: '새가족', actions: ['UPDATE', 'EXPORT'] },
      { menuKey: 'users', label: '사용자', actions: ['READ'] },
    ]);
  });

  it('그룹을 고르지 않으면 빈 목록', () => {
    expect(mergeGrants(MENUS, [])).toEqual([]);
  });
});

const GRANTED: GrantedMenu[] = [
  { menuKey: 'bulletin', label: '주보', actions: ['READ', 'CREATE', 'UPDATE'] },
  { menuKey: 'album', label: '교회앨범', actions: ['READ', 'CREATE', 'UPDATE'] },
  { menuKey: 'users', label: '사용자', actions: ['READ'] },
];

describe('summaryLines — 같은 기능 묶음끼리 메뉴를 묶은 쉬운 줄', () => {
  it('기능이 같은 메뉴를 한 줄로 묶고 기능 이름표로 적는다', () => {
    expect(summaryLines(GRANTED)).toEqual([
      { menus: ['주보', '교회앨범'], actions: ['조회', '등록', '수정'] },
      { menus: ['사용자'], actions: ['조회'] },
    ]);
  });

  it('메뉴 이름 뒤에 덧붙일 말(담당 부서)을 붙인다', () => {
    expect(summaryLines(GRANTED, departmentNotes('영아부'))[1]).toEqual({
      menus: ['사용자(영아부)'],
      actions: ['조회'],
    });
    expect(departmentNotes('')).toEqual({});
  });
});

describe('menuDigest — 그룹 카드의 한 줄', () => {
  it('메뉴 이름을 셋까지, 넘으면 «외 N개»', () => {
    expect(menuDigest(GRANTED)).toBe('주보 · 교회앨범 · 사용자');
    expect(menuDigest([...GRANTED, { menuKey: 'x', label: '새가족', actions: ['READ'] }])).toBe(
      '주보 · 교회앨범 · 사용자 외 1개'
    );
    expect(menuDigest([])).toBe('');
  });
});

describe('readMenuRows — 페이지가 읽은 메뉴 행(그룹 권한을 붙여)을 표 메뉴와 그룹별 권한으로', () => {
  it('상위 메뉴 key · 덮어쓴 이름을 풀고 그룹마다 권한을 모은다', () => {
    const { menus, grants } = readMenuRows([
      {
        id: 'm1',
        key: 'system',
        parent_id: null,
        label: null,
        default_label: '시스템',
        sort: 40,
        actions: [],
        group_permissions: [],
      },
      {
        id: 'm2',
        key: 'users',
        parent_id: 'm1',
        label: '사람',
        default_label: '사용자',
        sort: 10,
        actions: ['READ', 'UPDATE'],
        group_permissions: [
          { group_id: 'g1', action: 'READ' },
          { group_id: 'g2', action: 'UPDATE' },
          { group_id: 'g1', action: 'UPDATE' },
        ],
      },
    ]);
    expect(menus).toEqual([
      { key: 'system', label: '시스템', parentKey: null, sort: 40, actions: [] },
      { key: 'users', label: '사람', parentKey: 'system', sort: 10, actions: ['READ', 'UPDATE'] },
    ]);
    expect(grants).toEqual({
      g1: [
        { menuKey: 'users', action: 'READ' },
        { menuKey: 'users', action: 'UPDATE' },
      ],
      g2: [{ menuKey: 'users', action: 'UPDATE' }],
    });
  });
});
