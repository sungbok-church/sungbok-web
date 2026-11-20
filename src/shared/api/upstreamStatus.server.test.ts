import { describe, expect, it, vi } from 'vitest';

import { upstreamErrorResponse, upstreamStatus } from './upstreamStatus.server';
import { YoutubeApiError, YoutubeNetworkError, YoutubeShapeError } from './youtubeApi.server';

describe('upstreamStatus — 유튜브 실패를 우리 API 응답 상태로', () => {
  it('하루 쿼터 소진은 429 — 화면이 다시 시도하지 않게(쿼터를 더 태우지 않음)', () => {
    expect(upstreamStatus(new YoutubeApiError('videos', 403, 'quotaExceeded'))).toBe(429);
    expect(upstreamStatus(new YoutubeApiError('videos', 403, 'dailyLimitExceeded'))).toBe(429);
  });

  it('짧은 속도 제한·유튜브 일시 장애(5xx)·유튜브에 닿지 못함은 503 — 잠시 뒤 풀린다', () => {
    expect(upstreamStatus(new YoutubeApiError('videos', 403, 'rateLimitExceeded'))).toBe(503);
    expect(upstreamStatus(new YoutubeApiError('videos', 403, 'userRateLimitExceeded'))).toBe(503);
    expect(upstreamStatus(new YoutubeApiError('videos', 500))).toBe(503);
    expect(upstreamStatus(new YoutubeApiError('videos', 429))).toBe(503); // 이유를 못 읽은 HTTP 429
    expect(upstreamStatus(new YoutubeNetworkError('videos', new TypeError('fetch failed')))).toBe(
      503
    );
  });

  it('응답 모양 오류(YoutubeShapeError)는 502 — 다시 받아도 같은 모양이라 재시도하지 않는다', () => {
    expect(upstreamStatus(new YoutubeShapeError('videos', 'items.0.id: expected string'))).toBe(
      502
    );
  });

  it('그 밖의 유튜브 4xx(키 오류·잘못된 요청)는 502 — 다시 해도 같다', () => {
    expect(upstreamStatus(new YoutubeApiError('videos', 400))).toBe(502);
    expect(upstreamStatus(new YoutubeApiError('videos', 403, 'forbidden'))).toBe(502);
  });

  it('우리 코드 버그(TypeError 포함)는 502 — 일시 장애로 착각해 재시도하지 않게', () => {
    expect(
      upstreamStatus(new TypeError("Cannot read properties of undefined (reading 'map')"))
    ).toBe(502);
    expect(upstreamStatus(new Error('boom'))).toBe(502);
  });
});

describe('upstreamErrorResponse — 공용 실패 모양 + 상태', () => {
  it('쿼터 소진은 429 QUOTA_EXCEEDED, 일시 장애 503 SERVICE_UNAVAILABLE, 그 밖 502 UPSTREAM_ERROR', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const quota = upstreamErrorResponse(new YoutubeApiError('/videos', 403, 'quotaExceeded'));
    expect(quota.status).toBe(429);
    expect(await quota.json()).toMatchObject({ ok: false, error: { code: 'QUOTA_EXCEEDED' } });
    const down = upstreamErrorResponse(new YoutubeNetworkError('/videos', new Error('x')));
    expect(down.status).toBe(503);
    expect(await down.json()).toMatchObject({ ok: false, error: { code: 'SERVICE_UNAVAILABLE' } });
    const bug = upstreamErrorResponse(new TypeError('x'));
    expect(bug.status).toBe(502);
    expect(await bug.json()).toMatchObject({ ok: false, error: { code: 'UPSTREAM_ERROR' } });
  });
});
