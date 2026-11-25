import { describe, expect, it } from 'vitest';

import { cleanupDay, dayRange, formatAdminTime, formatShortTime, periodStart } from './adminTime';

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

describe('cleanupDay — 예약 작업(매일 03:00~03:59 서울)이 지울 수 있는 가장 이른 날', () => {
  it('휴지통 30일 — 그 시각이 03:00 뒤면 다음 날 새벽에 지운다', () => {
    // 2026-11-25 15:00 서울에 휴지통으로 → 12-25 15:00 에 30일 → 12-26 03:00 에 지운다
    expect(cleanupDay('2026-11-25T06:00:00Z', { days: 30 })).toBe('2026-12-26');
  });
  it('03:00 전이면 그날 새벽', () => {
    // 2026-11-25 02:00 서울 → 12-25 02:00 → 12-25 03:00
    expect(cleanupDay('2026-11-24T17:00:00Z', { days: 30 })).toBe('2026-12-25');
  });
  it('03:00~03:59 에 찬 것은 그날 지워질 수 있다(Hobby 예약 작업은 그 한 시간 안 어느 때) — 이른 날을 보인다', () => {
    // 2026-11-25 03:30 서울 → 12-25 03:30 → 12-25 03:45 에 돌면 지운다
    expect(cleanupDay('2026-11-24T18:30:00Z', { days: 30 })).toBe('2026-12-25');
  });
  it('새가족 1년(달력으로 1년)', () => {
    expect(cleanupDay('2026-11-25T06:00:00Z', { years: 1 })).toBe('2027-11-26');
  });
  it('읽지 못하는 값은 빈 글자', () => {
    expect(cleanupDay('x', { days: 30 })).toBe('');
  });
});
