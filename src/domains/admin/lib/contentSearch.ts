// 명령 팔레트의 글 찾기(패키지 B5) — 검색어 다듬기 · 주보의 날짜 범위(순수). 서버 쪽은 api/actions/searchActions.
import { addDays, isCalendarDate } from './content';

/** 검색어 — 앞뒤 공백을 빼고 2자 미만이면 null(너무 많이 걸린다), 50자까지 */
export const normalizeQuery = (q: string): string | null => {
  const v = q.trim().slice(0, 50);
  return v.length >= 2 ? v : null;
};

/** 주보는 제목이 없어 날짜로 찾는다 — «2026-11-29» · «2026-11» · «2026» 이면 [시작, 끝) 범위, 아니면 null */
export const bulletinDateRange = (q: string): [string, string] | null => {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q);
  if (day) return isCalendarDate(q) ? [q, addDays(q, 1)] : null;
  const month = /^(\d{4})-(\d{2})$/.exec(q);
  if (month) {
    const m = Number(month[2]);
    if (m < 1 || m > 12) return null;
    const next =
      m === 12 ? `${Number(month[1]) + 1}-01` : `${month[1]}-${String(m + 1).padStart(2, '0')}`;
    return [`${q}-01`, `${next}-01`];
  }
  if (/^\d{4}$/.test(q)) return [`${q}-01-01`, `${Number(q) + 1}-01-01`];
  return null;
};
