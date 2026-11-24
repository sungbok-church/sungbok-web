import 'server-only';

import type { Database } from '@/shared/api/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { NEWS_FEEDS, type NewsFeedKey } from '../../lib/newsFeed';

export type AdminNewsVideo = {
  id: string;
  title: string;
  categoryId: string;
  categoryLabel: string;
  date: string;
  /** 날짜의 출처 — 옮긴 글 중 행사 날짜를 몰라 유튜브 업로드 날짜를 쓴 것은 UPLOAD */
  dateFrom: 'EVENT' | 'UPLOAD';
  videoId: string | null;
  thumbnail: string | null;
  /** 폼이 그대로 쓰도록 빈 값은 '' */
  description: string;
  status: 'DRAFT' | 'PUBLISHED';
  trashed: boolean;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

/** 주일광고 · 성복의 뜰 한 건(휴지통에 든 것 포함) — 그 메뉴(feed)의 글만. 로그인한 사람의 세션(RLS: 그 메뉴 조회 권한) */
export const loadNewsVideo = async (
  client: SupabaseClient<Database>,
  key: NewsFeedKey,
  id: string
): Promise<AdminNewsVideo | null> => {
  const { data } = await client
    .from('news_videos')
    .select(
      'id, title, category_id, categories(label), date, date_from, video_id, thumbnail, description, status, deleted_at, created_at, created_by, updated_at, updated_by'
    )
    .eq('id', id)
    .eq('feed', NEWS_FEEDS[key].feed)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    categoryId: data.category_id,
    categoryLabel: (data.categories as { label: string } | null)?.label ?? '',
    date: data.date,
    dateFrom: data.date_from,
    videoId: data.video_id,
    thumbnail: data.thumbnail,
    description: data.description ?? '',
    status: data.status,
    trashed: data.deleted_at !== null,
    createdAt: data.created_at,
    createdBy: data.created_by,
    updatedAt: data.updated_at,
    updatedBy: data.updated_by,
  };
};
