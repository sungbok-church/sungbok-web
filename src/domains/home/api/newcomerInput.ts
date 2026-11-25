// 홈 «새가족 등록 · 문의» 접수의 입력(설계 6.11) — 화면과 서버가 같은 스키마. 칸 제한은 DB(newcomers)의 check 와 같다.
// 동의해야 보낼 수 있다. 문의는 방문 예정일을 받지 않는다. 순수 데이터 · 판정.
import { z } from 'zod';

/** 동의 문구의 판 — 문구를 바꾸면 판도 바꾼다(그때 무엇에 동의했는지 DB 에 남는다) */
export const CONSENT_VERSION = '2026-11';

const isDate = (v: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
};

export const newcomerInputSchema = z
  .object({
    intent: z.enum(['register', 'inquiry']),
    name: z.string().trim().min(1, '이름을 넣어 주세요.').max(50, '이름은 50자까지입니다.'),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+][0-9 -]{7,19}$/, '연락처를 숫자로 넣어 주세요.'),
    visit: z
      .string()
      .trim()
      .refine(v => v === '' || isDate(v), '날짜를 다시 골라 주세요.'),
    message: z.string().trim().max(2000, '남기실 말은 2000자까지입니다.'),
    consent: z.literal(true, '개인정보 수집·이용에 동의해 주세요.'),
  })
  .transform(v => (v.intent === 'inquiry' ? { ...v, visit: '' } : v));

export type NewcomerInput = z.input<typeof newcomerInputSchema>;

const MIN = 60_000;
const LIMITS = [
  { count: 3, windowMs: 10 * MIN },
  { count: 10, windowMs: 24 * 60 * MIN },
] as const;

/**
 * 같은 접속(IP 해시)의 최근 접수 시각(최신순)으로 — 더 보내려면 몇 초 기다려야 하는가. 한도 안이면 0.
 * 10분에 3건 · 하루 10건(계획 «내가 정한 값»).
 */
export const rateLimitWait = (recent: readonly string[], now: number): number => {
  let wait = 0;
  for (const { count, windowMs } of LIMITS) {
    const inWindow = recent.map(Date.parse).filter(t => now - t < windowMs);
    if (inWindow.length >= count) {
      const oldest = inWindow.sort((a, b) => b - a)[count - 1];
      wait = Math.max(wait, Math.ceil((oldest + windowMs - now) / 1000));
    }
  }
  return wait;
};

/**
 * 횟수를 세는 접속 단위 — IPv4 는 주소 그대로, IPv6 은 앞 64비트(한 집 · 한 휴대폰이 받는 대역이라 끝자리만 바꿔 피하지 못하게).
 * IPv4 를 담은 IPv6(::ffff:1.2.3.4)은 IPv4 로.
 */
export const rateLimitKey = (ip: string | null): string => {
  if (!ip) return 'unknown';
  const v4 = /^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (v4) return v4[1];
  if (!ip.includes(':')) return ip;
  const [head, tail = ''] = ip.toLowerCase().split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const full = ip.includes('::')
    ? [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right]
    : left;
  return `${full
    .slice(0, 4)
    .map(g => g.replace(/^0+(?=.)/, ''))
    .join(':')}::/64`;
};
