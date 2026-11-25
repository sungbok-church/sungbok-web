import 'server-only';

import type { Database } from '@/shared/api/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { FileItem } from '../../lib/input/fileInput';
import { toFileItems } from './bulletin.server';

// 홈 히어로 읽기(관리자, 설계 6.12) — 한 줄뿐인 설정(singleton). 옮기기 스크립트가 만든 줄을 고치기만 한다(넣기 규칙 없음).

export type AdminHomeHero = {
  id: string;
  kind: 'PHOTO' | 'YOUTUBE';
  videoId: string | null;
  photo: FileItem[];
  updatedAt: string;
  updatedBy: string | null;
};

export const loadAdminHomeHero = async (
  client: SupabaseClient<Database>
): Promise<AdminHomeHero | null> => {
  const { data } = await client
    .from('home_hero')
    .select(
      'id, kind, youtube_video_id, updated_at, updated_by, photo:file_lists(files(path, kind, width, height, bytes, original_name, alt, sort, variants))'
    )
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    kind: data.kind,
    videoId: data.youtube_video_id,
    photo: toFileItems(
      (data.photo as { files: Parameters<typeof toFileItems>[0] } | null)?.files ?? []
    ),
    updatedAt: data.updated_at,
    updatedBy: data.updated_by,
  };
};
