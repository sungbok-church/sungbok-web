import 'server-only';

import type { Database } from '@/shared/api/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ZodType } from 'zod';

import { fail } from '@/shared/api/result';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';

import { type ActionResult, parseInput, toActionError } from '../../lib/actionResult';
import { actionPermission, NO_PERMISSION } from './adminContext.server';
import { reorderSchema } from '../../lib/input/reorderInput';
import { applyReorder } from './sortRows.server';
import { updateVersioned } from './versionedUpdate.server';

// 메뉴 관리 · 분류 관리 · 코드 관리(«한 줄 고치기 표» — SortableRows)가 같이 쓰는 Server Action 몸통.
// 순서는 늘 같다: 권한 → 입력 검사(화면과 같은 스키마) → 저장 → 성공하면 화면을 다시 그린다(revalidate).
// 'use server' 파일이 아니라서 여기 함수는 화면에서 바로 부를 수 없다 — 각 화면의 Server Action 이 감싸서 부른다.

type RowTable = 'menus' | 'categories' | 'codes';

interface RowSpec {
  table: RowTable;
  /** 권한을 보는 메뉴 key(«메뉴 관리» = menus …) */
  menuKey: string;
  /** 저장한 뒤 다시 그릴 곳 */
  revalidate: () => void;
}

/** 한 줄 고치기 입력(스키마가 다듬은 뒤) — 메뉴는 이름을 비우면 null(기본 이름) */
type RowPatch = { id: string; updatedAt: string; label: string | null; isActive: boolean };

/**
 * 이름 · 사용 여부를 열었을 때의 updated_at 으로 고친다(동시 수정 막기 — updateVersioned).
 * precheck: 저장 전에 DB 를 읽어 볼 규칙(홈페이지 메뉴 이름 한도 등) — 문장을 돌려주면 저장하지 않고 그 문장으로 알린다.
 */
export const saveRow = async (
  {
    table,
    menuKey,
    revalidate,
    schema,
    precheck,
  }: RowSpec & {
    schema: ZodType<RowPatch>;
    precheck?: (supabase: SupabaseClient<Database>, patch: RowPatch) => Promise<string | null>;
  },
  raw: unknown
): Promise<ActionResult<{ updatedAt: string }>> => {
  if (!(await actionPermission(menuKey, 'UPDATE'))) return NO_PERMISSION;
  const input = parseInput(schema, raw);
  if (!input.ok) return input;
  const { id, updatedAt, label, isActive } = input.data;
  const supabase = await createSupabaseServerClient();
  const problem = await precheck?.(supabase, input.data);
  if (problem) return fail('INVALID_INPUT', { detail: problem, fields: { label: [problem] } });
  const result = await updateVersioned(supabase, table, id, updatedAt, {
    label,
    is_active: isActive,
  });
  if (result.ok) revalidate();
  return result;
};

/** 한 무리 안에서 끌어서 옮긴 순서를 한 번에 저장한다(DB 함수 reorder_rows — sortRows.server). */
export const saveRowOrder = async (
  { table, menuKey, revalidate }: RowSpec,
  raw: unknown
): Promise<ActionResult> => {
  if (!(await actionPermission(menuKey, 'UPDATE'))) return NO_PERMISSION;
  const input = parseInput(reorderSchema, raw);
  if (!input.ok) return input;
  const supabase = await createSupabaseServerClient();
  const result = await applyReorder(supabase, table, input.data.ids);
  if (result.ok) revalidate();
  return result;
};

const STEP = 10;

/**
 * 분류 · 코드 한 줄을 묶음의 맨 뒤 순서(마지막 + 10)로 넣는다. 권한 · 입력 검사는 부르는 쪽이 먼저 한다
 * (코드는 넣기 전에 잠긴 묶음인지도 본다).
 */
export const addRowLast = async (
  supabase: SupabaseClient<Database>,
  table: 'categories' | 'codes',
  row: { group_key: string; label: string } & ({ slug: string } | { code: string }),
  { message, revalidate }: { message: string; revalidate: () => void }
): Promise<ActionResult> => {
  const { data: last } = await supabase
    .from(table)
    .select('sort')
    .eq('group_key', row.group_key)
    .order('sort', { ascending: false })
    .limit(1);
  const sort = (last?.[0]?.sort ?? 0) + STEP;
  const { error } = await supabase.from(table).insert({ ...row, sort } as never);
  if (error) return { ok: false, error: toActionError(error) };
  revalidate();
  return { ok: true, message };
};
