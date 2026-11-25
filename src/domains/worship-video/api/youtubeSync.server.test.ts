import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('../config/worshipPages', () => ({
  WORSHIP_PAGES: { sunday: ['PL-SUN'], friday: ['PL-FRI'] },
  PLAYLIST_PAGES: ['sunday', 'friday'],
}));
const m = vi.hoisted(() => ({
  rows: vi.fn(),
  client: null as unknown,
}));
vi.mock('./youtubePlaylist.server', () => ({ fetchPlaylistRows: m.rows }));
vi.mock('@/shared/api/supabase/adminClient.server', () => ({
  createSupabaseAdminClient: () => m.client,
}));

import { syncAllVideoPages, syncVideoPage, syncVideoPageIfDue } from './youtubeSync.server';

const ROW = {
  video_id: 'aaaaaaaaaaa',
  position: 0,
  title: 't',
  description: '',
  published_at: null,
  added_at: null,
  thumbnail: 'h',
  poster: 'x',
};

const fakeDb = (claim = true) => {
  const rpc = vi.fn(async (name: string) =>
    name === 'claim_youtube_sync'
      ? { data: claim, error: null }
      : { data: 1, error: null as null | { message: string } }
  );
  return { rpc };
};

beforeEach(() => {
  m.rows.mockReset().mockResolvedValue([ROW]);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('syncVideoPage', () => {
  it('차례를 잡으면 재생목록 전체를 받아 그 페이지의 줄을 바꾼다', async () => {
    const db = fakeDb();
    expect(await syncVideoPage(db as never, 'sunday', '10 minutes')).toEqual({
      status: 'synced',
      count: 1,
    });
    expect(db.rpc).toHaveBeenNthCalledWith(1, 'claim_youtube_sync', {
      p_page: 'sunday',
      p_every: '10 minutes',
    });
    expect(m.rows).toHaveBeenCalledWith(['PL-SUN']);
    expect(db.rpc).toHaveBeenNthCalledWith(2, 'replace_youtube_videos', {
      p_page: 'sunday',
      p_rows: [ROW],
    });
  });

  it('재생목록이 0편으로 오면 바꾸지 않고 실패로(실수로 비웠거나 응답이 이상할 때 사이트 목록이 지워지지 않게)', async () => {
    const db = fakeDb();
    m.rows.mockResolvedValue([]);
    expect(await syncVideoPage(db as never, 'sunday', '10 minutes')).toMatchObject({
      status: 'failed',
    });
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });

  it('10분 안에 받았거나 다른 곳이 받는 중이면 유튜브를 부르지 않는다', async () => {
    const db = fakeDb(false);
    expect(await syncVideoPage(db as never, 'sunday', '10 minutes')).toEqual({ status: 'skipped' });
    expect(m.rows).not.toHaveBeenCalled();
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });

  it('유튜브를 받다가 실패하면 줄을 바꾸지 않는다(반쪽 목록으로 지우지 않게) — 실패를 알린다', async () => {
    const db = fakeDb();
    const error = new Error('quota');
    m.rows.mockRejectedValue(error);
    expect(await syncVideoPage(db as never, 'sunday', '10 minutes')).toEqual({
      status: 'failed',
      error,
    });
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });
});

describe('syncVideoPageIfDue — 영상 페이지가 다시 그려질 때', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL_ENV', 'production');
  });

  it('10분 간격으로, 서버 전용 키로', async () => {
    const db = fakeDb();
    m.client = db;
    expect(await syncVideoPageIfDue('sunday')).toMatchObject({ status: 'synced' });
    expect(db.rpc).toHaveBeenCalledWith('claim_youtube_sync', {
      p_page: 'sunday',
      p_every: '10 minutes',
    });
  });

  it('preview 배포는 받지 않는다 — 운영 DB 를 같이 보므로 브랜치의 설정 · 코드로 운영 영상 줄을 바꾸지 않게', async () => {
    m.client = fakeDb();
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(await syncVideoPageIfDue('sunday')).toEqual({ status: 'skipped' });
    expect((m.client as ReturnType<typeof fakeDb>).rpc).not.toHaveBeenCalled();
    expect(m.rows).not.toHaveBeenCalled();
  });

  it('빌드 중에는 받지 않는다 — 빌드는 fetch 를 몰래 캐시해(worker 끼리 공유) 차례 잡기 · 바꾸기가 실제로 돌지 않을 수 있다', async () => {
    m.client = fakeDb();
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    expect(await syncVideoPageIfDue('sunday')).toEqual({ status: 'skipped' });
    expect((m.client as ReturnType<typeof fakeDb>).rpc).not.toHaveBeenCalled();
    expect(m.rows).not.toHaveBeenCalled();
  });

  it('운영 배포 밖(로컬에서 운영 키로 띄운 서버 · 시스템 변수가 없는 배포)은 받지 않는다 — 허용 목록', async () => {
    m.client = fakeDb();
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abcdefghijklmnopqrst.supabase.co');
    expect(await syncVideoPageIfDue('sunday')).toEqual({ status: 'skipped' });
    expect(m.rows).not.toHaveBeenCalled();
  });

  it('로컬 개발(로컬 DB)은 받는다', async () => {
    const db = fakeDb();
    m.client = db;
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
    expect(await syncVideoPageIfDue('sunday')).toMatchObject({ status: 'synced' });
  });

  it('서버 설정(만능 키)이 없으면 받지 않는다 — 개발 서버 · 시험', async () => {
    m.client = null;
    expect(await syncVideoPageIfDue('sunday')).toEqual({ status: 'skipped' });
    expect(m.rows).not.toHaveBeenCalled();
  });
});

describe('syncAllVideoPages — 하루 한 번 예약 작업', () => {
  it('간격과 상관없이 모든 재생목록 페이지를 받는다 — 한 페이지가 실패해도 다음 페이지는 받는다', async () => {
    const db = fakeDb();
    m.rows.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce([ROW]);
    expect(await syncAllVideoPages(db as never)).toEqual({ sunday: 'failed', friday: 'synced' });
    expect(db.rpc).toHaveBeenCalledWith('claim_youtube_sync', { p_page: 'friday', p_every: '0' });
  });
});
