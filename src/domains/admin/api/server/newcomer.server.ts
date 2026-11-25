import 'server-only';

import type { Database } from '@/shared/api/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { dayRange } from '../../lib/adminTime';
import type { ListQuery, ListSpec } from '../../lib/listQuery';
import { NEWCOMER_INTENTS, NEWCOMER_STATUSES } from '../../lib/newcomer';

// 새가족 접수함 읽기(설계 6.11) — 로그인한 사람의 세션(RLS: «새가족» 조회 권한). 목록과 엑셀이 같은 조건으로 읽는다.
// 검색어 칸은 두지 않는다 — 이름 · 연락처가 주소(서버 기록)에 남지 않게(상태 · 종류 · 기간으로 거른다).

type Client = SupabaseClient<Database>;

export const NEWCOMER_LIST_SPEC: ListSpec = {
  sorts: ['created_at'],
  defaultSort: 'created_at',
  defaultDir: 'desc',
  filters: {
    status: NEWCOMER_STATUSES.map(s => s.value),
    intent: NEWCOMER_INTENTS.map(s => s.value),
  },
  searchInUrl: false,
  dateRange: true,
};

const COLUMNS =
  'id, created_at, intent, name, phone, visit_date, message, status, note, handled_by, handled_at, updated_at, updated_by';

/** 목록 · 엑셀의 조건(상태 · 종류 · 접수 기간 — 서울 날짜) */
export const newcomerQuery = (
  client: Client,
  query: ListQuery,
  options: { count?: boolean } = {}
) => {
  let req = client
    .from('newcomers')
    .select(COLUMNS, options.count ? { count: 'exact' } : undefined)
    .order('created_at', { ascending: query.dir === 'asc' });
  const { status, intent } = query.filters;
  if (status) req = req.eq('status', status as (typeof NEWCOMER_STATUSES)[number]['value']);
  if (intent) req = req.eq('intent', intent as (typeof NEWCOMER_INTENTS)[number]['value']);
  const { gte, lt } = dayRange(query.from, query.to);
  if (gte) req = req.gte('created_at', gte);
  if (lt) req = req.lt('created_at', lt);
  return req;
};

/** 접수 한 건 */
export const loadNewcomer = async (client: Client, id: string) => {
  const { data } = await client.from('newcomers').select(COLUMNS).eq('id', id).maybeSingle();
  return data;
};

export type AdminNewcomer = NonNullable<Awaited<ReturnType<typeof loadNewcomer>>>;
