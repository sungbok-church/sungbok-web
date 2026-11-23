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
