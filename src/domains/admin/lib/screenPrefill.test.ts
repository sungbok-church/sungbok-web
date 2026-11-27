import { describe, expect, it } from 'vitest';

import type { AdminNavGroup } from './adminNav';
import { prefillPaths, shouldPrefill } from './screenPrefill';

const nav: AdminNavGroup[] = [
  { key: 'dashboard', label: '', items: [{ key: 'dashboard', href: '/admin', label: '첫 화면' }] },
  {
    key: 'content',
    label: '콘텐츠',
    items: [
      { key: 'bulletin', href: '/admin/bulletin', label: '주보' },
      { key: 'categories', href: '/admin/categories', label: '분류 관리' },
    ],
  },
  {
    key: 'system',
    label: '시스템',
    items: [
      { key: 'codes', href: '/admin/codes', label: '코드 관리' },
      { key: 'codes-copy', href: '/admin/codes', label: '같은 주소' },
    ],
  },
];

describe('prefillPaths — 미리 받아 둘 화면(왼쪽 메뉴의 주소)', () => {
  it('메뉴 순서대로, 같은 주소는 한 번만', () => {
    expect(prefillPaths(nav)).toEqual([
      '/admin',
      '/admin/bulletin',
      '/admin/categories',
      '/admin/codes',
    ]);
  });

  it('관리자 주소가 아니면 넣지 않는다', () => {
    const odd: AdminNavGroup[] = [
      {
        key: 'x',
        label: '',
        items: [
          { key: 'site', href: '/', label: '홈' },
          { key: 'ext', href: 'https://example.com/admin', label: '바깥' },
          { key: 'look', href: '/administrator', label: '비슷한 주소' },
        ],
      },
    ];
    expect(prefillPaths(odd)).toEqual([]);
  });
});

describe('shouldPrefill — 이 배포에서 이 브라우저가 아직 미리 받지 않았는가', () => {
  it('배포 표시가 없으면(로컬 개발) 받지 않는다', () => {
    expect(shouldPrefill(null, '')).toBe(false);
  });

  it('처음이거나 배포가 바뀌었으면 받는다', () => {
    expect(shouldPrefill(null, 'dpl_b')).toBe(true);
    expect(shouldPrefill('dpl_a', 'dpl_b')).toBe(true);
  });

  it('이 배포에서 이미 받았으면 받지 않는다', () => {
    expect(shouldPrefill('dpl_b', 'dpl_b')).toBe(false);
  });
});
