import 'server-only';

import { sendMail } from '@/shared/api/mail.server';
import { fail, type Result } from '@/shared/api/result';
import { createSupabaseAdminClient } from '@/shared/api/supabase/adminClient.server';
import { after } from 'next/server';
import { createHmac } from 'node:crypto';

import { CONSENT_VERSION, newcomerInputSchema, rateLimitKey, rateLimitWait } from './newcomerInput';

// 새가족 접수(설계 6.11) — 방문자에게는 DB 권한을 전혀 주지 않는다(공개 키로 넣기를 열면 이 검사를 건너뛸 수 있다).
// 여기서 검증 · 횟수 제한을 지난 것만 서버 전용 키로 넣는다. 공개 쪽에서 만능 키를 쓰는 파일은 이것 하나다(lint 예외).
// 접수되면 «새가족» 조회 권한이 있는 사람에게 «새 접수 1건» 과 관리자 링크만 보낸다(개인정보는 싣지 않는다). 메일이 실패해도 접수는 성공.

type Context = {
  /** 접속 IP — 그대로 두지 않고 해시만 남긴다 */
  ip: string | null;
  /** 관리자 링크의 사이트 주소(요청 주소) */
  origin: string;
  now?: number;
  /** 응답 뒤에 할 일(알림 메일) — 기본은 next/server 의 after. 메일이 늦어도 접수 응답이 기다리지 않게 */
  defer?: (task: () => Promise<void>) => void;
};

/** 접속(IPv6 은 /64 대역)의 해시 — 비밀 값을 섞어(HMAC) IP 를 거꾸로 찾지 못하게 */
const ipHash = (ip: string | null) =>
  createHmac('sha256', process.env.SUPABASE_SECRET_KEY ?? 'newcomer')
    .update(rateLimitKey(ip))
    .digest('hex');

export const submitNewcomer = async (raw: unknown, ctx: Context): Promise<Result> => {
  // 숨긴 칸 — 사람에게는 보이지 않는다. 채워졌으면 기계가 보낸 것: 넣지 않고 성공처럼(다시 시도하지 않게)
  const website = (raw as { website?: unknown } | null)?.website;
  if (typeof website === 'string' && website.trim() !== '')
    return { ok: true, message: '접수되었습니다.' };

  const parsed = newcomerInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string[]> = {};
    for (const issue of parsed.error.issues)
      (fields[String(issue.path[0] ?? '_')] ??= []).push(issue.message);
    return fail('INVALID_INPUT', { fields });
  }
  const input = parsed.data;
  const db = createSupabaseAdminClient();
  if (!db) return fail('INTERNAL');

  // 먼저 적고 센다 — 읽고 나서 적으면 동시에 보낸 것들이 모두 «아직 0건» 을 보고 통과한다. 적은 뒤 세면 동시에 온 것끼리
  // 서로를 센다. 자기 줄 하나를 빼고 판정하고, 막히면 자기 줄을 지운다 — 막힌 시도가 남으면 안내한 만큼 기다려도 또 막힌다
  // (IP 를 함께 쓰는 교회 와이파이 등). 통과한 줄은 남으니 동시에 보내도 통과는 한도까지만.
  const now = ctx.now ?? Date.now();
  const key = ipHash(ctx.ip);
  const { data: mine, error: writeError } = await db
    .from('submission_attempts')
    .insert({ key_hash: key })
    .select('id')
    .single();
  if (writeError || !mine) return fail('INTERNAL');
  // 접수하지 못하고 끝날 때 자기 줄을 지운다(지우지 못해도 더 엄격해질 뿐)
  const release = () => db.from('submission_attempts').delete().eq('id', mine.id);
  const { data: recent, error: readError } = await db
    .from('submission_attempts')
    .select('id, at')
    .eq('key_hash', key)
    .gte('at', new Date(now - 24 * 60 * 60_000).toISOString())
    .order('at', { ascending: false })
    .limit(11);
  if (readError) {
    await release();
    return fail('INTERNAL');
  }
  // 정확히 자기 줄만 빼고 센다(동시에 보낸 것들의 시각이 자기보다 늦을 수 있다)
  const wait = rateLimitWait(
    (recent ?? []).filter(r => r.id !== mine.id).map(r => r.at),
    now
  );
  if (wait > 0) {
    await release();
    return fail('RATE_LIMITED', { metadata: { retryAfterSec: wait } });
  }

  const { error } = await db.from('newcomers').insert({
    intent: input.intent === 'register' ? 'REGISTER' : 'INQUIRY',
    name: input.name,
    phone: input.phone,
    visit_date: input.visit || null,
    message: input.message || null,
    consent_at: new Date(now).toISOString(),
    consent_version: CONSENT_VERSION,
  });
  if (error) {
    console.error('[newcomer]', error.message);
    await release();
    return fail('INTERNAL');
  }

  (ctx.defer ?? after)(async () => {
    try {
      const { data: emails } = await db.rpc('newcomer_notify_emails');
      await sendMail({
        to: (emails ?? []) as string[],
        subject: '[성복교회] 새가족 접수 1건',
        text: `새가족 등록 · 문의가 1건 접수되었습니다.\n\n관리자 화면에서 확인해 주세요: ${ctx.origin}/admin/newcomers`,
      });
    } catch (e) {
      console.error('[newcomer mail]', e);
    }
  });
  return { ok: true, message: '접수되었습니다.' };
};
