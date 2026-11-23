import 'server-only';

import type { Database } from '@/shared/api/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { type ActionResult, toActionError } from './actionResult';
import { moveItem, type Sorted } from './reorder';

/**
 * 같은 무리(siblings — 지금 순서대로) 안에서 한 줄을 옮기고 바뀐 줄의 순서 값만 고친다(로그인한 사람의 세션).
 * 차례로 고치고 처음 실패에서 멈춘다(함께 보내면 순서 값이 모두 같던 묶음은 줄 수만큼 한꺼번에 나간다). 멈춰도 앞서 고친 줄은
 * 저장된 채라 순서가 반쯤 바뀔 수 있다 — 화면은 실패하면 지금 값을 다시 읽는다(SortableRows). 한 번에(한 트랜잭션) 저장하는 것은
 * 끌어서 옮기기를 만들 때 DB 함수로 한다.
 */
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
