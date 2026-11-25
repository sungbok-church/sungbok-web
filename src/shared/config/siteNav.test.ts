import {
  buildRedirects,
  childHref,
  findChild,
  findSection,
  sectionHref,
  sections,
  siteNav,
} from '@/shared/config/siteNav';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// 네비 단일 소스의 파생 함수. 경로 판정은 세그먼트 단위라 접두사만 같은 경로에 속지 않고,
// 끝 슬래시·쿼리·해시가 붙어도 같은 결과를 낸다.
const about = sections.find(s => s.slug === 'about')!;
const worship = sections.find(s => s.slug === 'worship')!;
const location = sections.find(s => s.slug === 'location')!;

describe('siteNav 데이터 무결성', () => {
  it('상위 섹션은 스펙 순서대로 6개다', () => {
    expect(siteNav.map(s => s.slug)).toEqual([
      'about',
      'worship',
      'next-generation',
      'news',
      'resources',
      'location',
    ]);
  });

  it('상위 슬러그와 각 섹션 안의 하위 슬러그는 중복이 없다', () => {
    const top = siteNav.map(s => s.slug);
    expect(new Set(top).size).toBe(top.length);
    for (const s of sections) {
      const subs = (s.children ?? []).map(c => c.slug);
      expect(new Set(subs).size, s.slug).toBe(subs.length);
    }
  });

  it('슬러그는 소문자·숫자·하이픈만 쓴다', () => {
    const all = sections.flatMap(s => [s.slug, ...(s.children ?? []).map(c => c.slug)]);
    for (const slug of all) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('예배 섹션은 영상 메뉴 4개뿐이고 첫 하위는 주일예배다(예배 안내는 찾아오시는 길로 옮김, 2026-11-12)', () => {
    expect(worship.children?.map(c => c.slug)).toEqual(['sunday', 'friday', 'special', 'weekday']);
  });
});

describe('sectionHref / childHref', () => {
  it('하위가 있는 섹션은 첫 하위 경로를 돌려준다', () => {
    expect(sectionHref(about)).toBe('/about/pastor-emeritus');
    expect(sectionHref(worship)).toBe('/worship/sunday');
  });

  it('하위가 없는 섹션은 자기 경로를 돌려준다', () => {
    expect(sectionHref(location)).toBe('/location');
  });

  it('childHref 는 /{section}/{child} 다', () => {
    expect(childHref(about, about.children![1])).toBe('/about/pastor');
  });
});

describe('findSection', () => {
  it('경로 첫 세그먼트로 섹션을 찾는다', () => {
    expect(findSection('/worship/sunday')?.slug).toBe('worship');
    expect(findSection('/location')?.slug).toBe('location');
  });

  it('홈과 미등록 경로는 undefined 다', () => {
    expect(findSection('/')).toBeUndefined();
    expect(findSection('/nextgen-preview')).toBeUndefined();
  });

  it('접두사만 같은 경로에 속지 않는다', () => {
    expect(findSection('/newsletter')).toBeUndefined();
    expect(findSection('/about-us')).toBeUndefined();
  });

  it('끝 슬래시·쿼리·해시가 있어도 같은 결과다', () => {
    expect(findSection('/about/pastor/')?.slug).toBe('about');
    expect(findSection('/worship/sunday?v=2')?.slug).toBe('worship');
    expect(findSection('/news/album#top')?.slug).toBe('news');
  });
});

describe('findChild', () => {
  it('두 번째 세그먼트로 하위 항목을 찾는다', () => {
    expect(findChild('/about/pastor')).toEqual({ label: '담임목사', slug: 'pastor' });
    expect(findChild('/worship/sunday/')).toEqual({ label: '주일예배', slug: 'sunday' });
  });

  it('하위가 없거나 미등록이면 undefined 다', () => {
    expect(findChild('/location')).toBeUndefined();
    expect(findChild('/about')).toBeUndefined();
    expect(findChild('/about/nope')).toBeUndefined();
    expect(findChild('/')).toBeUndefined();
  });
});

describe('buildRedirects', () => {
  it('옛 주소 3개만, 모두 permanent=false — 상위 메뉴 주소는 접속 때 넘기는 페이지가 맡는다', () => {
    expect(buildRedirects()).toEqual([
      { source: '/worship-video', destination: '/worship/sunday', permanent: false },
      { source: '/map', destination: '/location', permanent: false },
      { source: '/worship/guide', destination: '/location#worship-times', permanent: false },
    ]);
  });

  it('상위 메뉴 주소는 넘김 목록에 없다', () => {
    expect(buildRedirects().some(r => sections.some(s => r.source === `/${s.slug}`))).toBe(false);
  });
});

// 메뉴 항목 ↔ 라우트 파일 정합성. 메뉴에만 추가하고 page.tsx 를 빠뜨리면 드롭다운이 404 로 간다.
describe('라우트 정합성 (siteNav ↔ src/app/(site))', () => {
  const appDir = join(process.cwd(), 'src/app/(site)');
  const pages = sections.flatMap(s =>
    s.children?.length
      ? s.children.map(
          c => [`/${s.slug}/${c.slug}`, join(appDir, s.slug, c.slug, 'page.tsx')] as const
        )
      : [[`/${s.slug}`, join(appDir, s.slug, 'page.tsx')] as const]
  );

  it.each(pages)('%s → page.tsx 존재', (_href, file) => {
    expect(existsSync(file)).toBe(true);
  });

  it.each(sections.filter(s => s.children?.length).map(s => [s.slug] as const))(
    '%s 섹션 → layout.tsx 존재',
    slug => {
      expect(existsSync(join(appDir, slug, 'layout.tsx'))).toBe(true);
    }
  );

  // 끈 메뉴를 404 로 끊고 제목을 메뉴 이름으로 — 메뉴 페이지 폴더마다 siteMenuRoute 레이아웃이 있어야 한다(설계 6.5)
  it.each(pages)('%s → siteMenuRoute 레이아웃', (href, file) => {
    const layout = join(file, '..', 'layout.tsx');
    expect(existsSync(layout)).toBe(true);
    expect(readFileSync(layout, 'utf8')).toContain(`siteMenuRoute('${href}')`);
  });

  // 상위 메뉴 주소는 켜진 첫 하위로 넘기는 경로 처리기
  it.each(sections.filter(s => s.children?.length).map(s => [s.slug] as const))(
    '%s 섹션 → sectionLandingRoute',
    slug => {
      const route = join(appDir, slug, 'route.ts');
      expect(readFileSync(route, 'utf8')).toContain(`sectionLandingRoute('${slug}')`);
    }
  );
});
