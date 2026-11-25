import { describe, expect, it, vi } from 'vitest';

import { sectionLandingRoute } from './sectionLanding.server';

vi.mock('server-only', () => ({}));
const m = vi.hoisted(() => ({ nav: [] as unknown[], fail: false }));
vi.mock('./siteNavLoad.server', () => ({
  loadSiteNav: async () => {
    if (m.fail) throw new Error('down');
    return m.nav;
  },
}));

const req = new Request('https://sungbok.or.kr/about');

describe('sectionLandingRoute', () => {
  it('켜진 첫 하위로 307', async () => {
    m.nav = [
      { label: '교회소개', slug: 'about', children: [{ label: '담임목사', slug: 'pastor' }] },
    ];
    const r = await sectionLandingRoute('about')(req);
    expect(r.status).toBe(307);
    expect(r.headers.get('location')).toBe('https://sungbok.or.kr/about/pastor');
  });

  it('주소의 쿼리를 이어 준다(예전 next.config 넘김과 같게)', async () => {
    m.nav = [
      { label: '교회소개', slug: 'about', children: [{ label: '담임목사', slug: 'pastor' }] },
    ];
    const r = await sectionLandingRoute('about')(
      new Request('https://sungbok.or.kr/about?utm_source=kakao')
    );
    expect(r.headers.get('location')).toBe('https://sungbok.or.kr/about/pastor?utm_source=kakao');
  });

  it('메뉴를 못 읽으면(DB 장애) 코드 메뉴의 첫 하위로 — 오류 화면이 되지 않게', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    m.fail = true;
    const r = await sectionLandingRoute('news')(new Request('https://sungbok.or.kr/news'));
    m.fail = false;
    expect(r.status).toBe(307);
    expect(r.headers.get('location')).toBe('https://sungbok.or.kr/news/announcements');
  });

  it('섹션이 꺼졌으면(메뉴에 없으면) 404', async () => {
    m.nav = [];
    expect((await sectionLandingRoute('about')(req)).status).toBe(404);
  });
});
