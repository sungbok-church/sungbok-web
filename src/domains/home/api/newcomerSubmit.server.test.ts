import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { submitNewcomer } from './newcomerSubmit.server';

vi.mock('server-only', () => ({}));

const m = vi.hoisted(() => ({
  client: true,
  recent: [] as { id?: number; at: string }[],
  attempts: vi.fn(),
  newcomers: vi.fn(),
  emails: ['a@x.kr'] as string[],
  sendMail: vi.fn(),
  attemptError: null as null | { message: string },
  removed: vi.fn(),
  /** 알림 직전에 본 «최근 10분 안의 다른 접수» 건수 */
  othersRecent: 0,
  othersQuery: vi.fn(),
}));

vi.mock('@/shared/api/mail.server', () => ({ sendMail: m.sendMail }));
vi.mock('@/shared/api/supabase/adminClient.server', () => ({
  createSupabaseAdminClient: () =>
    m.client
      ? {
          from: (table: string) => {
            if (table === 'submission_attempts')
              return {
                select: () => {
                  const c = {
                    eq: () => c,
                    gte: () => c,
                    order: () => c,
                    limit: async () => ({ data: m.recent, error: null }),
                  };
                  return c;
                },
                insert: (row: unknown) => {
                  m.attempts(row);
                  return {
                    select: () => ({
                      single: async () => ({
                        data: m.attemptError ? null : { id: 77 },
                        error: m.attemptError,
                      }),
                    }),
                  };
                },
                delete: () => ({
                  eq: async (_c: string, id: number) => (m.removed(id), { error: null }),
                }),
              };
            return {
              insert: (row: unknown) => ({
                select: () => ({
                  single: async () => {
                    const r = await m.newcomers(row);
                    return { data: r.error ? null : { id: 'n1' }, error: r.error };
                  },
                }),
              }),
              select: () => {
                const c = {
                  lt: (col: string, v: string) => (m.othersQuery('lt', col, v), c),
                  gte: async (col: string, v: string) => (
                    m.othersQuery('gte', col, v),
                    { count: m.othersRecent, error: null }
                  ),
                };
                return c;
              },
            };
          },
          rpc: async () => ({ data: m.emails, error: null }),
        }
      : null,
}));

const NOW = Date.parse('2026-11-25T10:00:00Z');
const input = {
  intent: 'register',
  name: '홍길동',
  phone: '010-1234-5678',
  visit: '2026-11-29',
  message: '처음 가 봅니다',
  consent: true,
};
// 알림은 응답 뒤에 보낸다(after) — 시험에서는 바로 돌리고 끝나기를 기다린다
let deferred: Promise<void> = Promise.resolve();
const ctx = {
  ip: '203.0.113.7',
  origin: 'https://sungbok.or.kr',
  now: NOW,
  defer: (task: () => Promise<void>) => {
    deferred = task();
  },
};

