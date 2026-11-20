// 서버 캐시('use cache') 안의 실패를 «값» 으로 담는다(ADR 0024).
// 캐시 안에서 던지면 Next 가 그 실패를 페이지 그리기 오류로 기록해, 바깥에서 잡아도 빌드가 멈춘다(유튜브가 막힌 날 배포 실패).
// 그래서 캐시 함수는 settle 로 성공 · 실패를 평범한 객체로 돌려주고(캐시는 직렬화된 값만 담는다), 바깥에서 unwrap 으로
// 원래 종류의 오류로 다시 던진다 — 받는 쪽(loadForPage · Route Handler 의 upstreamStatus)은 지금까지처럼 오류를 본다.
import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다

import { upstreamStatus } from './upstreamStatus.server';
import { YoutubeApiError, YoutubeNetworkError, YoutubeShapeError } from './youtubeApi.server';

type SettledError =
  | { kind: 'youtube-api'; path: string; status: number; reason?: string }
  | { kind: 'youtube-network'; path: string }
  | { kind: 'youtube-shape'; path: string; detail: string }
  | { kind: 'other'; message: string };

export type Settled<T> = { ok: true; value: T } | { ok: false; error: SettledError };

const toPlain = (e: unknown): SettledError => {
  if (e instanceof YoutubeApiError)
    return {
      kind: 'youtube-api',
      path: e.path,
      status: e.status,
      ...(e.reason ? { reason: e.reason } : {}),
    };
  if (e instanceof YoutubeNetworkError) return { kind: 'youtube-network', path: e.path };
  if (e instanceof YoutubeShapeError)
    return { kind: 'youtube-shape', path: e.path, detail: e.detail };
  return { kind: 'other', message: e instanceof Error ? e.message : String(e) };
};

const fromPlain = (e: SettledError): Error => {
  switch (e.kind) {
    case 'youtube-api':
      return new YoutubeApiError(e.path, e.status, e.reason);
    case 'youtube-network':
      return new YoutubeNetworkError(e.path, undefined);
    case 'youtube-shape':
      return new YoutubeShapeError(e.path, e.detail);
    case 'other':
      return new Error(e.message);
  }
};

/**
 * 실패를 담은 캐시의 수명 — 잠깐의 실패(망 끊김 · 5xx · 속도 제한, 우리 API 의 503)는 5초, 쿼터 소진 · 그 밖은 1분 뒤 다시 해 본다.
 * 만료(expire)는 두지 않는다 — 페이지의 만료는 그 안 캐시 중 가장 짧은 것을 따르는데, 만료가 지난 페이지는 직전 페이지 없이
 * 요청이 새로 그려질 때까지 기다리고, 그때도 실패하면 오류 화면이 된다(쿼터가 바닥난 날 배포한 뒤 조용한 시간마다).
 * stale 30초 이상이어야 미리 그리기에서 빠지지 않는다(cacheLife 문서 «Prerendering behavior»).
 */
export const failureCacheLife = (settled: Extract<Settled<unknown>, { ok: false }>) =>
  upstreamStatus(fromPlain(settled.error)) === 503
    ? { stale: 30, revalidate: 5 }
    : { stale: 30, revalidate: 60 };

/** load 를 돌려 성공 · 실패를 값으로 — 던지지 않는다. 실패의 원인은 여기서 서버 로그에 남긴다(캐시 밖에서는 종류만 남는다). */
export const settle = async <T>(load: () => Promise<T>): Promise<Settled<T>> => {
  try {
    return { ok: true, value: await load() };
  } catch (error) {
    console.error('[settle]', error);
    return { ok: false, error: toPlain(error) };
  }
};

/** 성공이면 값, 실패면 원래 종류의 오류로 다시 던진다 */
export const unwrap = <T>(settled: Settled<T>): T => {
  if (settled.ok) return settled.value;
  throw fromPlain(settled.error);
};
