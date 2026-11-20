import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { loadForPage } from './loadForPage.server';

const failing = async (): Promise<number> => {
  throw new Error('quota');
};
const runtime = () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PHASE', 'phase-production-server');
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('loadForPage — 미리 그리는 페이지의 데이터 받기 실패 규칙', () => {
  it('받으면 그 값을 돌려준다', async () => {
    expect(await loadForPage(async () => [1, 2])).toEqual([1, 2]);
  });

  it('빌드 중 실패는 넘기고 undefined — 화면이 브라우저에서 받는다(유튜브가 막힌 날에도 배포는 된다)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await loadForPage(failing)).toBeUndefined();
  });

  it('개발 서버의 실패도 넘긴다', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await loadForPage(failing)).toBeUndefined();
  });

  it('운영에서 다시 그리는 중의 실패는 던진다 — 직전에 잘 그린 페이지를 계속 보여 준다', async () => {
    runtime();
    await expect(loadForPage(failing)).rejects.toThrow('quota');
  });

  it('keepPrevious: false 면 운영 중에도 넘긴다 — 직전 페이지가 없는 첫 방문(영상 한 편)', async () => {
    runtime();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await loadForPage(failing, { keepPrevious: false })).toBeUndefined();
  });

  it('넘긴 실패는 원인을 서버 로그에 남긴다', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await loadForPage(failing);
    expect(log).toHaveBeenCalledWith('[loadForPage]', expect.any(Error));
  });
});
