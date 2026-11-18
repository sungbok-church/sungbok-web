// 관리자 왼쪽 메뉴의 항목과 «지금 어느 메뉴에 있는가» 판정.
// 패키지 1 에는 메뉴가 «첫 화면» 하나이고 코드에 있다. 패키지 2 에서 DB 의 menus(area = admin) 중
// 사용 중이고 조회 권한이 있는 것으로 바뀐다(설계 6.5) — 그때도 이 모양(key · href · label)으로 넘긴다.

export type AdminNavItem = {
  /** 메뉴 key(DB 의 menus.key) — 화면은 이 값으로 아이콘을 고른다 */
  key: string;
  href: string;
  label: string;
};

export const ADMIN_NAV: AdminNavItem[] = [{ key: 'dashboard', href: '/admin', label: '첫 화면' }];

const ROOT = '/admin';

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
