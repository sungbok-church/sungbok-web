'use server';

import { fail } from '@/shared/api/result';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { z } from 'zod';

import { type ActionResult, parseInput, toActionError } from '../../lib/actionResult';
import { actionPermission, NO_PERMISSION } from '../server/adminContext.server';
import { referenceNames, withActorNames } from '../server/auditRows.server';

const LIMIT = 30;

/**
 * 이력을 여는 표 → 그 화면의 메뉴(«이력조회» 권한을 이 메뉴로 본다). 화면이 생길 때 더한다.
 * 상세가 있는 화면(사용자 · 그룹)은 한 건의 이력, 목록만 있는 화면(메뉴 · 분류 · 코드)은 그 표 전체의 이력.
 */
const ROW_HISTORY: Record<string, readonly string[]> = {
  profiles: ['users'],
  groups: ['groups'],
  bulletins: ['bulletin'],
  albums: ['album'],
  resources: ['resources'],
  // 한 표를 두 메뉴가 나눠 쓴다 — 어느 한쪽의 «이력조회» 로 열고, 그 글의 메뉴인지는 DB(can_read_history — feed 로)가 거른다
  news_videos: ['announcements', 'garden'],
  // 담당자 줄(department_staff)은 부서에 묶여(parent) 함께 나온다
  departments: ['departments'],
  // 개인정보 칸은 값 없이 «바뀜» 만 남는다(DB 감사 트리거)
  newcomers: ['newcomers'],
  home_hero: ['home-hero'],
};
const TABLE_HISTORY: Record<string, readonly string[]> = {
  menus: ['menus'],
  categories: ['categories'],
  codes: ['codes'],
  // 새가족 목록 — 엑셀 받기 기록만(개인정보를 내려받은 기록, 한 건에 묶이지 않는다). 접수 한 건의 이력은 상세에서
  newcomers: ['newcomers'],
};
/** 표 전체로 열 때 그 표에서 보일 동작만(없으면 전부) */
const TABLE_ACTIONS: Record<string, 'EXPORT'> = { newcomers: 'EXPORT' };

const inputSchema = z.union([
  z.object({
    table: z.enum([
      'profiles',
      'groups',
      'bulletins',
      'news_videos',
      'albums',
      'resources',
      'departments',
      'newcomers',
      'home_hero',
    ]),
    rowId: z.uuid(),
  }),
  z.object({
    table: z.enum(['menus', 'categories', 'codes', 'newcomers']),
    rowId: z.undefined().optional(),
  }),
]);
export type HistoryTarget = z.infer<typeof inputSchema>;

export type HistoryItem = {
  id: number;
  table_name: string;
  action: string;
  at: string;
  changes: unknown;
  actorName: string;
};

/**
 * 변경 이력(설계 6.7) — 상세 · 목록 화면의 «변경 이력» 버튼이 열 때 읽는다. 한 건이면 그 행과 묶인 딸린 행
 * (그룹 소속 · 그룹 권한)의 변경, 표 전체면 그 표의 변경(새가족은 엑셀 받기 기록만)을 최신 30개씩. 그 메뉴의 «이력조회» 권한이
 * 있어야 하고, DB(RLS)가 다시 거른다.
 * before: «더 보기» — 이미 받은 것 중 가장 오래된 줄의 id. 그보다 오래된 것만 이어서 받는다(창 안에서 끝까지 볼 수 있다 —
 * 전체 «변경 이력» 화면은 2026-11-26 없앴다).
 */
export const loadHistory = async (
  raw: unknown,
  rawBefore?: unknown
): Promise<
  ActionResult<{ items: HistoryItem[]; names: Record<string, string>; hasMore: boolean }>
> => {
  const input = parseInput(inputSchema, raw);
  if (!input.ok) return fail('NOT_FOUND');
  const before = z.number().int().positive().optional().safeParse(rawBefore);
  if (!before.success) return fail('NOT_FOUND');
  const target = input.data;
  const menus = (target.rowId ? ROW_HISTORY : TABLE_HISTORY)[target.table] ?? [];
  const allowed = await Promise.all(menus.map(menu => actionPermission(menu, 'HISTORY')));
  if (!allowed.some(Boolean)) return NO_PERMISSION;

  const supabase = await createSupabaseServerClient();
  const base = supabase.from('audit_log').select('id, table_name, action, at, changes, actor_id');
  const filtered = target.rowId
    ? // 표 이름은 정해 둔 값, rowId 는 uuid 로 확인했다 — 사용자 입력이 필터 문자열에 그대로 들어가지 않는다
      base.or(
        `and(table_name.eq.${target.table},row_id.eq.${target.rowId}),and(parent_table.eq.${target.table},parent_id.eq.${target.rowId})`
      )
    : TABLE_ACTIONS[target.table]
      ? base.eq('table_name', target.table).eq('action', TABLE_ACTIONS[target.table])
      : base.eq('table_name', target.table);
  const { data, error } = await (before.data ? filtered.lt('id', before.data) : filtered)
    .order('id', { ascending: false })
    .limit(LIMIT + 1);
  if (error) return { ok: false, error: toActionError(error) };
  const rows = (data ?? []).slice(0, LIMIT);
  const [items, names] = await Promise.all([
    withActorNames(supabase, rows),
    referenceNames(supabase, rows),
  ]);
  return { ok: true, data: { items, names, hasMore: (data ?? []).length > LIMIT }, message: '' };
};
