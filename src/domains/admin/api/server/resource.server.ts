import 'server-only';

import type { Database } from '@/shared/api/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { FileItem } from '../../lib/input/fileInput';
import type { ResourceSectionKey } from '../../lib/resourceSection';
import { toFileItems } from './bulletin.server';

type FileRows = { files: Parameters<typeof toFileItems>[0] } | null;

export type AdminResource = {
  id: string;
  /** 공개 주소 번호(옮긴 자료는 «0404-40», 새 자료는 숫자) */
  slug: string;
  section: ResourceSectionKey;
  seriesId: string;
  seriesLabel: string;
  /** 폼이 그대로 쓰도록 글자로(없으면 '') */
  episode: string;
  title: string;
  date: string;
  year: string;
  passage: string;
  file: FileItem[];
  pages: FileItem[];
  videoIds: string[];
  status: 'DRAFT' | 'PUBLISHED';
  trashed: boolean;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
};

/** 설교 시트지 한 건(휴지통에 든 것 포함) — 원본 · 쪽 그림 · 영상 연결까지 한 번에. 로그인한 사람의 세션(RLS) */
export const loadResource = async (
  client: SupabaseClient<Database>,
  id: string
): Promise<AdminResource | null> => {
  const files = 'files(path, kind, width, height, bytes, original_name, alt, sort)';
  const { data } = await client
    .from('resources')
    .select(
      // 묶음을 둘(원본 · 쪽) 가리키므로 연결 이름으로 나눠 읽는다
      `id, slug, section, series_id, categories(label), episode, title, date, year, passage, status, deleted_at, created_at, created_by, updated_at, updated_by, file:file_lists!resources_file_list_id_fkey(${files}), pages:file_lists!resources_pages_list_id_fkey(${files}), resource_videos(video_id)`
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as {
    id: string;
    slug: string;
    section: ResourceSectionKey;
    series_id: string;
    categories: { label: string } | null;
    episode: number | null;
    title: string;
    date: string | null;
    year: number | null;
    passage: string | null;
    status: 'DRAFT' | 'PUBLISHED';
    deleted_at: string | null;
    created_at: string;
    created_by: string | null;
    updated_at: string;
    updated_by: string | null;
    file: FileRows;
    pages: FileRows;
    resource_videos: { video_id: string }[];
  };
  return {
    id: row.id,
    slug: row.slug,
    section: row.section,
    seriesId: row.series_id,
    seriesLabel: row.categories?.label ?? '',
    episode: row.episode ? String(row.episode) : '',
    title: row.title,
    date: row.date ?? '',
    year: row.year ? String(row.year) : '',
    passage: row.passage ?? '',
    file: toFileItems(row.file?.files ?? []),
    pages: toFileItems(row.pages?.files ?? []),
    videoIds: row.resource_videos.map(v => v.video_id),
    status: row.status,
    trashed: row.deleted_at !== null,
    createdAt: row.created_at,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
};
