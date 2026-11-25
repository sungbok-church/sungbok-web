import { findChild, findSection, type NavChild, type NavSection } from './siteNav';

/**
 * 홈페이지 메뉴의 DB 덮어쓰기(설계 6.5) — 어떤 페이지가 있는지는 코드(siteNav)가 정본이고, DB `menus(area = 'SITE')` 는
 * 이름 · 순서 · 사용 여부만 덮어쓴다. 주소로 짝을 짓는다(`/about` · `/about/staff`).
 */
export type SiteMenuOverride = {
  path: string;
  /** 화면에서 바꾼 이름 — 없으면 코드 이름 */
  label: string | null;
  sort: number;
  active: boolean;
};

type Ordered<T> = { item: T; sort: number; index: number };

/** 순서대로 — DB 순서, 같으면(또는 DB 에 없으면 코드 자리 (i+1)·10) 코드 순서 */
const arrange = <T>(
  items: readonly T[],
  path: (t: T) => string,
  byPath: Map<string, SiteMenuOverride>
) =>
  items
    .map((item, index): Ordered<T> & { o?: SiteMenuOverride } => {
      const o = byPath.get(path(item));
      return { item, o, sort: o?.sort ?? (index + 1) * 10, index };
    })
    .filter(x => x.o?.active !== false)
    .sort((a, b) => a.sort - b.sort || a.index - b.index);

/**
 * 코드 메뉴 + DB 덮어쓰기 → 공개 화면이 그릴 메뉴. 끈 메뉴는 빠지고, 하위가 모두 꺼진 상위도 빠진다.
 * 코드에 없는 DB 줄은 무시한다. DB 를 읽지 못했으면 빈 목록을 넘겨 코드 그대로 그린다.
 */
export const mergeSiteNav = (
  nav: readonly NavSection[],
  rows: readonly SiteMenuOverride[]
): NavSection[] => {
  const byPath = new Map(rows.map(r => [r.path, r]));
  return arrange(nav, s => `/${s.slug}`, byPath).flatMap(({ item: s, o }) => {
    const label = o?.label || s.label;
    if (!s.children?.length) return [{ ...s, label }];
    const children = arrange(s.children, c => `/${s.slug}/${c.slug}`, byPath).map(
      ({ item: c, o: co }): NavChild => ({ ...c, label: co?.label || c.label })
    );
    return children.length ? [{ ...s, label, children }] : [];
  });
};

/** 공개 메뉴의 캐시 태그 — 공개 읽기(cacheTag)와 관리자 저장(updateTag)이 같은 이름을 쓴다 */
export const SITE_MENU_TAG = 'site-menus';

/** 이 주소의 메뉴가 켜져 있으면 그 이름(페이지 제목) — 꺼졌거나 없으면 undefined(없는 페이지) */
export const menuLabel = (nav: readonly NavSection[], path: string): string | undefined => {
  const section = findSection(path, nav);
  if (!section) return undefined;
  if (path.split('/').filter(Boolean).length === 1)
    return section.children?.length ? undefined : section.label;
  return findChild(path, nav)?.label;
};

/** 상위 주소(`/about`)가 넘어갈 곳 — 켜진 첫 하위. 상위가 꺼졌거나 하위가 없으면 undefined */
export const sectionLanding = (nav: readonly NavSection[], slug: string): string | undefined => {
  const first = nav.find(s => s.slug === slug)?.children?.[0];
  return first ? `/${slug}/${first.slug}` : undefined;
};
