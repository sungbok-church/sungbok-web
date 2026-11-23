// 관리자 로그인 흐름에서 «어디로 보낼지» 를 정하는 순수 함수. proxy(src/proxy.ts)와 로그인 Server Action 이 함께 쓴다.

export const ADMIN_HOME = '/admin';
export const ADMIN_LOGIN = '/admin/login';
/** 비밀번호 찾기 메일의 링크가 오는 곳(route handler — passwordReset.ts) */
export const ADMIN_LOGIN_CONFIRM = `${ADMIN_LOGIN}/confirm`;

// 주소를 풀어 볼 때만 쓰는 가짜 출처 — 결과의 출처가 이것과 다르면 바깥 주소다.
const BASE = 'http://x';
// 역슬래시(브라우저가 '/' 로 읽는다)와 제어 문자(줄바꿈 등)가 섞인 값은 풀어 보지 않고 거절한다.
const UNSAFE = /[\\\u0000-\u001f\u007f]/;

const isAdminPath = (pathname: string) =>
  pathname === ADMIN_HOME || pathname.startsWith(`${ADMIN_HOME}/`);
const isLoginPath = (pathname: string) =>
  pathname === ADMIN_LOGIN || pathname.startsWith(`${ADMIN_LOGIN}/`);

/**
 * 로그인 뒤 갈 곳. `/admin` 또는 `/admin/…` 인 사이트 안 경로만 받고(경로 + 쿼리), 나머지는 ADMIN_HOME.
 * `?next=https://evil.example` · `//evil.example` · `/admin/../news` 같은 값으로 바깥이나 엉뚱한 곳에 보내지 않는다.
 * 로그인 화면 자체로는 되돌리지 않는다(무한 왕복).
 */
export const safeNextPath = (next: string | null | undefined): string => {
  if (!next || UNSAFE.test(next) || !next.startsWith('/')) return ADMIN_HOME;
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return ADMIN_HOME;
  }
  if (url.origin !== BASE) return ADMIN_HOME;
  if (!isAdminPath(url.pathname) || isLoginPath(url.pathname)) return ADMIN_HOME;
  return `${url.pathname}${url.search}`;
};

export type AuthDecision = { kind: 'pass' } | { kind: 'redirect'; to: string };

/**
 * `/admin/*` 요청을 지나가게 할지, 어디로 보낼지. search 는 `?a=1` 꼴(없으면 '').
 * 로그인하지 않은 사람은 로그인 화면으로(오던 곳을 next 에 실어), 로그인한 사람이 로그인 화면에 오면 갈 곳으로 보낸다.
 * 비밀번호 찾기 메일의 확인 주소는 로그인했어도 지나간다 — 막으면 링크의 계정으로 바꿔 들지 못하고 첫 화면으로 간다.
 */
export const adminAuthDecision = (
  pathname: string,
  search: string,
  signedIn: boolean
): AuthDecision => {
  if (pathname === ADMIN_LOGIN_CONFIRM) return { kind: 'pass' };
  if (isLoginPath(pathname)) {
    if (!signedIn) return { kind: 'pass' };
    return { kind: 'redirect', to: safeNextPath(new URLSearchParams(search).get('next')) };
  }
  if (signedIn) return { kind: 'pass' };
  const from = safeNextPath(`${pathname}${search}`);
  return {
    kind: 'redirect',
    to: from === ADMIN_HOME ? ADMIN_LOGIN : `${ADMIN_LOGIN}?next=${encodeURIComponent(from)}`,
  };
};
