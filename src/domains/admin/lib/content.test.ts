import { describe, expect, it } from 'vitest';

import { addDays, isCalendarDate, seoulToday, upcomingSunday } from './content';

describe('seoulToday', () => {
  it('서울 날짜를 YYYY-MM-DD 로 — UTC 로는 전날이어도', () => {
    // 2026-11-28T16:30Z = 서울 11-29 01:30
    expect(seoulToday(Date.parse('2026-11-28T16:30:00Z'))).toBe('2026-11-29');
    expect(seoulToday(Date.parse('2026-11-28T14:59:00Z'))).toBe('2026-11-28');
  });
});

describe('upcomingSunday', () => {
  it('일요일이면 그날', () => {
    expect(upcomingSunday('2026-11-29')).toBe('2026-11-29');
  });
  it('다른 요일이면 다음 일요일 — 달 · 해를 넘겨도', () => {
    expect(upcomingSunday('2026-11-24')).toBe('2026-11-29'); // 화
    expect(upcomingSunday('2026-11-30')).toBe('2026-12-06'); // 월
    expect(upcomingSunday('2026-12-28')).toBe('2027-01-03'); // 월
  });
});

describe('isCalendarDate · addDays', () => {
  it('있는 날짜(YYYY-MM-DD)만', () => {
    expect(isCalendarDate('2026-12-25')).toBe(true);
    expect(isCalendarDate('2026-02-30')).toBe(false);
    expect(isCalendarDate('2026-1-5')).toBe(false);
    expect(isCalendarDate('')).toBe(false);
  });
  it('며칠 뒤 — 해를 넘겨도', () => {
    expect(addDays('2026-12-27', 7)).toBe('2027-01-03');
  });
});
