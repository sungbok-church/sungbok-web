import 'server-only';

import type { Database } from '@/shared/api/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

type AuditRow = {
  id: number;
  table_name: string;
  action: string;
  at: string;
  changes: unknown;
  actor_id: string | null;
};

/**
 * 이력 줄에 «누가» 이름을 붙인다. 이름은 `actor_names`(이력을 볼 수 있는 사람에게만 이름만 주는 DB 함수)로 한 번에 읽는다.
 * 사람이 없는 변경(예약 작업 · 가져오기 · 변경 파일)은 «시스템», 이름을 못 찾으면 «알 수 없는 사용자».
 */
export const withActorNames = async (client: SupabaseClient<Database>, rows: AuditRow[]) => {
  const ids = [...new Set(rows.map(r => r.actor_id).filter((id): id is string => id !== null))];
  const { data } = ids.length > 0 ? await client.rpc('actor_names', { p_ids: ids }) : { data: [] };
  const names = new Map((data ?? []).map(n => [n.id, n.name]));
  return rows.map(r => ({
    id: r.id,
    table_name: r.table_name,
    action: r.action,
    at: r.at,
    changes: r.changes,
    actorName: r.actor_id === null ? '시스템' : (names.get(r.actor_id) ?? '알 수 없는 사용자'),
  }));
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MENU_FIELDS = new Set(['menu_id', 'parent_id']);
const GROUP_FIELDS = new Set(['group_id']);
const USER_FIELDS = new Set(['user_id', 'handled_by', 'deleted_by']);

/**
 * 바뀐 칸에 나온 다른 행의 id(메뉴 · 그룹 · 사람)를 이름표로 만든다 — 이력에 uuid 대신 이름이 보이게(설계 6.7).
 * 읽을 권한이 없는 것은 빠진다(그 칸은 id 그대로 보인다).
 */
export const referenceNames = async (
  client: SupabaseClient<Database>,
  rows: { changes: unknown }[]
): Promise<Record<string, string>> => {
  const menus = new Set<string>();
  const groups = new Set<string>();
  const users = new Set<string>();
  for (const row of rows) {
    if (!row.changes || typeof row.changes !== 'object') continue;
    for (const [field, value] of Object.entries(row.changes as Record<string, unknown>)) {
      const target = MENU_FIELDS.has(field)
        ? menus
        : GROUP_FIELDS.has(field)
          ? groups
          : USER_FIELDS.has(field)
            ? users
            : null;
      if (!target) continue;
      for (const v of Array.isArray(value) ? value : [value])
        if (typeof v === 'string' && UUID.test(v)) target.add(v);
    }
  }
  const names: Record<string, string> = {};
  const [menuRes, groupRes, userRes] = await Promise.all([
    menus.size > 0
      ? client
          .from('menus')
          .select('id, label, default_label')
          .in('id', [...menus])
      : null,
    groups.size > 0
      ? client
          .from('groups')
          .select('id, name')
          .in('id', [...groups])
      : null,
    users.size > 0 ? client.rpc('actor_names', { p_ids: [...users] }) : null,
  ]);
  for (const m of menuRes?.data ?? []) names[m.id] = m.label ?? m.default_label;
  for (const g of groupRes?.data ?? []) names[g.id] = g.name;
  for (const u of userRes?.data ?? []) names[u.id] = u.name;
  return names;
};

/** 사람 id 들의 이름(등록 · 수정한 사람 표시). 이력을 볼 수 없는 사람에게는 빈 표 — 화면은 시각만 보인다. */
export const actorNameMap = async (
  client: SupabaseClient<Database>,
  ids: (string | null)[]
): Promise<Record<string, string>> => {
  const unique = [...new Set(ids.filter((id): id is string => id !== null))];
  if (unique.length === 0) return {};
  const { data } = await client.rpc('actor_names', { p_ids: unique });
  return Object.fromEntries((data ?? []).map(n => [n.id, n.name]));
};
