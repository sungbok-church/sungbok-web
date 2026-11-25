import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendMail } from './mail.server';

vi.mock('server-only', () => ({}));

afterEach(() => vi.unstubAllEnvs());

describe('sendMail — 메일 보내기는 한곳(설계 12절 1번, Resend)', () => {
  it('키 · 보내는 주소가 없으면 보내지 않는다(아직 DNS 인증 전)', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const fetcher = vi.fn();
    expect(await sendMail({ to: ['a@x.kr'], subject: 's', text: 't' }, fetcher)).toEqual({
      sent: false,
      reason: 'not-configured',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('받는 사람이 없으면 보내지 않는다', async () => {
    vi.stubEnv('RESEND_API_KEY', 'k');
    vi.stubEnv('MAIL_FROM', '성복교회 <noreply@sungbok.or.kr>');
    expect(await sendMail({ to: [], subject: 's', text: 't' }, vi.fn())).toEqual({
      sent: false,
      reason: 'no-recipients',
    });
  });
  it('Resend 로 보낸다 — 받는 사람끼리 서로 보이지 않게 한 사람씩(bcc)', async () => {
    vi.stubEnv('RESEND_API_KEY', 'k');
    vi.stubEnv('MAIL_FROM', '성복교회 <noreply@sungbok.or.kr>');
    const fetcher = vi.fn(async () => new Response('{}', { status: 200 }));
    expect(
      await sendMail({ to: ['a@x.kr', 'b@x.kr'], subject: '새 접수', text: '1건' }, fetcher)
    ).toEqual({
      sent: true,
    });
    expect(fetcher).toHaveBeenCalledWith('https://api.resend.com/emails', {
      method: 'POST',
      signal: expect.any(AbortSignal),
      headers: { Authorization: 'Bearer k', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '성복교회 <noreply@sungbok.or.kr>',
        to: ['성복교회 <noreply@sungbok.or.kr>'],
        bcc: ['a@x.kr', 'b@x.kr'],
        subject: '새 접수',
        text: '1건',
      }),
    });
  });
  it('실패해도 던지지 않는다', async () => {
    vi.stubEnv('RESEND_API_KEY', 'k');
    vi.stubEnv('MAIL_FROM', 'x@y.kr');
    const fetcher = vi.fn(async () => new Response('bad', { status: 422 }));
    expect(await sendMail({ to: ['a@x.kr'], subject: 's', text: 't' }, fetcher)).toEqual({
      sent: false,
      reason: 'failed',
    });
  });
});
