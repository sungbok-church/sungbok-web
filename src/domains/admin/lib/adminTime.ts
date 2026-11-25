// 관리자 화면의 시각 표시 — DB 는 UTC(timestamptz)로 주고, 화면에서만 서울 시각으로 보인다(ADR 0012).

const FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** «2026-11-20 06:45»(서울 시각). 읽지 못하는 값은 그대로 돌려준다. */
export const formatAdminTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const p = Object.fromEntries(FORMAT.formatToParts(date).map(part => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
};

/**
 * 상세 아래 «수정 11-20 20:57» 처럼 짧게(서울 시각) — 올해면 «MM-DD HH:mm», 그 전이면 «YYYY-MM-DD».
 * now 는 지금 시각(ISO). 읽지 못하는 값은 그대로 돌려준다.
 */
export const formatShortTime = (iso: string, now: string): string => {
  const full = formatAdminTime(iso);
  if (full === iso) return iso;
  const thisYear = formatAdminTime(now).slice(0, 4);
  return full.startsWith(thisYear) ? full.slice(5) : full.slice(0, 10);
};

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIODS = { '7d': 7, '30d': 30 } as const;
export type Period = keyof typeof PERIODS;

/** 기간 필터(최근 7일 · 30일)의 시작 시각(UTC ISO). 고르지 않았으면 null = 전체. */
export const periodStart = (period: string | undefined, now: number): string | null => {
  const days = period && period in PERIODS ? PERIODS[period as Period] : null;
  return days === null ? null : new Date(now - days * DAY_MS).toISOString();
};

const KST_MIDNIGHT = 'T00:00:00+09:00';

/** 목록의 기간 조건(YYYY-MM-DD, 한국 날짜) → `at >= gte` · `at < lt` 경계. 끝일은 그날 하루를 다 넣는다. */
export const dayRange = (from: string, to: string): { gte: string | null; lt: string | null } => {
  let lt: string | null = null;
  if (to) {
    const next = new Date(`${to}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    lt = `${next.toISOString().slice(0, 10)}${KST_MIDNIGHT}`;
  }
  return { gte: from ? `${from}${KST_MIDNIGHT}` : null, lt };
};

const KST_MS = 9 * 60 * 60 * 1000;
// 예약 작업이 도는 한 시간(vercel.json crons 0 18 * * * = 03시 서울 — Hobby 는 그 시간 안 어느 때)이 끝나는 때
const CLEANUP_WINDOW_END_HOUR = 4;

/**
 * 하루 한 번 예약 작업(매일 03:00~03:59 서울)이 이 줄을 지울 수 있는 가장 이른 날(«YYYY-MM-DD», 서울).
 * keep: 보관 기간 — 휴지통 { days: 30 } · 새가족 { years: 1 }(DB 의 interval 처럼 달력으로). 기간이 그날 04:00 전에 차면
 * 그날(03시대에 찬 것은 그날 돌 수도 다음 날 돌 수도 있다 — 이른 쪽), 아니면 다음 날. 읽지 못하는 값은 빈 글자.
 */
export const cleanupDay = (iso: string, keep: { days?: number; years?: number }): string => {
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return '';
  if (keep.years) due.setUTCFullYear(due.getUTCFullYear() + keep.years);
  if (keep.days) due.setTime(due.getTime() + keep.days * DAY_MS);
  // 서울 시각으로 옮겨 그날 예약 작업이 끝난 뒤(04:00 부터)면 다음 날
  const kst = new Date(due.getTime() + KST_MS);
  if (kst.getUTCHours() >= CLEANUP_WINDOW_END_HOUR) kst.setUTCDate(kst.getUTCDate() + 1);
  return kst.toISOString().slice(0, 10);
};
