'use server';

import { fail } from '@/shared/api/result';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { revalidatePath } from 'next/cache';

import { type ActionResult, parseInput, toActionError } from './actionResult';
import { actionPermission, NO_PERMISSION } from './adminContext.server';
import { categoryCreateSchema, categoryUpdateSchema } from './categoryInput';
import { moveSchema } from './codeInput';
import { applyMove } from './sortRows.server';
import { updateVersioned } from './versionedUpdate.server';

const PATH = '/admin/categories';
const STEP = 10;

/** 고친 뒤: 이 화면을 새로 그린다. 드롭다운 · 조건은 그릴 때마다 DB 를 읽으므로 지울 캐시가 없다(ADR 0023) */
const done = () => revalidatePath(PATH);

/** 분류 더하기 — 묶음의 맨 뒤 순서로. 묶음(category_groups)은 변경 파일로만 생긴다. */
export const createCategory = async (raw: unknown): Promise<ActionResult> => {
  if (!(await actionPermission('categories', 'CREATE'))) return NO_PERMISSION;
  const input = parseInput(categoryCreateSchema, raw);
  if (!input.ok) return input;
  const { groupKey, slug, label } = input.data;
  const supabase = await createSupabaseServerClient();
  const { data: last } = await supabase
    .from('categories')
    .select('sort')
    .eq('group_key', groupKey)
    .order('sort', { ascending: false })
    .limit(1);
  const sort = (last?.[0]?.sort ?? 0) + STEP;
  const { error } = await supabase
    .from('categories')
    .insert({ group_key: groupKey, slug, label, sort });
  if (error) return { ok: false, error: toActionError(error) };
  done();
  return { ok: true, message: '분류를 더했습니다.' };
};

/** 이름 · 사용 여부. 분류는 지우지 않고 끈다(글이 가리킨다). */
export const updateCategory = async (
  raw: unknown
): Promise<ActionResult<{ updatedAt: string }>> => {
  if (!(await actionPermission('categories', 'UPDATE'))) return NO_PERMISSION;
  const input = parseInput(categoryUpdateSchema, raw);
  if (!input.ok) return input;
  const { id, updatedAt, label, isActive } = input.data;
  const supabase = await createSupabaseServerClient();
  const result = await updateVersioned(supabase, 'categories', id, updatedAt, {
    label,
    is_active: isActive,
  });
  if (result.ok) done();
  return result;
};

/** 같은 묶음 안에서 위로 · 아래로. */
export const moveCategory = async (raw: unknown): Promise<ActionResult> => {
  if (!(await actionPermission('categories', 'UPDATE'))) return NO_PERMISSION;
  const input = parseInput(moveSchema, raw);
  if (!input.ok) return input;
  const supabase = await createSupabaseServerClient();
  const { data: target } = await supabase
    .from('categories')
    .select('group_key')
    .eq('id', input.data.id)
    .maybeSingle();
  if (!target) return fail('NOT_FOUND');
  const { data: siblings, error } = await supabase
    .from('categories')
    .select('id, sort')
    .eq('group_key', target.group_key)
    .order('sort')
    .order('created_at');
  if (error) return { ok: false, error: toActionError(error) };
  const result = await applyMove(
    supabase,
    'categories',
    siblings ?? [],
    input.data.id,
    input.data.dir
  );
  if (result.ok) done();
  return result;
};
