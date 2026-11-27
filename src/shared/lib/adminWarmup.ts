// 관리자 서버를 미리 깨우기(Vercel Hobby 는 몇 분 요청이 없으면 함수를 내린다).
// 공개 홈페이지는 CDN 이 미리 만든 파일로 답해 서버를 깨우지 않으므로, 관리자 로그인 쿠키가 있는 브라우저가 공개 페이지를 열면
// 관리자 첫 화면을 한 번 그려 둔다(AdminWarmup). 주소줄로 /admin 에 들어올 때 기다리지 않게.
//   · 첫 화면을 그대로 그리는 까닭(운영 실측 2026-11-24): 쉬던 서버에 바로 /admin 3.9초, 로그인 화면만 깨워 둔 뒤 2.3초.
//     공개 페이지 · 관리자 화면은 같은 함수지만, 관리자 화면이 처음 하는 일(화면 코드 불러오기 · 로그인 확인 공개키 받기 ·
//     Supabase 연결)은 그 화면을 그려야 데워진다.
//   · 깨우기 표시(ADMIN_WARM_HEADER — 관리자 화면의 배포마다 미리 받기 ScreenPrefill 도 단다)가 달린 요청은 proxy 가 «마지막 요청 시각» 을 남기지도 지우지도 않는다 — 공개 페이지를
//     열었다고 8시간 규칙이 늘어나거나 새로 시작되면 안 된다(8시간이 지난 세션은 그대로 끊는다). 표시를 꾸며 붙여 얻는 것은
//     규칙이 더 엄해지는 것뿐이라 권한이 늘지 않는다.
//   · 넘겨 보내기는 따라가지 않는다(redirect: 'manual') — 꺼진 계정이면 첫 화면이 로그아웃 주소로 보내는데, 그것까지 열면
//     공개 페이지에서 로그아웃이 일어난다. 그 일은 사람이 관리자 화면을 열었을 때 한다.

/** 깨울 때 그리는 주소 — 관리자 첫 화면 */
export const ADMIN_WARM_PATH = '/admin';

/** 깨우기 요청에 붙이는 표시 — proxy 가 마지막 요청 시각을 남기지 않는다 */
export const ADMIN_WARM_HEADER = 'x-admin-warm';

/** 한 번 깨우면 이만큼은 다시 부르지 않는다 — 함수가 내려가기 전(몇 분)에 다시 깨울 만큼만 */
export const ADMIN_WARM_INTERVAL_MS = 3 * 60 * 1000;

/** 마지막으로 깨운 시각을 적어 두는 칸(localStorage — 탭이 여럿이어도 한 번) */
export const ADMIN_WARM_STORAGE_KEY = 'admin_warm_at';

// @supabase/ssr 의 로그인 쿠키: sb-<프로젝트>-auth-token, 길면 .0 · .1 로 나눠 담는다. 값이 빈 것은 지운 쿠키다.
const SESSION_COOKIE = /(?:^|;\s*)sb-[^=;\s]+-auth-token(?:\.\d+)?=[^;\s]/;

/** 이 브라우저에 관리자 로그인 쿠키가 있는가(값은 보지 않는다 — 로그인이 살아 있는지는 서버가 판단한다) */
export const hasAdminSessionCookie = (cookie: string): boolean => SESSION_COOKIE.test(cookie);

/** 마지막으로 깨운 시각(lastAt)에 비춰 지금 다시 부를지 */
export const shouldWarmAdmin = (lastAt: number | null, now: number): boolean =>
  lastAt === null ||
  !Number.isFinite(lastAt) ||
  lastAt > now ||
  now - lastAt >= ADMIN_WARM_INTERVAL_MS;

/**
 * 첫 화면 다음으로 이어서 불러 둘 관리자 화면 주소 — 순서(order)대로, 만든 화면(ready)만, limit 개까지. 첫 화면은 따로 먼저 그린다.
 * 화면마다 서버 코드를 처음 부를 때 0.3~0.8초가 더 든다(Vercel 은 서버가 켜질 때 화면 코드를 미리 부르지 않는다 —
 * Next 의 preloadEntriesOnStart 가 Vercel 방식(minimal mode)에서는 꺼진다). 운영 실측(사용자 추가 화면): 처음 1.04초 · 다시 0.22초.
 */
export const adminWarmPaths = (
  ready: ReadonlySet<string>,
  order: readonly string[],
  limit: number
): string[] =>
  order
    .filter(key => key !== 'dashboard' && ready.has(key))
    .slice(0, limit)
    .map(key => `${ADMIN_WARM_PATH}/${key}`);

/**
 * 관리자 화면 하나를 받아 버린다 — 공개 페이지의 깨우기(AdminWarmup) · 관리자 화면의 미리 받기(ScreenPrefill)가 쓴다.
 * 깨우기 표시를 단다(proxy 가 마지막 요청 시각을 남기지 않는다 — 사람이 쓴 것이 아니다). 넘겨 보내기는 따라가지 않는다(위 머리 주석).
 * keepalive: 응답에 실려 오는 새 로그인 토큰(쉬던 사이 만료돼 proxy 가 갱신한 것)을 페이지를 떠나도 받게 —
 * 놓치면 옛 토큰을 다시 쓰다가 Supabase 가 재사용으로 보고 세션을 끊는다. 받은 내용은 끝까지 받아 버린다.
 * rsc: 메뉴를 눌러 옮길 때처럼 화면 데이터로(아니면 주소줄로 열 때처럼 문서로).
 * 결과: 그려짐(ok) · 넘겨 보냄(redirect — proxy 가 로그인 화면으로: 로그인이 끊김 · 8시간 지남) · 그 밖의 실패(error — 없는 화면 등).
 */
export type AdminScreenFetch = 'ok' | 'redirect' | 'error';

export const fetchAdminScreen = async (
  path: string,
  { rsc = false }: { rsc?: boolean } = {}
): Promise<AdminScreenFetch> => {
  const res = await fetch(path, {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
    keepalive: true,
    headers: { [ADMIN_WARM_HEADER]: '1', ...(rsc ? { RSC: '1' } : {}) },
  });
  await res.arrayBuffer();
  if (res.ok) return 'ok';
  return res.type === 'opaqueredirect' ? 'redirect' : 'error';
};
