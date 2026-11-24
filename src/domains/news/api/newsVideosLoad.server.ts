// 공개 주일광고 · 성복의 뜰 읽기(설계 6.9) — DB 의 «공개 + 휴지통 아님 + 영상 있음» 글을 공개 키로, 서버에서만 읽는다.
// 따로 캐시하지 않는다 — 예배 영상 화면의 서버 캐시(worshipVideo.server 의 cachedPage, 태그 video-page-<메뉴>) 안에서 불린다.
// 관리자가 저장하면 그 태그를 updateTag 한다. 읽기가 실패하면 던진다(그 캐시가 실패를 값으로 담고, 페이지는 직전 것을 유지한다).
import 'server-only'; // 화면(클라이언트) 코드가 가져다 쓰면 빌드가 실패한다

import { readSupabaseEnv } from '@/shared/api/supabase/env';
import { createSupabaseReadClient } from '@/shared/api/supabase/readClient.server';

import type { NewsVideo } from './news.types';

type Row = {
  id: string;
  feed: 'ANNOUNCEMENTS' | 'GARDEN';
  title: string;
  date: string;
  date_from: 'EVENT' | 'UPLOAD';
  video_id: string | null;
  thumbnail: string | null;
  poster: string | null;
  description: string | null;
  categories: { label: string } | null;
};

const thumb = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

/** DB 의 행 → 공개 화면의 글(영상이 없는 글은 싣지 않는다) */
export const toNewsVideos = (rows: readonly Row[]): NewsVideo[] =>
  rows.flatMap(r =>
    r.video_id
      ? [
          {
            id: r.id,
            status: 'published' as const,
            feed: r.feed === 'ANNOUNCEMENTS' ? ('announcements' as const) : ('garden' as const),
            title: r.title,
            category: r.categories?.label ?? '',
            date: r.date,
            dateFrom: r.date_from === 'UPLOAD' ? ('upload' as const) : ('event' as const),
            videoId: r.video_id,
            thumbnail: r.thumbnail ?? thumb(r.video_id),
            poster: r.poster ?? r.thumbnail ?? thumb(r.video_id),
            ...(r.description ? { description: r.description } : {}),
          },
        ]
      : []
  );

/** 공개 주일광고 · 성복의 뜰 — DB 의 «공개 + 휴지통 아님 + 영상 있음», 최신 날짜부터 */
export const loadNewsVideos = async (): Promise<NewsVideo[]> => {
  const client = readSupabaseEnv() ? createSupabaseReadClient() : null;
  if (!client) return [];
  const { data, error } = await client
    .from('news_videos')
    .select(
      'id, feed, title, date, date_from, video_id, thumbnail, poster, description, categories(label)'
    )
    .eq('status', 'PUBLISHED')
    .is('deleted_at', null)
    .not('video_id', 'is', null)
    .order('date', { ascending: false })
    // 같은 날짜끼리는 나중에 등록한 것이 위 — 고칠 때마다 순서(이전 · 다음 편)가 바뀌지 않게
    .order('id', { ascending: false });
  if (error) throw new Error(`교회소식 영상을 읽지 못했습니다: ${error.message}`);
  return toNewsVideos((data ?? []) as Row[]);
};
