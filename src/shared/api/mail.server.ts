import 'server-only';

// 메일 보내기(설계 12절 1번) — 보내는 코드는 여기 한곳이라 발송 수단을 바꿀 때 이 파일만 고친다. 지금은 Resend(HTTP API).
// RESEND_API_KEY · MAIL_FROM 이 없으면 보내지 않는다 — sungbok.or.kr 의 DNS 인증(Cafe24)이 끝나 키를 넣으면 코드 변경 없이 켜진다.
// 실패해도 던지지 않는다(메일은 알림일 뿐 — 접수 같은 본 작업은 이미 끝났다). 받는 사람끼리 주소가 보이지 않게 bcc 로.

type Mail = { to: readonly string[]; subject: string; text: string };
type Sent = { sent: true } | { sent: false; reason: 'not-configured' | 'no-recipients' | 'failed' };

export const sendMail = async (mail: Mail, fetcher: typeof fetch = fetch): Promise<Sent> => {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (!key || !from) return { sent: false, reason: 'not-configured' };
  if (mail.to.length === 0) return { sent: false, reason: 'no-recipients' };
  try {
    const res = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      // 메일 서비스가 늦어도 오래 붙잡지 않는다
      signal: AbortSignal.timeout(5000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [from],
        bcc: mail.to,
        subject: mail.subject,
        text: mail.text,
      }),
    });
    if (res.ok) return { sent: true };
    console.error('[mail]', res.status, await res.text().catch(() => ''));
  } catch (error) {
    console.error('[mail]', error);
  }
  return { sent: false, reason: 'failed' };
};
