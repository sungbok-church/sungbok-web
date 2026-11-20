import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { failureCacheLife, settle, unwrap } from './settled.server';
import { YoutubeApiError, YoutubeNetworkError, YoutubeShapeError } from './youtubeApi.server';

const fail = (e: unknown) => async (): Promise<number> => {
  throw e;
};
// 캐시에 넣는 값은 직렬화되어야 한다 — 오류도 평범한 객체로 바뀌었다가 밖에서 원래 종류로 돌아와야 한다
const roundTrip = async (e: unknown) => {
  const settled = await settle(fail(e));
  expect(settled.ok).toBe(false);
  expect(JSON.parse(JSON.stringify(settled))).toEqual(settled);
  try {
    unwrap(settled);
  } catch (thrown) {
    return thrown;
  }
  throw new Error('unwrap 이 던지지 않았다');
};

describe('settle · unwrap — 캐시 안에서는 던지지 않고, 밖에서 원래 오류로 다시 던진다', () => {
  it('성공하면 그 값', async () => {
    const settled = await settle(async () => [1, 2]);
    expect(settled).toEqual({ ok: true, value: [1, 2] });
    expect(unwrap(settled)).toEqual([1, 2]);
  });

  it('유튜브 응답 오류는 경로 · 상태 · 사유까지 그대로 돌아온다(쿼터 소진 429 판단에 쓴다)', async () => {
    const e = await roundTrip(new YoutubeApiError('playlistItems', 403, 'quotaExceeded'));
    expect(e).toBeInstanceOf(YoutubeApiError);
    expect(e).toMatchObject({ path: 'playlistItems', status: 403, reason: 'quotaExceeded' });
  });

  it('망 오류 · 응답 모양 오류도 같은 종류로 돌아온다', async () => {
    expect(await roundTrip(new YoutubeNetworkError('videos', new Error('down')))).toBeInstanceOf(
      YoutubeNetworkError
    );
    const shape = await roundTrip(new YoutubeShapeError('videos', 'items 가 배열이 아님'));
    expect(shape).toBeInstanceOf(YoutubeShapeError);
    expect(shape).toMatchObject({ detail: 'items 가 배열이 아님' });
  });

  it('그 밖의 오류(코드 버그 등)는 문장만 가진 Error 로', async () => {
    const e = await roundTrip(new TypeError('x is undefined'));
    expect(e).toBeInstanceOf(Error);
    expect((e as Error).message).toBe('x is undefined');
  });
});

describe('failureCacheLife — 실패를 캐시에 둘 시간(만료는 두지 않는다: 만료가 지나면 직전 페이지 없이 요청이 기다린다)', () => {
  const lifeOf = async (e: unknown) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const settled = await settle(fail(e));
    if (settled.ok) throw new Error('실패여야 한다');
    return failureCacheLife(settled);
  };

  it('잠깐의 실패(망 끊김 · 5xx · 속도 제한)는 5초 뒤 다시 — 화면의 재시도가 같은 실패를 받지 않게', async () => {
    expect(await lifeOf(new YoutubeNetworkError('videos', null))).toEqual({
      stale: 30,
      revalidate: 5,
    });
    expect(await lifeOf(new YoutubeApiError('videos', 503))).toEqual({ stale: 30, revalidate: 5 });
    expect(await lifeOf(new YoutubeApiError('videos', 403, 'rateLimitExceeded'))).toEqual({
      stale: 30,
      revalidate: 5,
    });
  });

  it('쿼터 소진 · 그 밖의 실패는 1분 뒤 다시 — 쿼터를 더 태우지 않게', async () => {
    expect(await lifeOf(new YoutubeApiError('videos', 403, 'quotaExceeded'))).toEqual({
      stale: 30,
      revalidate: 60,
    });
    expect(await lifeOf(new TypeError('bug'))).toEqual({ stale: 30, revalidate: 60 });
  });
});
