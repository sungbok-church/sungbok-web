import { describe, expect, it } from 'vitest';

import { bulletinDateRange, normalizeQuery } from './contentSearch';

describe('normalizeQuery', () => {
  it('앞뒤 공백을 빼고, 2자 미만이면 null(너무 많이 걸린다), 50자까지', () => {
    expect(normalizeQuery('  주일 ')).toBe('주일');
    expect(normalizeQuery('a')).toBeNull();
    expect(normalizeQuery('가'.repeat(60))).toHaveLength(50);
  });
});

describe('bulletinDateRange — 주보는 제목이 없어 날짜로 찾는다', () => {
  it('하루 · 한 달 · 한 해 범위([시작, 끝))', () => {
    expect(bulletinDateRange('2026-11-29')).toEqual(['2026-11-29', '2026-11-30']);
    expect(bulletinDateRange('2026-11')).toEqual(['2026-11-01', '2026-12-01']);
    expect(bulletinDateRange('2026-12')).toEqual(['2026-12-01', '2027-01-01']);
    expect(bulletinDateRange('2026')).toEqual(['2026-01-01', '2027-01-01']);
  });
  it('날짜 모양이 아니거나 없는 날짜면 null', () => {
    expect(bulletinDateRange('주보')).toBeNull();
    expect(bulletinDateRange('2026-13')).toBeNull();
    expect(bulletinDateRange('2026-02-30')).toBeNull();
  });
});
