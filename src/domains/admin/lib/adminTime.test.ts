import { describe, expect, it } from 'vitest';

import { dayRange, formatAdminTime, formatShortTime, periodStart } from './adminTime';

describe('formatAdminTime', () => {
  it('UTC 로 받은 시각을 서울 시각으로(YYYY-MM-DD HH:mm)', () => {
    expect(formatAdminTime('2026-11-19T21:45:32.123456+00:00')).toBe('2026-11-20 06:45');
    expect(formatAdminTime('2026-11-19T00:05:00Z')).toBe('2026-11-19 09:05');
  });

  it('깨진 값은 그대로', () => {
    expect(formatAdminTime('abc')).toBe('abc');
  });
});

describe('formatShortTime', () => {
  const now = '2026-11-24T03:00:00Z';
  it('올해면 해를 빼고 «MM-DD HH:mm»(서울 시각)', () => {
    expect(formatShortTime('2026-11-20T11:57:00Z', now)).toBe('11-20 20:57');
  });

  it('지난해 이전이면 시각을 빼고 «YYYY-MM-DD»', () => {
    expect(formatShortTime('2025-03-02T01:00:00Z', now)).toBe('2025-03-02');
  });

  it('서울 날짜로 해를 가른다(UTC 로는 지난해 마지막 날 밤)', () => {
    expect(formatShortTime('2025-12-31T16:30:00Z', '2026-01-05T00:00:00Z')).toBe('01-01 01:30');
  });

  it('깨진 값은 그대로', () => {
    expect(formatShortTime('abc', now)).toBe('abc');
  });
});

describe('periodStart', () => {
  const now = Date.UTC(2026, 10, 20, 0, 0, 0);
  it('최근 7일 · 30일의 시작(UTC ISO), 전체는 null', () => {
    expect(periodStart('7d', now)).toBe('2026-11-13T00:00:00.000Z');
    expect(periodStart('30d', now)).toBe('2026-10-21T00:00:00.000Z');
    expect(periodStart(undefined, now)).toBeNull();
  });
});

describe('dayRange', () => {
  it('YYYY-MM-DD 기간을 한국 시각 경계로 — 끝일은 다음 날 0시 «전»', () => {
    expect(dayRange('2026-11-01', '2026-11-20')).toEqual({
      gte: '2026-11-01T00:00:00+09:00',
      lt: '2026-11-21T00:00:00+09:00',
    });
  });

  it('한쪽만 있으면 그쪽만, 달 · 해를 넘긴다', () => {
    expect(dayRange('', '2026-12-31')).toEqual({ gte: null, lt: '2027-01-01T00:00:00+09:00' });
    expect(dayRange('2026-02-28', '')).toEqual({ gte: '2026-02-28T00:00:00+09:00', lt: null });
  });
});
