import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const m = vi.hoisted(() => ({ run: vi.fn(), client: {} as object | null }));
vi.mock('@/shared/api/dailyCleanup.server', () => ({ runDailyCleanup: m.run }));
const videos = vi.hoisted(() => ({ sync: vi.fn() }));
vi.mock('@/domains/worship-video/api/youtubeSync.server', () => ({
  syncAllVideoPages: videos.sync,
}));
vi.mock('@/shared/api/supabase/adminClient.server', () => ({
  createSupabaseAdminClient: () => m.client,
}));
const connection = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('next/server', async importOriginal => ({
  ...(await importOriginal<typeof import('next/server')>()),
  connection,
}));

import { GET } from './route';

const call = (auth?: string) =>
  GET(new Request('https://x/api/cron/daily', auth ? { headers: { authorization: auth } } : {}));

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 's3cret-value');
  m.client = {};
  m.run.mockResolvedValue({ ok: true, rows: { bulletins: 0 }, files: 0 });
  videos.sync.mockResolvedValue({ sunday: 'synced' });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('GET /api/cron/daily', () => {
  it('비밀 값(Vercel Cron 이 붙이는 Bearer)이 맞을 때만 돈다', async () => {
    expect((await call()).status).toBe(401);
    expect((await call('Bearer wrong')).status).toBe(401);
    // 길이가 같은 틀린 값 — 고정 시간 비교(timingSafeEqual)까지 가서 막힌다
    expect((await call('Bearer s3cret-valuX')).status).toBe(401);
    expect(m.run).not.toHaveBeenCalled();
    const ok = await call('Bearer s3cret-value');
    expect(ok.status).toBe(200);
    expect(m.run).toHaveBeenCalledTimes(1);
  });

  it('preview 배포에서는 돌지 않는다 — 운영 DB 를 같이 보므로 브랜치 코드로 운영 행 · 파일 · 영상을 지우거나 바꾸지 않게', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    const r = await call('Bearer s3cret-value');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, skipped: 'preview' });
    expect(m.run).not.toHaveBeenCalled();
    expect(videos.sync).not.toHaveBeenCalled();
  });

  it('비밀 값이 설정되지 않았으면 누구도 부르지 못한다', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect((await call('Bearer ')).status).toBe(401);
    expect(m.run).not.toHaveBeenCalled();
  });

  it('정리 뒤 유튜브 재생목록도 받는다 — 하나라도 실패하면 500', async () => {
    const ok = await call('Bearer s3cret-value');
    expect(videos.sync).toHaveBeenCalledTimes(1);
    expect(await ok.json()).toMatchObject({ ok: true, videos: { sunday: 'synced' } });
    videos.sync.mockResolvedValue({ sunday: 'failed' });
    expect((await call('Bearer s3cret-value')).status).toBe(500);
  });

  it('정리가 실패해도 재생목록은 받는다', async () => {
    m.run.mockResolvedValue({ ok: false, error: 'down' });
    expect((await call('Bearer s3cret-value')).status).toBe(500);
    expect(videos.sync).toHaveBeenCalledTimes(1);
  });

  it('정리가 실패하면 500 — Vercel 의 예약 작업 기록에 실패로 남는다', async () => {
    m.run.mockResolvedValue({ ok: false, error: 'down' });
    expect((await call('Bearer s3cret-value')).status).toBe(500);
  });

  it('서버 설정(만능 키)이 없으면 500', async () => {
    m.client = null;
    expect((await call('Bearer s3cret-value')).status).toBe(500);
    expect(m.run).not.toHaveBeenCalled();
  });
});
