import 'server-only';

import type { Database } from '@/shared/api/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { fail } from '@/shared/api/result';

import { type ActionResult, toActionError } from '../../lib/actionResult';

type Tables = Database['public']['Tables'];
/** updated_at 이 있는 표 */
type VersionedTable = {
  [K in keyof Tables]: Tables[K]['Row'] extends { id: string; updated_at: string } ? K : never;
}[keyof Tables];

/**
 * 동시 수정 막기(설계 6.3): 화면이 열었을 때의 updated_at 이 그대로일 때만 고친다.
 * 0줄이면 그 사이 다른 사람이 고친 것 — 덮어쓰지 않고 «다른 사람이 먼저 고쳤습니다».
 * 로그인한 사람의 세션 클라이언트로 부른다(RLS · 트리거가 다시 막는다).
 */
export const updateVersioned = async <T extends VersionedTable>(
  client: SupabaseClient<Database>,
  table: T,
  id: string,
  expectedUpdatedAt: string,
  patch: Tables[T]['Update']
): Promise<ActionResult<{ updatedAt: string }>> => {
  const { data, error } = await client
    .from(table)
    .update(patch as never)
    .eq('id' as never, id as never)
    .eq('updated_at' as never, expectedUpdatedAt as never)
    .select('updated_at');
  if (error) return { ok: false, error: toActionError(error) };
  const row = (data as unknown as { updated_at: string }[] | null)?.[0];
  if (!row) return fail('CONFLICT');
  return { ok: true, data: { updatedAt: row.updated_at }, message: '저장했습니다.' };
};
