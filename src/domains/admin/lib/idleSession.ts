// 오래 쓰지 않으면 로그아웃(설계 6.10). Supabase 의 refresh token 은 만료가 없어서, 마지막 관리자 요청 시각을
// 쿠키(IDLE_COOKIE, httpOnly)에 두고 proxy 가 판단한다. 넘었으면 Supabase 에 로그아웃을 알려 그 세션을 끊는다.

export const IDLE_LIMIT_MS = 8 * 60 * 60 * 1000;
export const IDLE_COOKIE = 'admin_last_seen';
/** 마지막 요청 시각 쿠키의 보존 기간(초) — 로그인 쿠키(@supabase/ssr 기본 400일)와 같게 */
export const IDLE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;
/** 서버 사이의 시계 차이로 보는 범위 — 이보다 먼 미래 값은 조작된 것으로 본다 */
const CLOCK_SKEW_MS = 5_000;

/** 마지막 요청 시각(밀리초 문자열)으로부터 IDLE_LIMIT_MS 를 넘었는가. 값이 없으면 막 로그인한 것 — 아니다. */
export const isIdle = (lastSeen: string | undefined, now: number): boolean => {
  if (lastSeen === undefined) return false;
  const at = Number(lastSeen);
  if (!Number.isFinite(at) || at > now + CLOCK_SKEW_MS) return true;
  return now - at > IDLE_LIMIT_MS;
};
