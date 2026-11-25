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
};

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
  z.object({ table: z.enum(['menus', 'categories', 'codes']), rowId: z.undefined().optional() }),
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
 * (그룹 소속 · 그룹 권한)의 변경, 표 전체면 그 표의 변경을 최신 30개까지. 그 메뉴의 «이력조회» 권한이 있어야 하고, DB(RLS)가 다시 거른다.
 */
export const loadHistory = async (
  raw: unknown
): Promise<
  ActionResult<{ items: HistoryItem[]; names: Record<string, string>; hasMore: boolean }>
> => {
  const input = parseInput(inputSchema, raw);
  if (!input.ok) return fail('NOT_FOUND');
  const target = input.data;
  const menus = (target.rowId ? ROW_HISTORY : TABLE_HISTORY)[target.table] ?? [];
  const allowed = await Promise.all(menus.map(menu => actionPermission(menu, 'HISTORY')));
  if (!allowed.some(Boolean)) return NO_PERMISSION;

  const supabase = await createSupabaseServerClient();
  const base = supabase.from('audit_log').select('id, table_name, action, at, changes, actor_id');
  const { data, error } = await (
    target.rowId
      ? // 표 이름은 정해 둔 값, rowId 는 uuid 로 확인했다 — 사용자 입력이 필터 문자열에 그대로 들어가지 않는다
        base.or(
          `and(table_name.eq.${target.table},row_id.eq.${target.rowId}),and(parent_table.eq.${target.table},parent_id.eq.${target.rowId})`
        )
      : base.eq('table_name', target.table)
  )
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
