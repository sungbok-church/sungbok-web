// 유튜브 재생목록 전체 → DB 에 넣을 영상 줄(묶음 E). 서버 전용 — 동기화(youtubeSync.server)만 부른다.
// 늘 새로 받는다(Data Cache 없음) — 동기화는 페이지마다 10분에 한 번까지라 쿼터는 재생목록 쪽 수만큼(주일예배 199편 = 4).

import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다 — 키 · 쿼터는 서버에만

import { z } from 'zod';

import {
  pickThumbnail,
  validItems,
  youtubeGet,
  youtubeThumbnailsSchema,
} from '@/shared/api/youtubeApi.server';

import type { VideoRow } from './videoRows';

// 50개 × 100쪽 = 5000개까지 모은다(주 1회 설교 기준 수십 년). 무한 토큰에서 쿼터를 지키는 안전장치일 뿐이다.
export const MAX_PLAYLIST_PAGES = 100;

// 응답 스키마 — 아래 코드가 빠진 값을 이미 걸러 내므로(id · 썸네일 없음 → 제외) 전부 optional.
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
          // 재생목록에 넣은 시각 — 올린 시각이 없을 때만 쓴다
          publishedAt: z.string().optional(),
        })
        .optional(),
      // 영상을 올린(공개한) 시각
      contentDetails: z.object({ videoPublishedAt: z.string().optional() }).optional(),
    })
  ),
  nextPageToken: z.string().optional(),
});

/** 시각 모양인 값만, ISO 로 맞춰(JS 는 읽고 Postgres 는 못 읽는 모양이 오면 바꾸기 전체가 실패하므로) */
const instant = (v: string | undefined): string | null => {
  const t = v ? Date.parse(v) : NaN;
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};

/**
 * 재생목록들(앞에서부터)의 영상 전체 — 재생목록 순서대로, 같은 영상은 앞 목록 것 한 번. 삭제 · 비공개 영상(id 나 썸네일
 * 없음)은 뺀다. 한 쪽이라도 실패하면 던진다 — 반쪽 목록으로 DB 를 바꾸면 나머지가 지워진다.
 */
export const fetchPlaylistRows = async (playlistIds: readonly string[]): Promise<VideoRow[]> => {
  const rows: VideoRow[] = [];
  const seen = new Set<string>();
  for (const playlistId of playlistIds) {
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
        0,
        playlistItemsSchema
      );
      for (const { snippet, contentDetails } of r.items) {
        const id = snippet?.resourceId?.videoId;
        // 삭제 · 비공개 영상은 id 가 남아도 썸네일이 비어 온다 — 빈 src 카드를 만들지 않게 뺀다
        const thumbnail = pickThumbnail(snippet?.thumbnails, [
          'high',
          'medium',
          'default',
          'standard',
          'maxres',
        ]);
        if (!id || !thumbnail || seen.has(id)) continue;
        seen.add(id);
        rows.push({
          video_id: id,
          position: rows.length,
          title: snippet?.title ?? '',
          description: snippet?.description ?? '',
          published_at: instant(contentDetails?.videoPublishedAt),
          added_at: instant(snippet?.publishedAt),
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
  }
  return rows;
};
