import { describe, expect, it } from 'vitest';

import { siteNav } from '@/shared/config/siteNav';

import { RESOURCE_SECTIONS, resourcePath } from './resourceSections';

describe('resourceSections', () => {
  it('세 분류의 주소 조각은 사이트 메뉴(자료실)의 하위 메뉴와 같다', () => {
    const nav = siteNav.find(s => s.slug === 'resources')!;
    expect(Object.values(RESOURCE_SECTIONS).map(s => s.slug)).toEqual(
      nav.children.map(c => c.slug)
    );
    expect(Object.values(RESOURCE_SECTIONS).map(s => s.title)).toEqual(
      nav.children.map(c => c.label)
    );
  });

  it('목록·자료 주소를 만든다', () => {
    expect(resourcePath('sunday')).toBe('/resources/sunday-sermon');
    expect(resourcePath('seasonal', '0406-24')).toBe('/resources/seasonal-sermon/0406-24');
    expect(resourcePath('series', 'a b')).toBe('/resources/series-sermon/a%20b');
  });
});
