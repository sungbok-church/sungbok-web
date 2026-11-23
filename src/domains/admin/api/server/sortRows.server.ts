import 'server-only';

import type { Database } from '@/shared/api/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { type ActionResult, toActionError } from '../../lib/actionResult';

/**
 * 끌어서 옮긴 순서를 한 번에 저장한다(로그인한 사람의 세션). ids 는 한 무리(메뉴: 같은 영역 · 같은 상위, 분류 · 코드: 같은 묶음)의
 * 모든 줄을 새 순서대로. DB 함수 reorder_rows 가 한 트랜잭션으로 10, 20, 30 … 을 매긴다 — 무리가 맞지 않으면(그사이 줄이 더해짐 등)
 * 아무것도 바꾸지 않고 한글 문장으로 거절한다(→ NOT_ALLOWED). 무리를 잠가 같은 무리를 동시에 옮기면 차례로 돈다.
 */
export const applyReorder = async (
  client: SupabaseClient<Database>,
  table: 'menus' | 'categories' | 'codes',
  ids: string[]
): Promise<ActionResult> => {
  const { error } = await client.rpc('reorder_rows', { p_table: table, p_ids: ids });
  if (error) return { ok: false, error: toActionError(error) };
  return { ok: true, message: '순서를 바꿨습니다.' };
};
