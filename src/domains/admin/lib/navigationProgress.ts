// 화면 이동이 시작됐는지 판단하고 알린다 — 위쪽 진행 표시줄(NavigationProgress)과 본문 뼈대(PendingScreen)가 듣는다.
// 링크(<Link>)는 진행 표시줄이 클릭으로 알아채 이 신호를 내고, 줄 클릭 · 검색처럼 router.push 로 옮기는 곳은 useAdminNavigate 가 낸다.

/** 화면 이동을 시작한다는 신호(window 이벤트) — detail 에 갈 곳(NavigationStartDetail) */
export const NAVIGATION_START = 'admin:navigation-start';

export type NavigationStartDetail = { href: string };

/** href 가 지금 화면(currentHref)과 다른 앱 안의 주소인가 — # 만 다르면 같은 화면이다. */
export const leadsElsewhere = (href: string, currentHref: string): boolean => {
  const current = new URL(currentHref);
  const next = new URL(href, current);
  return (
    next.origin === current.origin &&
    (next.pathname !== current.pathname || next.search !== current.search)
  );
};

type ClickLike = {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};
type AnchorLike = { href: string; target: string; download: boolean };

/** 보조 키 없는 왼쪽 버튼 클릭인가 — 아니면(새 탭 · 새 창 · 가운데 버튼) 브라우저에 맡긴다. */
export const isPlainClick = (e: ClickLike): boolean =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/** 이 링크 클릭이 이 탭 안에서 앱 안의 주소로 옮기는 것인가(새 탭 · 새 창 · 내려받기 · 바깥 주소면 아니다). 지금 화면이어도 그렇다. */
export const isInAppClick = (e: ClickLike, a: AnchorLike, currentHref: string): boolean =>
  isPlainClick(e) &&
  (a.target === '' || a.target === '_self') &&
  !a.download &&
  new URL(a.href, currentHref).origin === new URL(currentHref).origin;

/**
 * href 가 지금과 다른 화면(경로가 다른 앱 안의 주소)인가 — 같은 화면의 조건만 바꾸는 이동(검색 · 쪽 · 정렬)은 아니다.
 * 본문 뼈대는 다른 화면으로 갈 때만 띄운다 — 조건만 바꿀 때는 지금 목록을 둔 채 새 목록이 오면 바꾼다.
 */
export const leadsToOtherScreen = (href: string, currentHref: string): boolean => {
  const current = new URL(currentHref);
  const next = new URL(href, current);
  return next.origin === current.origin && next.pathname !== current.pathname;
};

/**
 * 링크 클릭 · router.push 직전에 부른다 — 앱 안의 주소면 갈 곳을 실어 알린다. 지금 화면으로 가는 것도 알린다:
 * 앞서 누른 이동을 대신하므로(Next 가 앞 이동을 버린다) 띄워 둔 뼈대 · 표시줄을 거둬야 한다. 듣는 쪽이 갈 곳을 보고 정한다.
 */
export const signalNavigationStart = (href: string): void => {
  const next = new URL(href, window.location.href);
  if (next.origin !== window.location.origin) return;
  const detail: NavigationStartDetail = { href: next.href };
  window.dispatchEvent(new CustomEvent(NAVIGATION_START, { detail }));
};
