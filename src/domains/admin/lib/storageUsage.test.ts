import { describe, expect, it } from 'vitest';

import { formatBytes, storageUsage } from './storageUsage';

describe('formatBytes — 사람이 읽는 크기(1024 단위)', () => {
  it('단위를 골라 소수 한 자리까지', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(900)).toBe('900 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(52_428_800)).toBe('50 MB');
    expect(formatBytes(1.25 * 1024 ** 3)).toBe('1.3 GB');
    expect(formatBytes(100 * 1024 ** 3)).toBe('100 GB');
  });
});

describe('storageUsage — 첫 화면 «저장 공간» 카드', () => {
  it('쓴 크기 / 요금제에 든 크기(무료 1 GB)와 비율(내림)', () => {
    expect(storageUsage(250 * 1024 ** 2)).toEqual({
      used: '250 MB',
      included: '1 GB',
      percent: 24,
    });
  });
  it('조금이라도 쓰면 1%(0% 로 보이지 않게)', () => {
    expect(storageUsage(1024).percent).toBe(1);
    expect(storageUsage(0).percent).toBe(0);
  });
});
