// 주보 목록 계산(순수) — 연도·월 묶기, 표시 문구, «최신» 판정. 주보 화면(BulletinPage)이 쓴다.
// 날짜는 달력 날짜(YYYY-MM-DD) 문자열이라 그대로 잘라 쓴다 — 시간대와 무관하다(ADR 0012).
import type { BulletinIssue } from './news.types';

const month = (date: string) => Number(date.slice(5, 7));
const day = (date: string) => Number(date.slice(8, 10));

/** «11월 8일 주보» */
export const issueLabel = (date: string): string => `${month(date)}월 ${day(date)}일 주보`;

/** «2026년 11월 8일» */
export const issueLongDate = (date: string): string =>
  `${date.slice(0, 4)}년 ${month(date)}월 ${day(date)}일`;

/** 호의 상태 — 가장 최근 호는 «최신 주보», 그 밖은 «지난 주보». issues 는 최신 주일부터. */
export const issueStatus = (issue: BulletinIssue, issues: readonly BulletinIssue[]): string =>
  issue.id === issues[0]?.id ? '최신 주보' : '지난 주보';

export type IssueYear = {
  year: string;
  count: number;
  months: { month: number; issues: BulletinIssue[] }[];
};

/** 연도별 → 월별 묶음. issues 가 최신 주일부터라 연도·달·호 모두 최근 것부터 나온다. 연도 목록은 자료에서 나온다. */
export const issueYears = (issues: readonly BulletinIssue[]): IssueYear[] => {
  const years: IssueYear[] = [];
  for (const issue of issues) {
    const year = issue.date.slice(0, 4);
    let y = years.find(x => x.year === year);
    if (!y) years.push((y = { year, count: 0, months: [] }));
    y.count++;
    const m = month(issue.date);
    let group = y.months.find(x => x.month === m);
    if (!group) y.months.push((group = { month: m, issues: [] }));
    group.issues.push(issue);
  }
  return years;
};