beforeEach(() => {
  vi.stubEnv('SUPABASE_SECRET_KEY', 'secret');
  m.client = true;
  m.recent = [];
  m.newcomers.mockResolvedValue({ error: null });
  m.sendMail.mockResolvedValue({ sent: true });
  m.attemptError = null;
  m.othersRecent = 0;
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe('submitNewcomer', () => {
  it('검증 → 횟수 기록 → 접수(동의 시각 · 판) → 담당자에게 «새 접수 1건» 알림(개인정보 없이)', async () => {
    const res = await submitNewcomer({ ...input, website: '' }, ctx);
    expect(res).toEqual({ ok: true, message: '접수되었습니다.' });
    const attempt = m.attempts.mock.calls[0][0];
    expect(attempt.key_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(attempt.key_hash).not.toContain('203.0.113.7');
    expect(m.newcomers).toHaveBeenCalledWith({
      intent: 'REGISTER',
      name: '홍길동',
      phone: '010-1234-5678',
      visit_date: '2026-11-29',
      message: '처음 가 봅니다',
      consent_at: '2026-11-25T10:00:00.000Z',
      consent_version: '2026-11',
    });
    await deferred;
    const mail = m.sendMail.mock.calls[0][0];
    expect(mail.to).toEqual(['a@x.kr']);
    expect(mail.text).toContain('https://sungbok.or.kr/admin/newcomers');
    expect(JSON.stringify(mail)).not.toMatch(/홍길동|010-1234/);
  });

  it('숨긴 칸(website)이 채워졌으면 기계가 보낸 것 — 넣지 않고 성공처럼', async () => {
    expect(await submitNewcomer({ ...input, website: 'http://spam' }, ctx)).toMatchObject({
      ok: true,
    });
    expect(m.newcomers).not.toHaveBeenCalled();
    expect(m.attempts).not.toHaveBeenCalled();
  });

  it('입력이 틀리면 칸마다 문장', async () => {
    expect(await submitNewcomer({ ...input, consent: false, website: '' }, ctx)).toMatchObject({
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        fields: { consent: ['개인정보 수집·이용에 동의해 주세요.'] },
      },
    });
  });

  it('같은 접속에서 너무 많이 보내면 기다릴 초와 함께 막는다 — 먼저 적고 센다(자기 줄 포함, 동시에 보내도 함께 막힌다)', async () => {
    // 읽을 때는 이미 자기 줄이 들어가 있다(맨 앞)
    m.recent = [0, 1, 2, 3].map(min => ({
      id: min === 0 ? 77 : min,
      at: new Date(NOW - min * 60_000).toISOString(),
    }));
    expect(await submitNewcomer({ ...input, website: '' }, ctx)).toMatchObject({
      ok: false,
      error: { code: 'RATE_LIMITED', metadata: { retryAfterSec: 420 } },
    });
    expect(m.attempts).toHaveBeenCalled();
    expect(m.newcomers).not.toHaveBeenCalled();
    // 막힌 시도는 자기 줄을 지운다 — 안내한 만큼 기다린 뒤에는 통과하게(막힌 줄이 다음 대기를 늘리지 않게)
    expect(m.removed).toHaveBeenCalledWith(77);
  });

  it('안내받은 시간만큼 기다린 뒤에는 통과한다', async () => {
    // 앞선 3건이 7 · 8 · 9분 전 + 자기 줄 → 10분 안 3건이라 막힌다. 다시 1 · 2 · 3 → 막힘. 11분 뒤에는 통과
    m.recent = [0, 11, 12, 13].map(min => ({
      id: min === 0 ? 77 : min,
      at: new Date(NOW - min * 60_000).toISOString(),
    }));
    expect(await submitNewcomer({ ...input, website: '' }, ctx)).toMatchObject({ ok: true });
    expect(m.removed).not.toHaveBeenCalled();
  });

  it('횟수 기록을 남기지 못하면 접수하지 않는다(제한이 말없이 꺼지지 않게)', async () => {
    m.attemptError = { message: 'x' };
    expect(await submitNewcomer({ ...input, website: '' }, ctx)).toMatchObject({ ok: false });
    expect(m.newcomers).not.toHaveBeenCalled();
  });

  it('자기 줄이 맨 앞이 아니어도(동시에 보낸 것이 더 늦게 적힘) 정확히 자기 줄만 빼고 센다', async () => {
    // 앞선 2건(1 · 2분 전) + 동시에 온 1건(지금) + 자기(77) — 자기를 빼면 10분 안 3건이라 막힌다
    m.recent = [
      { id: 78, at: new Date(NOW).toISOString() },
      { id: 77, at: new Date(NOW - 1000).toISOString() },
      { id: 70, at: new Date(NOW - 60_000).toISOString() },
      { id: 69, at: new Date(NOW - 120_000).toISOString() },
    ];
    expect(await submitNewcomer({ ...input, website: '' }, ctx)).toMatchObject({
      ok: false,
      error: { code: 'RATE_LIMITED', metadata: { retryAfterSec: 480 } },
    });
  });

  it('접수를 넣지 못하면 자기 줄을 지운다(실패가 한도를 차지하지 않게)', async () => {
    m.newcomers.mockResolvedValue({ error: { message: 'x' } });
    expect(await submitNewcomer({ ...input, website: '' }, ctx)).toMatchObject({ ok: false });
    expect(m.removed).toHaveBeenCalledWith(77);
  });

  it('10분 안에 다른 접수가 있었으면 알림을 또 보내지 않는다(몰려 와도 메일은 한 통)', async () => {
    m.othersRecent = 2;
    expect(await submitNewcomer({ ...input, website: '' }, ctx)).toMatchObject({ ok: true });
    await deferred;
    expect(m.sendMail).not.toHaveBeenCalled();
    // 나보다 먼저 들어온 것만 센다(id 는 시각 순) — 동시에 온 두 건이 서로를 보고 둘 다 건너뛰지 않게
    expect(m.othersQuery).toHaveBeenCalledWith('lt', 'id', 'n1');
    expect(m.othersQuery).toHaveBeenCalledWith(
      'gte',
      'created_at',
      new Date(NOW - 10 * 60_000).toISOString()
    );
  });

  it('메일이 실패해도 접수는 성공', async () => {
    m.sendMail.mockRejectedValue(new Error('down'));
    expect(await submitNewcomer({ ...input, website: '' }, ctx)).toMatchObject({ ok: true });
    await expect(deferred).resolves.toBeUndefined();
  });

  it('서버 설정(만능 키)이 없으면 접수하지 못한다고 알린다', async () => {
    m.client = false;
    expect(await submitNewcomer({ ...input, website: '' }, ctx)).toMatchObject({ ok: false });
  });
});
