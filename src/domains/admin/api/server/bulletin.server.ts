import 'server-only';

import type { Database } from '@/shared/api/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { FileItem } from '../../lib/input/fileInput';

type FileRow = {
  path: string;
  kind: FileItem['kind'];
  width: number | null;
  height: number | null;
  bytes: number;
  original_name: string;
  alt: string | null;
  sort: number;
};

export type AdminBulletin = {
  id: string;
  date: string;
  status: 'DRAFT' | 'PUBLISHED';
  trashed: boolean;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
  /** 쪽 — 순서대로, 폼이 그대로 쓰는 모양 */
  pages: FileItem[];
};

/** 묶음의 파일 줄(순서 무관) → 화면의 파일 목록(순서대로) */
export const toFileItems = (rows: readonly FileRow[]): FileItem[] =>
  [...rows]
    .sort((a, b) => a.sort - b.sort)
    .map(f => ({
      path: f.path,
      kind: f.kind,
      width: f.width,
      height: f.height,
      bytes: f.bytes,
      originalName: f.original_name,
      alt: f.alt,
    }));

/** 주보 한 호(휴지통에 든 것 포함)와 쪽을 한 번에 읽는다 — 로그인한 사람의 세션(RLS: 주보 조회 권한) */
export const loadBulletin = async (
  client: SupabaseClient<Database>,
  id: string
): Promise<AdminBulletin | null> => {
  const { data } = await client
    .from('bulletins')
    .select(
      'id, date, status, deleted_at, created_at, created_by, updated_at, updated_by, file_lists(files(path, kind, width, height, bytes, original_name, alt, sort))'
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const list = data.file_lists as { files: FileRow[] } | null;
  return {
    id: data.id,
    date: data.date,
    status: data.status,
    trashed: data.deleted_at !== null,
    createdAt: data.created_at,
    createdBy: data.created_by,
    updatedAt: data.updated_at,
    updatedBy: data.updated_by,
    pages: toFileItems(list?.files ?? []),
  };
};
