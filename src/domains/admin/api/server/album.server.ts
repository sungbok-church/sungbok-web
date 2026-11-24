import 'server-only';

import type { Database } from '@/shared/api/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { FileItem } from '../../lib/input/fileInput';
import { toFileItems } from './bulletin.server';

export type AdminAlbum = {
  id: string;
  /** 공개 주소 번호(/news/album/<slug>) */
  slug: string;
  title: string;
  categoryId: string;
  categoryLabel: string;
  status: 'DRAFT' | 'PUBLISHED';
  trashed: boolean;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
  /** 그림 — 순서대로, 폼이 그대로 쓰는 모양 */
  images: FileItem[];
};

/** 교회앨범 한 건(휴지통에 든 것 포함)과 그림을 한 번에 — 로그인한 사람의 세션(RLS: 교회앨범 조회 권한) */
export const loadAlbum = async (
  client: SupabaseClient<Database>,
  id: string
): Promise<AdminAlbum | null> => {
  const { data } = await client
    .from('albums')
    .select(
      'id, slug, title, category_id, categories(label), status, deleted_at, created_at, created_by, updated_at, updated_by, file_lists(files(path, kind, width, height, bytes, original_name, alt, sort))'
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const list = data.file_lists as { files: Parameters<typeof toFileItems>[0] } | null;
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    categoryId: data.category_id,
    categoryLabel: (data.categories as { label: string } | null)?.label ?? '',
    status: data.status,
    trashed: data.deleted_at !== null,
    createdAt: data.created_at,
    createdBy: data.created_by,
    updatedAt: data.updated_at,
    updatedBy: data.updated_by,
    images: toFileItems(list?.files ?? []),
  };
};
