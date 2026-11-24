import 'server-only';

import { fail } from '@/shared/api/result';
import type { Database } from '@/shared/api/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { type ActionResult, toActionError } from '../../lib/actionResult';

// 콘텐츠 5종이 같이 쓰는 휴지통 · 복구 · 완전 삭제(설계 6.6). 로그인한 사람의 세션으로 — RLS 와 guard_content(휴지통은 «삭제»
// 권한)가 다시 막는다. scope 는 같은 표를 나눠 쓰는 메뉴의 범위(주일광고 · 성복의 뜰의 feed) — 다른 메뉴의 글이면 0줄(NOT_FOUND).
// 권한 확인(actionPermission)과 화면 갱신은 부르는 쪽이 한다.

type ContentTable = 'bulletins' | 'news_videos' | 'albums' | 'resources';
type Scope = Record<string, string>;

/** 휴지통 보내기(trashed) · 복구 — 바뀐 줄이 없으면 그사이 누가 먼저 한 것. 복구 때 같은 값이 있으면(23505) duplicate 문장 */
export const setTrashed = async (
  client: SupabaseClient<Database>,
  table: ContentTable,
  id: string,
  trashed: boolean,
  scope: Scope,
  duplicate: string
): Promise<ActionResult> => {
  let query = client
    .from(table)
    .update({ deleted_at: trashed ? new Date().toISOString() : null } as never)
    .eq('id', id);
  for (const [k, v] of Object.entries(scope)) query = query.eq(k as never, v as never);
  const { data, error } = await (
    trashed ? query.is('deleted_at', null) : query.not('deleted_at', 'is', null)
  ).select('id');
  if (error)
    return error.code === '23505'
      ? fail('DUPLICATE', { detail: duplicate })
      : { ok: false, error: toActionError(error) };
  if (!data?.length) return fail('NOT_FOUND');
  return { ok: true, message: trashed ? '휴지통으로 보냈습니다.' : '복구했습니다.' };
};

/** 완전 삭제 — 휴지통에 든 것만(RLS 도 같다). 글의 파일 묶음은 주인 없는 묶음이 되어 예약 작업이 지운다 */
export const purgeRow = async (
  client: SupabaseClient<Database>,
  table: ContentTable,
  id: string,
  scope: Scope
): Promise<ActionResult> => {
  let query = client.from(table).delete().eq('id', id);
  for (const [k, v] of Object.entries(scope)) query = query.eq(k as never, v as never);
  const { data, error } = await query.not('deleted_at', 'is', null).select('id');
  if (error) return { ok: false, error: toActionError(error) };
  if (!data?.length) return fail('NOT_FOUND');
  return { ok: true, message: '완전히 지웠습니다.' };
};
