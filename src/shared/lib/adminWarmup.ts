// 관리자 서버를 미리 깨우기(Vercel Hobby 는 몇 분 요청이 없으면 함수를 내린다 — 다시 켜는 데 0.7초쯤).
// 공개 홈페이지는 CDN 이 미리 만든 파일로 답해 서버를 깨우지 않으므로, 관리자 로그인 쿠키가 있는 브라우저가
// 공개 페이지를 열면 관리자 로그인 화면을 쿠키 없이 한 번 불러 둔다(AdminWarmup). 주소줄로 /admin 에 들어올 때
// 관문(proxy)과 화면을 그리는 함수가 이미 깨어 있게.
//   · 로그인 화면을 부르는 까닭: Vercel 은 화면(page)과 route handler 를 다른 함수로 묶는다 — 빈 route handler 를 불러서는
//     /admin 화면을 그리는 함수가 깨지 않는다. 로그인 화면은 관리자 화면과 같은 쪽(요청마다 그리는 page)이다.
//   · 쿠키를 싣지 않으므로(credentials: 'omit') proxy 는 «로그인 안 한 사람» 으로 보고 로그인 확인 · 토큰 갱신 · 8시간 시각
//     갱신을 하지 않는다. 응답의 쿠키도 브라우저가 버린다 — 공개 페이지를 열었다고 8시간 규칙이 늘어나지 않는다.

/** 깨울 때 부르는 주소 */
export const ADMIN_WARM_PATH = '/admin/login';

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
