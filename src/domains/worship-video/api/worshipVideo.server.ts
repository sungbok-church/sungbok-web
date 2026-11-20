// 예배 설교 영상 모으기 — 서버 전용. 예배 페이지(`/worship/sunday` 등)와 Route Handler(`/api/worship-video/*`)만 import.
// 페이지에 연결한 재생목록(config/worshipPages)의 영상을 유튜브에서 모아 설교 목록으로 만든다. 응답은 1시간 Data Cache —
// 방문자 수와 무관하게 재생목록 쪽 수만큼만 유튜브를 부른다. 분류·날짜는 제목·설명에서 읽는다(sermonParse).

import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다 — 키·쿼터는 서버에만

import { cacheLife, cacheTag } from 'next/cache';

import { failureCacheLife, settle, type Settled, unwrap } from '@/shared/api/settled.server';
import { z } from 'zod';

import {
  pickThumbnail,
  validItems,
  youtubeGet,
  youtubeThumbnailsSchema,
} from '@/shared/api/youtubeApi.server';

import type { NewsVideoFeed } from '@/domains/news/api/news.types';
import { newsRepository } from '@/domains/news/api/newsRepository';

import {
  isWorshipPage,
  WORSHIP_PAGES,
  type VideoPage,
  type WorshipPage,
} from '../config/worshipPages';
import { newsVideosToSermons } from './newsVideoSermon';
import { sortSermons } from './sermonList';
import { dateInText, parseSermonDescription, parseSermonTitle } from './sermonParse';
import type { Sermon } from './worshipVideo.types';

const REVALIDATE = 3600;
// 50개 × 100쪽 = 5000개까지 모은다(주 1회 설교 기준 수십 년). 무한 토큰에서 쿼터를 지키는 안전장치일 뿐,
// 실제 재생목록이 이 한도에 닿을 일은 없다고 본다. 응답은 1시간 캐시라 쿼터는 재생목록당 시간당 최대 100유닛.
export const MAX_PLAYLIST_PAGES = 100;

// 응답 스키마 — 아래 코드가 빠진 값을 이미 걸러 내므로(id·썸네일·날짜 없음 → 제외) 전부 optional.
// 모양 자체가 다를 때(배열 자리에 객체 등)만 YoutubeShapeError 로 실패한다.
const playlistItemsSchema = z.object({
  items: validItems(
    'playlistItems',
    z.object({
      snippet: z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
          thumbnails: youtubeThumbnailsSchema.optional(),
          resourceId: z.object({ videoId: z.string().optional() }).optional(),
          // 재생목록에 넣은 시각 — 업로드 시각이 없을 때만 쓴다
          publishedAt: z.string().optional(),
        })
        .optional(),
      // 영상을 올린(공개한) 시각
      contentDetails: z.object({ videoPublishedAt: z.string().optional() }).optional(),
    })
  ),
  nextPageToken: z.string().optional(),
});

/**
 * UTC 시각 → 한국 달력 날짜(YYYY-MM-DD). 설교일은 «어느 주일»인지가 뜻이라 시각이 아닌 날짜로 다룬다 —
 * 서버(UTC)에서 그대로 자르면 토요일 밤(UTC)에 올린 주일 새벽(KST) 영상이 하루 어긋난다(ADR 0012: 시간대는 명시).
 */
const seoulDate = (iso: string | undefined): string | undefined => {
  if (!iso) return undefined;
  try {
    return Temporal.Instant.from(iso).toZonedDateTimeISO('Asia/Seoul').toPlainDate().toString();
  } catch {
    return undefined; // 시각 모양이 아닌 값
  }
};

type Collected = { sermons: Sermon[]; descriptions: Map<string, string> };

// 재생목록 하나를 끝까지 — 쪽은 토큰을 따라 차례로 받는다
const collectPlaylist = async (playlistId: string, into: Collected, seen: Set<string>) => {
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PLAYLIST_PAGES; page++) {
    const r = await youtubeGet(
      'playlistItems',
      {
        part: 'snippet,contentDetails',
        playlistId,
        maxResults: '50',
        ...(pageToken ? { pageToken } : {}),
      },
      REVALIDATE,
      playlistItemsSchema
    );
    for (const { snippet, contentDetails } of r.items) {
      const id = snippet?.resourceId?.videoId;
      // 삭제·비공개 영상은 id 가 남아도 썸네일이 비어 온다 — 빈 src 카드를 만들지 않게 뺀다
      const thumbnail = pickThumbnail(snippet?.thumbnails, [
        'high',
        'medium',
        'default',
        'standard',
        'maxres',
      ]);
      // 같은 영상이 두 재생목록(또는 한 목록에 두 번) 있어도 한 번만
      if (!id || !thumbnail || seen.has(id)) continue;

      const rawTitle = snippet?.title ?? '';
      const description = parseSermonDescription(snippet?.description ?? '');
      const sermonDate = description.date ?? dateInText(rawTitle);
      const date =
        sermonDate ??
        seoulDate(contentDetails?.videoPublishedAt) ??
        seoulDate(snippet?.publishedAt);
      if (!date) continue; // 날짜를 알 수 없으면 정렬할 수 없다 — 실제로는 삭제·비공개 영상뿐

      const { series, no, occasion, title, passage, preacher } = parseSermonTitle(rawTitle);
      seen.add(id);
      into.descriptions.set(id, description.body);
      into.sermons.push({
        id,
        title,
        series,
        ...(no !== undefined && { no }),
        ...(occasion && { occasion }),
        ...(passage && { passage }),
        ...(preacher && { preacher }),
        date,
        dateFrom: sermonDate ? 'sermon' : 'upload',
        thumbnail,
        // 플레이어 포스터는 큰 것부터 — maxres 는 16:9, high 는 4:3(위아래 검은 띠)이라 화면에서 잘라 쓴다
        poster: pickThumbnail(snippet?.thumbnails, [
          'maxres',
          'standard',
          'high',
          'medium',
          'default',
        ]),
      });
    }
    pageToken = r.nextPageToken;
    if (!pageToken) break;
  }
};

