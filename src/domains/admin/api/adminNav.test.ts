import { describe, expect, it } from 'vitest';

import { activeNavItem, type AdminNavItem } from './adminNav';

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
