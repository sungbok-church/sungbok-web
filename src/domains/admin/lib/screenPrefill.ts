// 배포마다 한 번, 관리자 화면들을 미리 받아 둔다(ScreenPrefill) — 배포 뒤 각 화면을 처음 열 때의 지연을 없앤다.
//   · 까닭(운영 실측 2026-11-27, 배포 직후): Vercel 은 화면마다 «이어 그리기 정보»(Next cacheComponents 가 모든 화면에 만든다 —
//     화면마다 끌 수 없다)를 배포 뒤 처음 한 번 저장소에서 가져온다. 메뉴를 눌러 처음 가면 첫 응답 0.34초, 한 번 받아 둔 화면은
//     0.13초, 두 번째부터 0.11초. 가져온 것은 그 배포 동안 모든 사람이 함께 쓴다.
//   · 로그인한 관리자가 자기 로그인으로 받는다 — 로그인 확인을 건너뛰는 길을 따로 만들지 않는다.
//   · 예전에 끈 «보이면 미리 받기»(화면을 열 때마다 12건)와 달리 배포마다 브라우저에서 한 번이다.

import type { AdminNavGroup } from './adminNav';
import { flattenNav } from './adminNav';

/** 이 배포에서 미리 받았는지 적어 두는 칸(localStorage — 값은 배포 표시) */
export const PREFILL_STORAGE_KEY = 'admin_prefill_deploy';

/** 화면을 열고 이만큼 뒤에 시작한다 — 지금 화면을 그리는 일과 겹치지 않게 */
export const PREFILL_DELAY_MS = 2000;

const ADMIN_PATH = /^\/admin(?:\/|$)/;

/** 미리 받아 둘 주소 — 왼쪽 메뉴(권한이 있는 화면만) 순서대로, 같은 주소는 한 번 */
export const prefillPaths = (nav: readonly AdminNavGroup[]): string[] => [
  ...new Set(
    flattenNav(nav)
      .map(item => item.href)
      .filter(href => ADMIN_PATH.test(href))
  ),
];

/** 이 배포(deployId)에서 이 브라우저가 아직 미리 받지 않았는가 — 배포 표시가 없으면(로컬 개발) 받지 않는다 */
export const shouldPrefill = (saved: string | null, deployId: string): boolean =>
  deployId !== '' && saved !== deployId;
