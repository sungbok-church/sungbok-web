// 콘텐츠 5종(주보 · 주일광고 · 성복의 뜰 · 교회앨범 · 설교 시트지)이 함께 쓰는 날짜 규칙.
// 화면(휴대폰 Safari 포함)에서도 도므로 Temporal 을 쓰지 않는다(ADR 0012 — Safari 정식판에 아직 없다).

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const SEOUL_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 달력 날짜(YYYY-MM-DD) → 그날 UTC 0시. 없는 날짜(2월 30일 등)나 다른 모양이면 null */
const toUtc = (date: string): Date | null => {
  const m = DATE.exec(date);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === date ? d : null;
};

/** 지금(밀리초) 서울의 날짜 YYYY-MM-DD */
export const seoulToday = (now: number): string => SEOUL_DATE.format(now);

/** 그 주의 주일 — 일요일이면 그날, 아니면 다음 일요일. 새 주보의 날짜 기본값(칸에서 다른 날짜로 바꿀 수 있다 — 성탄절 등 평일 주보) */
export const upcomingSunday = (today: string): string => {
  const d = toUtc(today);
  if (!d) return today;
  return new Date(d.getTime() + ((7 - d.getUTCDay()) % 7) * DAY_MS).toISOString().slice(0, 10);
};

/** 있는 달력 날짜(YYYY-MM-DD)인가 — 2월 30일 같은 날은 아니다 */
export const isCalendarDate = (date: string): boolean => toUtc(date) !== null;

/** 며칠 뒤(앞)의 날짜. 날짜가 아니면 그대로 */
export const addDays = (date: string, days: number): string => {
  const d = toUtc(date);
  return d ? new Date(d.getTime() + days * DAY_MS).toISOString().slice(0, 10) : date;
};