// 띄어쓰기만 다른 시리즈 이름(«마태복음 강해»·«마태복음강해»)은 한 시리즈다 — 가장 최근 편의 표기로 맞춘다.
// 맞추지 않으면 칩이 둘로 갈리고 편수·이전/다음 편이 반쪽씩 나뉜다. sorted 는 최신순.
const unifySeriesNames = (sorted: Sermon[]): Sermon[] => {
  const names = new Map<string, string>();
  return sorted.map(s => {
    const key = s.series.replace(/\s+/g, '');
    const name = names.get(key) ?? s.series;
    names.set(key, name);
    return name === s.series ? s : { ...s, series: name };
  });
};

// 목록과 설명이 같은 수집(같은 Data Cache 항목)에서 나온다 — 설명만 따로 유튜브에 묻지 않는다.
const collect = async (page: WorshipPage): Promise<Collected> => {
  const into: Collected = { sermons: [], descriptions: new Map() };
  const seen = new Set<string>();
  // 재생목록끼리는 차례로 — 두 목록에 다 있는 영상은 앞 목록 것을 쓴다(순서가 응답 도착 순서에 흔들리지 않게)
  for (const playlistId of WORSHIP_PAGES[page]) await collectPlaylist(playlistId, into, seen);
  return {
    sermons: unifySeriesNames(sortSermons(into.sermons)),
    descriptions: into.descriptions,
  };
};

// 교회소식 영상(주일광고·성복의 뜰)은 유튜브 재생목록이 아니라 등록한 게시글에서 온다 — 유튜브를 부르지 않는다.
const collectNews = async (feed: NewsVideoFeed): Promise<Collected> => {
  const videos = await newsRepository.videos(feed);
  return {
    sermons: newsVideosToSermons(videos),
    // 같은 영상을 두 번 등록했으면 목록처럼 앞의 글 것을 쓴다(Map 은 뒤의 값이 이긴다 — 그래서 뒤집어 넣는다)
    descriptions: new Map([...videos].reverse().map(v => [v.videoId, v.description ?? ''])),
  };
};

// 영상 페이지의 목록 · 설명은 서버 캐시('use cache')에 둔다(ADR 0024) — 미리 그린 페이지 · /api · 자료실 링크가 같이 쓴다.
// 10분마다 다시 확인하고 만료는 없다. 다시 받기가 실패하면 그 실패도 짧게(5초 · 1분) 캐시된다 — 옛 목록을 지키는 것은
// 아래 fetch 의 Data Cache(유튜브 응답 1시간, 200 만 저장 · 배포와 서버가 바뀌어도 남는다)와 페이지 쪽 규칙(loadForPage:
// 운영 중 실패면 직전 페이지 유지)이다.
// 새 영상은 늦어도 약 1시간 10분 안에 보인다(두 시계 — 페이지 확인 10분 + 유튜브 응답 1시간).
export const VIDEO_PAGE_CACHE = { stale: 300, revalidate: 600 } as const;

// 실패는 던지지 않고 값으로 담는다(settled.server — 캐시 안에서 던지면 빌드가 멈춘다). 실패는 짧게(5초 · 1분) 붙든다.
const cachedPage = async (page: VideoPage): Promise<Settled<Collected>> => {
  'use cache';
  cacheTag(`video-page-${page}`);
  const settled = await settle(() => (isWorshipPage(page) ? collect(page) : collectNews(page)));
  cacheLife(settled.ok ? VIDEO_PAGE_CACHE : failureCacheLife(settled));
  return settled;
};

const collectPage = async (page: VideoPage): Promise<Collected> => unwrap(await cachedPage(page));

/** 영상 페이지의 영상 전체 — 날짜 최신순. 설명 본문은 무거워 싣지 않는다(fetchSermonDescription). */
export const fetchSermonLibrary = async (page: VideoPage): Promise<Sermon[]> =>
  (await collectPage(page)).sermons;

/**
 * 영상 한 편의 설명 본문(예배 설교는 유튜브 설명에서 설교일 줄을 뺀 것). 그 페이지 목록에 없는 id 는 null —
 * 임의 id 를 퍼부어도 유튜브를 더 부르지 않는다(쿼터는 공용, 일 10,000 — 바닥나면 홈 영상까지 죽는다).
 */
export const fetchSermonDescription = async (
  page: VideoPage,
  videoId: string
): Promise<string | null> => (await collectPage(page)).descriptions.get(videoId) ?? null;
