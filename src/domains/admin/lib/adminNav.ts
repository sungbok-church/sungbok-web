// 관리자 왼쪽 메뉴 — DB 의 menus(area = admin)와 로그인한 사람의 권한으로 만든다(설계 6.4 · 6.5).
// 메뉴 행과 권한 목록은 서버(adminContext.server.ts)가 읽어 넘기고, 여기서는 «무엇을 보일지» 만 정한다.
import type { Database } from '@/shared/api/supabase/database.types';

export type PermissionAction = Database['public']['Enums']['permission_action'];

/** 로그인한 사람이 가진 권한 한 칸(`rpc('my_permissions')` 한 줄). */
export type Permission = { menuKey: string; action: PermissionAction };

/** 메뉴 행(DB menus 에서 화면에 필요한 칸만). */
export type MenuRow = {
  id: string;
  key: string;
  parentId: string | null;
  label: string | null;
  defaultLabel: string;
  path: string | null;
  sort: number;
  isActive: boolean;
};

export type AdminNavItem = {
  /** 메뉴 key(DB 의 menus.key) — 화면은 이 값으로 아이콘을 고른다 */
  key: string;
  href: string;
  label: string;
  /** 처리할 건수(예: 처리 안 된 새가족) — 0 보다 크면 왼쪽 메뉴에 숫자로 보인다. 값은 그 화면이 생기는 패키지 C 에서 채운다 */
  badge?: number;
};

/** 묶음(콘텐츠 · 시스템 등). 묶음 밖의 화면(첫 화면)은 이름 없는 묶음 하나가 된다. */
export type AdminNavGroup = { key: string; label: string; items: AdminNavItem[] };

const DASHBOARD = 'dashboard';

/** 화면이 만들어진 관리자 메뉴 — 패키지 B · C 에서 화면을 만들 때 여기에 더한다(모두 만들면 이 목록을 지운다). */
export const SCREENS_READY: ReadonlySet<string> = new Set([
  DASHBOARD,
  'users',
  'groups',
  'menus',
  'categories',
  'codes',
  'audit',
]);
const ROOT = '/admin';

export const can = (perms: readonly Permission[], menuKey: string, action: PermissionAction) =>
  perms.some(p => p.menuKey === menuKey && p.action === action);

const bySort = (a: MenuRow, b: MenuRow) => a.sort - b.sort;

/**
 * 사용 중이고 조회 권한이 있는 화면만, 묶음별 · 순서대로. 첫 화면은 로그인한 사람 모두에게 보인다.
 * 꺼진 묶음의 화면과 화면이 하나도 남지 않은 묶음은 뺀다.
 */
export const buildAdminNav = (
  menus: readonly MenuRow[],
  perms: readonly Permission[],
  /**
   * 화면이 만들어진 메뉴 key — 주면 그 밖의 메뉴는 뺀다. DB 메뉴는 먼저 들어가고 화면은 패키지마다 생긴다 —
   * 아직 없는 화면을 «준비 중» 으로 늘어놓으면 메뉴가 길고 어지러워서(2026-11-23 사용자) 생기는 대로 보인다.
   */
  ready?: ReadonlySet<string>
): AdminNavGroup[] => {
  const visible = (m: MenuRow): m is MenuRow & { path: string } =>
    m.isActive &&
    m.path !== null &&
    (!ready || ready.has(m.key)) &&
    (m.key === DASHBOARD || can(perms, m.key, 'READ'));
  const toItem = (m: MenuRow & { path: string }): AdminNavItem => ({
    key: m.key,
    href: m.path,
    label: m.label ?? m.defaultLabel,
  });

  return menus
    .filter(m => m.parentId === null && m.isActive)
    .sort(bySort)
    .map((top): AdminNavGroup => {
      if (top.path !== null) {
        return { key: top.key, label: '', items: visible(top) ? [toItem(top)] : [] };
      }
      const items = menus
        .filter(m => m.parentId === top.id)
        .sort(bySort)
        .filter(visible)
        .map(toItem);
      return { key: top.key, label: top.label ?? top.defaultLabel, items };
    })
    .filter(group => group.items.length > 0);
};

/** 펼친 메뉴 목록(지금 메뉴 판정 · 메뉴 찾기 · 첫 화면 바로 가기) */
export const flattenNav = (groups: readonly AdminNavGroup[]): AdminNavItem[] =>
  groups.flatMap(g => g.items);

/**
 * 지금 주소가 속한 메뉴. 등록·수정 같은 하위 주소(`/admin/bulletin/new`)에서도 그 메뉴가 켜진다.
 * 첫 화면(`/admin`)은 자기 주소일 때만 — 모든 관리자 주소가 `/admin` 으로 시작하기 때문이다.
 */
export const activeNavItem = (pathname: string, items: AdminNavItem[]): AdminNavItem | undefined =>
  items.find(item =>
    item.href === ROOT
      ? pathname === ROOT
      : pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

export type Crumb = { label: string; href?: string };

/**
 * 위쪽 막대의 경로 표시(대메뉴 › 메뉴 › 새로 만들기 · 상세 › 수정) — 스타터의 Breadcrumbs 와 같은 자리.
 * 메뉴 아래 `new` = «새로 만들기», `<id>` = «상세», `<id>/edit` = «상세 › 수정»(설계 6.10 «목록 → 상세 → 수정»).
 */
export const buildBreadcrumbs = (pathname: string, nav: readonly AdminNavGroup[]): Crumb[] => {
  const group = nav.find(g => g.items.some(i => activeNavItem(pathname, [i])));
  const item = group && activeNavItem(pathname, group.items);
  if (!group || !item) return [{ label: '관리자' }];
  const crumbs: Crumb[] = [];
  if (group.label) crumbs.push({ label: group.label });
  crumbs.push({ label: item.label, href: item.href });
  const [first, second] = pathname.slice(item.href.length).split('/').filter(Boolean);
  if (first === 'new') crumbs.push({ label: '새로 만들기' });
  else if (first && second === 'edit') {
    crumbs.push({ label: '상세', href: `${item.href}/${first}` }, { label: '수정' });
  } else if (first) crumbs.push({ label: '상세' });
  return crumbs;
};

/** 화면 제목 — 메뉴 관리에서 바꾼 이름을 따른다(메뉴가 보이지 않으면 기본값). */
export const screenLabel = (nav: readonly AdminNavGroup[], key: string, fallback: string): string =>
  nav.flatMap(g => g.items).find(i => i.key === key)?.label ?? fallback;
