// 관리자 화면 목록(메뉴 key) — 관리자 코드(adminNav)와 공개 페이지의 서버 미리 깨우기(shared/lib/adminWarmup)가 함께 쓴다.
// 메뉴 key 만 담는다(관리자 코드 · 라이브러리를 끌어오지 않는다 — 공개 번들에 실린다, ADR 0008). 주소는 DB 메뉴의 /admin/<key>.

/** 화면이 만들어진 관리자 메뉴 — 패키지 B · C 에서 화면을 만들 때 여기에 더한다(모두 만들면 이 목록을 지운다). */
export const ADMIN_SCREENS_READY: ReadonlySet<string> = new Set([
  'dashboard',
  'bulletin',
  'announcements',
  'garden',
  'users',
  'groups',
  'menus',
  'categories',
  'codes',
  'audit',
]);

/**
 * 서버 미리 깨우기 때 첫 화면 다음으로 이어서 불러 둘 화면의 순서 — 자주 쓰는 것부터(2026-11-24, 사용자가 맡김 — 쓰면서 바꾼다).
 * 만든 화면(ADMIN_SCREENS_READY)만, 앞에서부터 ADMIN_WARM_LIMIT 개까지 부른다. 새 화면을 만들면 여기에 자리를 정한다
 * (빠뜨리면 adminScreens.test 가 실패한다).
 */
export const ADMIN_WARM_ORDER: readonly string[] = [
  // 매주 하는 일(첫 화면 «이번 주 할 일»)
  'bulletin',
  'announcements',
  'newcomers',
  // 콘텐츠 올리기
  'garden',
  'album',
  'resources',
  // 사람 · 권한
  'users',
  'groups',
  // 가끔 보는 기록 · 설정
  'audit',
  'categories',
  'codes',
  'menus',
  'home-hero',
  'departments',
];

/** 이어서 불러 둘 화면 수 — 깨우기 한 번(공개 페이지, 관리자 브라우저만, 3분에 한 번)의 서버 요청을 첫 화면 포함 7건 안으로 */
export const ADMIN_WARM_LIMIT = 6;
