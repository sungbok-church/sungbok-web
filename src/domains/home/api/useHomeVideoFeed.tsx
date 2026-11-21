// 홈 영상 피드 — 서버가 미리 그린 피드(initial)로 첫 화면을 그리고, 브라우저에 붙은 뒤에는 `/api/home-video` 를
// 60초 간격으로 다시 확인한다(유튜브는 직접 부르지 않는다). react-query 는 그리는 중에 지금 시각을 읽어 미리 그리기(빌드)에
// 쓸 수 없으므로 브라우저에 붙은 뒤에만 돈다(ADR 0024). 라이브 스테이지 · 광고 릴은 useHomeVideoFeed 로 같은 값을 읽는다.
'use client';

import { fetchJson, retryTransient } from '@/shared/api/fetchJson';
import { useIsClient } from '@/shared/lib/hooks/useIsClient';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  HOME_VIDEO_QUERY_KEY,
  isLiveStale,
  LIVE_MAX_AGE,
  type HomeVideoFeed,
  type HomeVideoFeedData,
} from './homeVideoFeed';

const fetchFeed = () => fetchJson<HomeVideoFeedData>('/api/home-video');

type FeedState = {
  data?: HomeVideoFeedData;
  dataUpdatedAt: number;
  errorUpdatedAt: number;
  isError: boolean;
  error: unknown;
};

// 라이브는 영상 정보 나이(서버가 잰 staleMs) + 받은 뒤 흐른 시간(마지막 확인 시각까지)이 10분을 넘으면 내린다 —
// 쿼터 소진 등으로 실패가 이어질 때 끝난 라이브가 «ON AIR» 로 남지 않게. 설교·광고는 지난 것이어도 그대로 둔다.
// 지금 시각(Date.now) 대신 react-query 가 기록한 시각을 써서, 서버 HTML 과 첫 화면이 같은 판단을 한다(하이드레이션 어긋남 없음).
// 알고 둔 한계: 오래 묵은 미리 그린 홈은 첫 화면에 끝난 라이브가 보일 수 있다 — 미리 그린 피드는 마운트 즉시
// 다시 받으므로 1초 안에 바로잡힌다(첫 화면에서 기기 시계로 숨기면 방송 중 라이브가 깜빡인다).
const toFeed = (q: FeedState): HomeVideoFeed => {
  const lastCheckedAt = Math.max(q.dataUpdatedAt, q.errorUpdatedAt);
  const liveExpired = !!q.data && isLiveStale(q.data.staleMs, lastCheckedAt - q.dataUpdatedAt);
  return q.data
    ? {
        status: 'ready',
        live: liveExpired ? null : q.data.live,
        sermon: q.data.sermon,
        notices: q.data.notices,
        error: null,
      }
    : {
        status: q.isError ? 'error' : 'loading',
        live: null,
        sermon: null,
        notices: [],
        error: q.error ? String(q.error) : null,
      };
};

/**
 * react-query 로 60초마다 다시 확인하는 피드 — 브라우저에 붙은 뒤에만 쓴다(HomeVideoFeedProvider).
 * initial 은 서버가 미리 그린 피드 — 있으면 첫 값으로 쓰고, 붙자마자 한 번 다시 받는다.
 */
export const useHomeVideoQuery = (initial?: HomeVideoFeedData): HomeVideoFeed => {
  const q = useQuery({
    // 서버가 그린 피드로 시작한다. 그 피드에는 만든 시각이 없다(같은 영상이면 같은 홈이어야 ISR 쓰기가 안 생긴다 — toShellFeed).
    // 몇 시간 묵었을 수도 있으니 받은 시각을 0 으로 두어 붙자마자 다시 받는다(라이브 시작 · 종료가 60초 늦게 바로잡히지 않게).
    initialData: initial,
    initialDataUpdatedAt: initial ? 0 : undefined,
    queryKey: HOME_VIDEO_QUERY_KEY,
    queryFn: fetchFeed,
    // 받은 영상 정보가 이미 10분 넘은 것(서버 캐시의 옛 응답)이면 60초 기다리지 않고 마운트 즉시 다시 받는다 —
    // 방송 시작 무렵 한산할 때 옛 응답 때문에 라이브가 1분 넘게 빠져 보이지 않게
    staleTime: ({ state }) => (state.data && state.data.staleMs > LIVE_MAX_AGE ? 0 : 60_000),
    refetchInterval: 60_000,
    gcTime: 30 * 60_000,
    // 짧은 앱 전환은 재조회하지 않는다. 오래 비웠으면 받은 화면을 유지하며 확인한다.
    // 오류 직후 복귀도 반복 요청하지 않게 마지막 성공/실패 확인 시각을 함께 본다.
    refetchOnWindowFocus: query =>
      Date.now() - Math.max(query.state.dataUpdatedAt, query.state.errorUpdatedAt) >= 60_000,
    refetchIntervalInBackground: false,
    // 다시 해서 풀릴 실패(망 끊김·503)만 재시도 — 쿼터 소진(429)에 기본 3회 재시도로 쿼터를 더 태우지 않게
    retry: retryTransient,
  });
  const { data, dataUpdatedAt, errorUpdatedAt, isError, error } = q;
  return useMemo(
    () => toFeed({ data, dataUpdatedAt, errorUpdatedAt, isError, error }),
    [data, dataUpdatedAt, errorUpdatedAt, isError, error]
  );
};

const LOADING = toFeed({ dataUpdatedAt: 0, errorUpdatedAt: 0, isError: false, error: null });
const FeedContext = createContext<HomeVideoFeed>(LOADING);

/**
 * 홈 영상 영역 — 서버가 미리 그린 피드(initial)를 첫 값으로 내려 주고, 브라우저에 붙으면 60초마다 다시 확인한 값으로 바꾼다.
 * 첫 화면(서버 HTML · 하이드레이션)은 initial 만으로 판단한다 — 둘이 같은 값을 그린다. initial 이 없으면(서버가 못 받음)
 * 불러오는 중으로 시작해 브라우저가 받는다.
 */
export const HomeVideoFeedProvider = ({
  initial,
  children,
}: {
  initial: HomeVideoFeedData | undefined;
  children: ReactNode;
}) => {
  const isClient = useIsClient();
  const [polled, setPolled] = useState<HomeVideoFeed | null>(null);
  const first = useMemo(
    () =>
      toFeed({ data: initial, dataUpdatedAt: 0, errorUpdatedAt: 0, isError: false, error: null }),
    [initial]
  );
  return (
    <FeedContext.Provider value={polled ?? first}>
      {isClient && <Poller initial={initial} onChange={setPolled} />}
      {children}
    </FeedContext.Provider>
  );
};

const Poller = ({
  initial,
  onChange,
}: {
  initial: HomeVideoFeedData | undefined;
  onChange: (feed: HomeVideoFeed) => void;
}) => {
  const feed = useHomeVideoQuery(initial);
  useEffect(() => onChange(feed), [feed, onChange]);
  return null;
};

/** 라이브 스테이지 · 광고 릴이 읽는 홈 영상 피드(HomeVideoFeedProvider 안에서) */
export const useHomeVideoFeed = (): HomeVideoFeed => useContext(FeedContext);
