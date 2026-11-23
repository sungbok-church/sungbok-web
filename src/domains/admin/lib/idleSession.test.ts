import { describe, expect, it } from 'vitest';

import { IDLE_LIMIT_MS, isIdle } from './idleSession';

describe('isIdle', () => {
  const now = Date.UTC(2026, 10, 19, 12);

  it('8시간', () => {
    expect(IDLE_LIMIT_MS).toBe(8 * 60 * 60 * 1000);
  });

  it('기록이 없으면 아니다(막 로그인한 경우)', () => {
    expect(isIdle(undefined, now)).toBe(false);
  });

  it('8시간 정각까지는 아니고, 넘으면 맞다', () => {
    expect(isIdle(String(now - IDLE_LIMIT_MS), now)).toBe(false);
    expect(isIdle(String(now - IDLE_LIMIT_MS - 1), now)).toBe(true);
  });

  it('깨진 값은 오래 쉰 것으로 본다(다시 로그인)', () => {
    expect(isIdle('abc', now)).toBe(true);
    expect(isIdle(String(now + 60_000), now)).toBe(true); // 미래 시각
  });
});
