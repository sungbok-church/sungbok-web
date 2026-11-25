import { describe, expect, it } from 'vitest';

import { newcomerInputSchema, rateLimitKey, rateLimitWait } from './newcomerInput';

const valid = {
  intent: 'register',
  name: ' 홍길동 ',
  phone: '010-1234-5678',
  visit: '2026-11-29',
  message: '',
  consent: true,
};

describe('newcomerInputSchema — 홈 «새가족 등록 · 문의» 접수', () => {
  it('이름 · 연락처 · 동의가 있으면 된다(방문 예정일 · 남기실 말은 선택)', () => {
    expect(newcomerInputSchema.parse(valid)).toMatchObject({ name: '홍길동', visit: '2026-11-29' });
    expect(newcomerInputSchema.safeParse({ ...valid, visit: '', message: '' }).success).toBe(true);
  });
  it('문의는 방문 예정일을 받지 않는다(보내도 비운다)', () => {
    expect(newcomerInputSchema.parse({ ...valid, intent: 'inquiry' }).visit).toBe('');
  });
  it('동의하지 않으면 · 연락처가 숫자가 아니면 · 없는 날짜면 안 된다', () => {
    const msg = (v: object) =>
      newcomerInputSchema.safeParse({ ...valid, ...v }).error?.issues[0]?.message;
    expect(msg({ consent: false })).toBe('개인정보 수집·이용에 동의해 주세요.');
    expect(msg({ phone: '전화주세요' })).toBe('연락처를 숫자로 넣어 주세요.');
    expect(msg({ name: ' ' })).toBe('이름을 넣어 주세요.');
    expect(msg({ visit: '2026-02-30' })).toBe('날짜를 다시 골라 주세요.');
  });
});

describe('rateLimitWait — 같은 접속에서 10분에 3건 · 하루 10건', () => {
  const now = Date.parse('2026-11-25T10:00:00Z');
  const ago = (min: number) => new Date(now - min * 60_000).toISOString();
  it('한도 안이면 0', () => {
    expect(rateLimitWait([ago(1), ago(2)], now)).toBe(0);
    expect(rateLimitWait([], now)).toBe(0);
  });
  it('10분에 3건이면 가장 오래된 것이 10분을 넘길 때까지(초)', () => {
    expect(rateLimitWait([ago(1), ago(2), ago(4)], now)).toBe(6 * 60);
  });
  it('하루 10건이면 하루 전 것이 빠질 때까지', () => {
    const day = Array.from({ length: 10 }, (_, i) => ago(60 * (i + 1)));
    expect(rateLimitWait(day, now)).toBe(14 * 60 * 60);
  });
});

describe('rateLimitKey — 횟수를 세는 접속 단위', () => {
  it('IPv4 는 그대로, IPv6 은 앞 64비트(한 집 · 한 휴대폰이 받는 대역 — 끝자리만 바꿔 피하지 못하게)', () => {
    expect(rateLimitKey('203.0.113.7')).toBe('203.0.113.7');
    expect(rateLimitKey('2001:db8:85a3:12:8a2e:370:7334:1')).toBe('2001:db8:85a3:12::/64');
    expect(rateLimitKey('2001:db8::1')).toBe('2001:db8:0:0::/64');
    expect(rateLimitKey('::ffff:203.0.113.7')).toBe('203.0.113.7');
    expect(rateLimitKey(null)).toBe('unknown');
  });
});
