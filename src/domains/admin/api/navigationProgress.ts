// 화면 이동이 시작됐는지 판단하고 알린다 — 위쪽 진행 표시줄(NavigationProgress)이 듣는다.
// 링크(<Link>)는 클릭으로 알아채고, 줄 클릭 · 검색처럼 router.push 로 옮기는 곳은 useAdminNavigate 가 알린다.

/** 진행 표시줄을 켜는 신호(window 이벤트) */
export const NAVIGATION_START = 'admin:navigation-start';

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

/** 이 링크 클릭이 이 탭 안의 화면 이동인가(새 탭 · 새 창 · 내려받기 · 지금 화면이면 아니다). */
export const isNavigationClick = (e: ClickLike, a: AnchorLike, currentHref: string): boolean =>
  e.button === 0 &&
  !e.metaKey &&
  !e.ctrlKey &&
  !e.shiftKey &&
  !e.altKey &&
  (a.target === '' || a.target === '_self') &&
  !a.download &&
  leadsElsewhere(a.href, currentHref);

/** router.push 로 옮기기 직전에 부른다 — 다른 화면으로 갈 때만 표시줄을 켠다. */
export const signalNavigationStart = (href: string): void => {
  if (leadsElsewhere(href, window.location.href)) window.dispatchEvent(new Event(NAVIGATION_START));
};
