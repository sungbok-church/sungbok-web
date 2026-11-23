import { describe, expect, it } from 'vitest';

import {
  activeNavItem,
  type AdminNavItem,
  buildAdminNav,
  buildBreadcrumbs,
  can,
  flattenNav,
  type MenuRow,
  type Permission,
  screenLabel,
} from './adminNav';

const ITEMS: AdminNavItem[] = [
  { key: 'dashboard', href: '/admin', label: '첫 화면' },
  { key: 'bulletin', href: '/admin/bulletin', label: '주보' },
  { key: 'bulletin-archive', href: '/admin/bulletin-archive', label: '지난 주보' },
];

describe('activeNavItem', () => {
  it.each([
    ['/admin', 'dashboard'],
    ['/admin/bulletin', 'bulletin'],
    ['/admin/bulletin/new', 'bulletin'], // 등록·수정 화면에서도 그 메뉴가 켜진다
    ['/admin/bulletin/2026-11-15', 'bulletin'],
    ['/admin/bulletin-archive', 'bulletin-archive'], // 앞부분만 같은 다른 메뉴와 섞이지 않는다
  ])('%s → %s', (pathname, key) => {
    expect(activeNavItem(pathname, ITEMS)?.key).toBe(key);
  });

  it('첫 화면은 자기 주소일 때만 켜진다(모든 주소가 /admin 으로 시작한다)', () => {
    expect(activeNavItem('/admin/unknown', ITEMS)).toBeUndefined();
  });

  it('메뉴가 없으면 undefined', () => {
    expect(activeNavItem('/admin', [])).toBeUndefined();
  });
});

const menu = (over: Partial<MenuRow> & Pick<MenuRow, 'id' | 'key' | 'defaultLabel'>): MenuRow => ({
  parentId: null,
  label: null,
  path: null,
  sort: 0,
  isActive: true,
  ...over,
});

const MENUS: MenuRow[] = [
  menu({ id: 'm0', key: 'dashboard', defaultLabel: '첫 화면', path: '/admin', sort: 0 }),
  menu({ id: 'g1', key: 'content', defaultLabel: '콘텐츠', sort: 10 }),
  menu({ id: 'g2', key: 'system', defaultLabel: '시스템', sort: 40 }),
  menu({
    id: 'c2',
    key: 'album',
    defaultLabel: '교회앨범',
    path: '/admin/album',
    parentId: 'g1',
    sort: 40,
  }),
  menu({
    id: 'c1',
    key: 'bulletin',
    defaultLabel: '주보',
    label: '주보 관리',
    path: '/admin/bulletin',
    parentId: 'g1',
    sort: 10,
  }),
  menu({
    id: 'c3',
    key: 'garden',
    defaultLabel: '성복의 뜰',
    path: '/admin/garden',
    parentId: 'g1',
    sort: 30,
    isActive: false,
  }),
  menu({
    id: 's1',
    key: 'users',
    defaultLabel: '사용자',
    path: '/admin/users',
    parentId: 'g2',
    sort: 10,
  }),
];

describe('can', () => {
  const perms: Permission[] = [{ menuKey: 'bulletin', action: 'READ' }];
  it('가진 권한이면 참, 아니면 거짓', () => {
    expect(can(perms, 'bulletin', 'READ')).toBe(true);
    expect(can(perms, 'bulletin', 'UPDATE')).toBe(false);
    expect(can(perms, 'album', 'READ')).toBe(false);
  });
});

const read = (...keys: string[]): Permission[] =>
  keys.map(menuKey => ({ menuKey, action: 'READ' }));

describe('buildAdminNav', () => {
  it('조회 권한이 있고 사용 중인 화면만, 묶음별 · 순서대로, 바꾼 이름으로', () => {
    expect(buildAdminNav(MENUS, read('bulletin', 'album', 'garden'))).toEqual([
      {
        key: 'dashboard',
        label: '',
        items: [{ key: 'dashboard', href: '/admin', label: '첫 화면' }],
      },
      {
        key: 'content',
        label: '콘텐츠',
        items: [
          { key: 'bulletin', href: '/admin/bulletin', label: '주보 관리' },
          { key: 'album', href: '/admin/album', label: '교회앨범' },
        ],
      },
    ]);
  });

  it('첫 화면은 권한이 없어도 보이고, 화면이 하나도 없는 묶음은 뺀다', () => {
    expect(buildAdminNav(MENUS, [])).toEqual([
      {
        key: 'dashboard',
        label: '',
        items: [{ key: 'dashboard', href: '/admin', label: '첫 화면' }],
      },
    ]);
  });

  it('조회가 아닌 권한만으로는 메뉴가 보이지 않는다', () => {
    const nav = buildAdminNav(MENUS, [{ menuKey: 'users', action: 'UPDATE' }]);
    expect(nav.flatMap(g => g.items).map(i => i.key)).toEqual(['dashboard']);
  });

  it('flattenNav 는 묶음을 펼친 항목 목록', () => {
    expect(flattenNav(buildAdminNav(MENUS, read('users'))).map(i => i.key)).toEqual([
      'dashboard',
      'users',
    ]);
  });

  it('화면이 아직 없는 메뉴는 보이지 않는다 — «준비 중» 으로 늘어놓지 않고, 화면이 하나도 없는 묶음도 뺀다', () => {
    const nav = buildAdminNav(MENUS, read('bulletin', 'users'), new Set(['dashboard', 'users']));
    expect(nav.find(g => g.key === 'content')).toBeUndefined();
    expect(flattenNav(nav).map(i => i.key)).toEqual(['dashboard', 'users']);
    expect(nav.flatMap(g => g.items).every(i => !('ready' in i))).toBe(true);
  });
});

describe('buildBreadcrumbs', () => {
  const NAV = buildAdminNav(MENUS, read('users', 'bulletin'));

  it('대메뉴 › 메뉴', () => {
    expect(buildBreadcrumbs('/admin/users', NAV)).toEqual([
      { label: '시스템' },
      { label: '사용자', href: '/admin/users' },
    ]);
  });

  it('등록 · 상세 · 수정 화면은 끝에 칸이 더 붙는다(상세는 수정 화면에서 누를 수 있게)', () => {
    const ID = '0190a0b0-0000-7000-8000-000000000001';
    expect(buildBreadcrumbs('/admin/users/new', NAV).at(-1)).toEqual({ label: '새로 만들기' });
    expect(buildBreadcrumbs(`/admin/users/${ID}`, NAV).at(-1)).toEqual({ label: '상세' });
    expect(buildBreadcrumbs(`/admin/users/${ID}/edit`, NAV).slice(-2)).toEqual([
      { label: '상세', href: `/admin/users/${ID}` },
      { label: '수정' },
    ]);
  });

  it('첫 화면 · 모르는 주소', () => {
    expect(buildBreadcrumbs('/admin', NAV)).toEqual([{ label: '첫 화면', href: '/admin' }]);
    expect(buildBreadcrumbs('/admin/nope', NAV)).toEqual([{ label: '관리자' }]);
  });
});

describe('screenLabel', () => {
  it('메뉴 관리에서 바꾼 이름을 화면 제목으로 쓴다(없으면 기본값)', () => {
    const nav = buildAdminNav(MENUS, read('bulletin'));
    expect(screenLabel(nav, 'bulletin', '주보')).toBe('주보 관리');
    expect(screenLabel(nav, 'users', '사용자')).toBe('사용자');
  });
});
