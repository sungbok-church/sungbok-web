import 'server-only';

import type { Database } from '@/shared/api/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { type ActionResult, toActionError } from './actionResult';
import { moveItem, type Sorted } from './reorder';

/** 같은 무리(siblings — 지금 순서대로) 안에서 한 줄을 옮기고 바뀐 줄의 순서 값만 고친다(로그인한 사람의 세션). */
export const applyMove = async (
  client: SupabaseClient<Database>,
  table: 'menus' | 'categories' | 'codes',
  siblings: readonly Sorted[],
  id: string,
  dir: 'up' | 'down'
): Promise<ActionResult> => {
  for (const row of moveItem(siblings, id, dir)) {
    const { error } = await client.from(table).update({ sort: row.sort }).eq('id', row.id);
    if (error) return { ok: false, error: toActionError(error) };
  }
  return { ok: true, message: '순서를 바꿨습니다.' };
};
