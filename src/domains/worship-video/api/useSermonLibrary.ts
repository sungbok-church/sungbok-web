// 예배 설교 훅 — 서버 Route Handler 에서 받는다(유튜브는 직접 부르지 않는다: 키·쿼터는 서버에만).
// 서버가 받아 넘긴 목록 · 설명이 없을 때만 쓴다(빌드 중 유튜브 실패 등) — 보통은 서버가 props 로 넘겨 HTML 에 그린다(ADR 0024).
// useQuery(서스펜스 아님): 서버 렌더 중에는 요청하지 않고, 실패한 쿼리는 다시 열 때(재마운트) 알아서 다시 받는다.
'use client';

import { fetchJson, retryTransient } from '@/shared/api/fetchJson';
import { useQuery } from '@tanstack/react-query';

import type { VideoPage } from '../config/worshipPages';
import {
  sermonDescriptionQueryKey,
  sermonLibraryQueryKey,
  toDescription,
  toSermons,
} from './worshipVideoQueries';

// 서버 응답은 서버 캐시(받아 둔 DB 사본, 10분 확인) — 화면은 10분 지나면 다시 열 때 새로 묻는다.
const STALE = 10 * 60_000;
// 다른 페이지에서 시간을 보내도 받은 목록·설명을 바로 복원한다.
// 갱신 주기(staleTime)와 보관 시간은 별개이며, 오래된 자료는 기존 화면 뒤에서 갱신한다.
const RETAIN = 30 * 60_000;

// 취소 신호(signal)는 넘기지 않는다 — 넘기면 페이지를 떠날 때 react-query 가 진행 중 요청을 취소해
// 돌아왔을 때 처음부터 다시 받는다. 떠나도 끝까지 받아 캐시에 남긴다.
export const useSermonLibrary = (page: VideoPage) =>
  useQuery({
    queryKey: sermonLibraryQueryKey(page),
    queryFn: async () => toSermons(await fetchJson(`/api/worship-video/library?page=${page}`)),
    staleTime: STALE,
    gcTime: RETAIN,
    retry: retryTransient,
  });

/** 고른 영상의 유튜브 설명 글. 고른 영상이 없으면(videoId 없음) 요청하지 않는다. */
export const useSermonDescription = (page: VideoPage, videoId: string | undefined) =>
  useQuery({
    queryKey: sermonDescriptionQueryKey(page, videoId ?? ''),
    queryFn: async () =>
      toDescription(
        await fetchJson(
          `/api/worship-video/description?page=${page}&v=${encodeURIComponent(videoId ?? '')}`
        )
      ),
    enabled: !!videoId,
    staleTime: STALE,
    gcTime: RETAIN,
    retry: retryTransient,
  });
