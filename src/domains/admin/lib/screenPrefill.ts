// 배포마다 한 번, 관리자 화면들을 미리 받아 둔다(ScreenPrefill) — 배포 뒤 각 화면을 처음 열 때의 지연을 없앤다.
//   · 까닭(운영 실측 2026-11-27, 배포 직후): Vercel 은 화면마다 «이어 그리기 정보»(Next cacheComponents 가 모든 화면에 만든다 —
//     화면마다 끌 수 없다)를 배포 뒤 처음 한 번 저장소에서 가져온다. 메뉴를 눌러 처음 가면 첫 응답 0.34초, 한 번 받아 둔 화면은
//     0.13초, 두 번째부터 0.11초(등록 화면도 처음 0.37초 · 두 번째 0.13초).
//   · 로그인한 관리자가 자기 로그인으로 받는다 — 로그인 확인을 건너뛰는 길을 따로 만들지 않는다.
//   · 예전에 끈 «보이면 미리 받기»(화면을 열 때마다 12건)와 달리 배포마다 브라우저에서 한 번이다.

import type { AdminNavGroup, Permission } from './adminNav';
import { can, flattenNav } from './adminNav';

/** 이 배포에서 미리 받았는지 적어 두는 칸(localStorage — 값은 배포 표시) */
export const PREFILL_STORAGE_KEY = 'admin_prefill_deploy';

/** 화면을 열고 이만큼 뒤에 시작한다 — 지금 화면을 그리는 일과 겹치지 않게 */
export const PREFILL_DELAY_MS = 2000;

const ADMIN_PATH = /^\/admin(?:\/|$)/;

/** 등록 화면(<메뉴 주소>/new)이 있는 메뉴 key — 등록 화면을 더하면 여기에도(빠뜨리면 screenPrefill.test 가 실패한다) */
export const CREATE_SCREENS: ReadonlySet<string> = new Set([
  'album',
  'announcements',
  'bulletin',
  'garden',
  'groups',
  'resources',
  'users',
]);

/**
 * 상세 화면(<메뉴 주소>/[id] — 부서는 [slug])이 있는 메뉴 key. 상세 · 수정은 글마다 주소가 달라도 Vercel 이 가져오는 정보는
 * 화면 종류마다 하나라(운영 실측: 주보 상세 처음 0.63초 → 다른 주보 0.22초), 없는 글의 주소 하나로 받아 두면 된다
 * (없는 글이면 화면은 «없음» 으로 그려지지만 정보는 채워진다 — 앨범 상세 · 수정으로 확인). 화면을 더하면 여기에도
 * (빠뜨리면 screenPrefill.test 가 실패한다).
 */
export const DETAIL_SCREENS: ReadonlySet<string> = new Set([
  'album',
  'announcements',
  'bulletin',
  'departments',
  'garden',
  'groups',
  'newcomers',
  'resources',
  'users',
]);

/** 수정 화면(<메뉴 주소>/[id]/edit)이 있는 메뉴 key — 화면을 더하면 여기에도(빠뜨리면 screenPrefill.test 가 실패한다) */
export const EDIT_SCREENS: ReadonlySet<string> = new Set([
  'album',
  'announcements',
  'bulletin',
  'garden',
  'groups',
  'resources',
  'users',
]);

/** 상세 · 수정을 받을 때 쓰는 없는 글의 주소(어느 글도 이 id 를 갖지 않는다 — uuid v7 은 시각으로 시작한다) */
export const PREFILL_PLACEHOLDER = '00000000-0000-0000-0000-000000000000';

/**
 * 미리 받아 둘 주소 — 자주 여는 것부터: 왼쪽 메뉴(권한이 있는 화면만) 순서대로, 이어서 등록 화면(만들기 권한),
 * 상세 화면(보이는 메뉴), 수정 화면(고치기 권한). 같은 주소는 한 번.
 */
export const prefillPaths = (
  nav: readonly AdminNavGroup[],
  permissions: readonly Permission[]
): string[] => {
  const items = flattenNav(nav).filter(item => ADMIN_PATH.test(item.href));
  const sub = (screens: ReadonlySet<string>, suffix: string, action?: Permission['action']) =>
    items
      .filter(item => screens.has(item.key) && (!action || can(permissions, item.key, action)))
      .map(item => `${item.href}/${suffix}`);
  return [
    ...new Set([
      ...items.map(item => item.href),
      ...sub(CREATE_SCREENS, 'new', 'CREATE'),
      ...sub(DETAIL_SCREENS, PREFILL_PLACEHOLDER),
      ...sub(EDIT_SCREENS, `${PREFILL_PLACEHOLDER}/edit`, 'UPDATE'),
    ]),
  ];
};

/** 이 배포(deployId)에서 이 브라우저가 아직 미리 받지 않았는가 — 배포 표시가 없으면(로컬 개발) 받지 않는다 */
export const shouldPrefill = (saved: string | null, deployId: string): boolean =>
  deployId !== '' && saved !== deployId;
