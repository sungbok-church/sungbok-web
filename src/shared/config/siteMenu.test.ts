import { describe, expect, it } from 'vitest';

import { mergeSiteNav, menuLabel, sectionLanding, type SiteMenuOverride } from './siteMenu';
import type { NavSection } from './siteNav';

const NAV: readonly NavSection[] = [
  {
    label: '교회소개',
    slug: 'about',
    children: [
      { label: '원로목사', slug: 'pastor-emeritus' },
      { label: '담임목사', slug: 'pastor' },
      { label: '연혁', slug: 'history' },
    ],
  },
  { label: '예배', slug: 'worship', children: [{ label: '주일예배', slug: 'sunday' }] },
  { label: '찾아오시는 길', slug: 'location' },
];

const row = (path: string, o: Partial<SiteMenuOverride> = {}): SiteMenuOverride => ({
  path,
  label: null,
  sort: 0,
  active: true,
  ...o,
});

describe('mergeSiteNav', () => {
  it('DB 값이 없으면 코드 그대로', () => {
    expect(mergeSiteNav(NAV, [])).toEqual(NAV);
  });

  it('이름을 덮어쓰고, 비어 있으면 코드 이름', () => {
    const nav = mergeSiteNav(NAV, [
      row('/about', { label: '우리 교회', sort: 10 }),
      row('/about/history', { label: '교회 연혁', sort: 30 }),
      row('/worship', { label: null, sort: 20 }),
    ]);
    expect(nav[0].label).toBe('우리 교회');
    expect(nav[0].children?.[2].label).toBe('교회 연혁');
    expect(nav[1].label).toBe('예배');
  });

  it('DB 순서대로 — 같은 순서면 코드 순서, DB 에 없는 항목은 코드 자리', () => {
    const nav = mergeSiteNav(NAV, [
      row('/about', { sort: 30 }),
      row('/worship', { sort: 10 }),
      row('/location', { sort: 20 }),
      row('/about/pastor-emeritus', { sort: 20 }),
      row('/about/pastor', { sort: 10 }),
    ]);
    expect(nav.map(s => s.slug)).toEqual(['worship', 'location', 'about']);
    // 연혁은 DB 에 없다 → 코드 자리(세 번째 = 30)
    expect(nav[2].children?.map(c => c.slug)).toEqual(['pastor', 'pastor-emeritus', 'history']);
  });

  it('끈 메뉴는 빠지고, 하위가 모두 꺼진 상위도 빠진다', () => {
    const nav = mergeSiteNav(NAV, [
      row('/about/history', { active: false, sort: 30 }),
      row('/worship/sunday', { active: false, sort: 10 }),
      row('/location', { active: false, sort: 30 }),
    ]);
    expect(nav.map(s => s.slug)).toEqual(['about']);
    expect(nav[0].children?.map(c => c.slug)).toEqual(['pastor-emeritus', 'pastor']);
  });

  it('상위를 끄면 하위가 켜져 있어도 빠진다', () => {
    const nav = mergeSiteNav(NAV, [row('/about', { active: false, sort: 10 })]);
    expect(nav.map(s => s.slug)).toEqual(['worship', 'location']);
  });

  it('코드에 없는 DB 줄은 무시한다(페이지가 있는지는 코드가 정한다)', () => {
    expect(mergeSiteNav(NAV, [row('/about/gone', { label: '없는 페이지', sort: 1 })])).toEqual(NAV);
  });
});

describe('menuLabel — 켜져 있는 메뉴의 이름(꺼졌거나 없으면 undefined)', () => {
  const nav = mergeSiteNav(NAV, [
    row('/about/history', { label: '교회 연혁', sort: 30 }),
    row('/about/pastor', { active: false, sort: 20 }),
  ]);
  it('하위 · 하위 없는 상위', () => {
    expect(menuLabel(nav, '/about/history')).toBe('교회 연혁');
    expect(menuLabel(nav, '/location')).toBe('찾아오시는 길');
  });
  it('끈 메뉴 · 없는 주소', () => {
    expect(menuLabel(nav, '/about/pastor')).toBeUndefined();
    expect(menuLabel(nav, '/about/nope')).toBeUndefined();
  });
});

describe('sectionLanding — 상위 주소가 넘어갈 곳(켜진 첫 하위)', () => {
  it('켜진 첫 하위', () => {
    const nav = mergeSiteNav(NAV, [row('/about/pastor-emeritus', { active: false, sort: 10 })]);
    expect(sectionLanding(nav, 'about')).toBe('/about/pastor');
  });
  it('상위가 꺼졌거나 하위가 없으면 undefined', () => {
    const nav = mergeSiteNav(NAV, [row('/worship', { active: false, sort: 20 })]);
    expect(sectionLanding(nav, 'worship')).toBeUndefined();
    expect(sectionLanding(nav, 'location')).toBeUndefined();
  });
});
