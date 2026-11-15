import { describe, expect, it } from 'vitest';

import type { BulletinIssue } from './news.types';
import { issueLabel, issueLongDate, issueStatus, issueYears } from './bulletinList';

const issue = (date: string): BulletinIssue => ({
  id: date,
  status: 'published',
  date,
  pages: [{ src: `/b/${date}-1.webp`, width: 1200, height: 854 }],
});

// 최신 주일부터(저장소가 주는 순서) — 연도가 넘어가는 경우 포함
const ISSUES = [
  issue('2027-01-03'),
  issue('2026-11-08'),
  issue('2026-11-01'),
  issue('2026-10-25'),
  issue('2025-12-28'),
];

describe('표시 문구', () => {
  it('«11월 8일 주보» · «2026년 11월 8일» — 달력 날짜 그대로(시간대와 무관)', () => {
    expect(issueLabel('2026-11-08')).toBe('11월 8일 주보');
    expect(issueLabel('2027-01-03')).toBe('1월 3일 주보');
    expect(issueLongDate('2026-11-08')).toBe('2026년 11월 8일');
  });

  it('호의 상태 — 가장 최근 호만 «최신 주보», 그 밖은 «지난 주보»', () => {
    expect(issueStatus(ISSUES[0], ISSUES)).toBe('최신 주보');
    expect(issueStatus(ISSUES[1], ISSUES)).toBe('지난 주보');
  });
});

describe('issueYears — 연도별·월별 묶음(연도 목록은 자료에서 자동으로)', () => {
  it('최근 연도부터, 연도 안은 최근 달부터, 달 안은 최근 주일부터', () => {
    const years = issueYears(ISSUES);
    expect(years.map(y => [y.year, y.count])).toEqual([
      ['2027', 1],
      ['2026', 3],
      ['2025', 1],
    ]);
    expect(years[1].months.map(m => [m.month, m.issues.map(i => i.date)])).toEqual([
      [11, ['2026-11-08', '2026-11-01']],
      [10, ['2026-10-25']],
    ]);
  });

  it('빈 목록이면 빈 배열', () => {
    expect(issueYears([])).toEqual([]);
  });
});
