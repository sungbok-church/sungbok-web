'use server';

import { fail } from '@/shared/api/result';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { revalidatePath } from 'next/cache';

import { type ActionResult, parseInput, toActionError } from './actionResult';
import { actionPermission, NO_PERMISSION } from './adminContext.server';
import { codeCreateSchema, codeUpdateSchema, moveSchema } from './codeInput';
import { applyMove } from './sortRows.server';
import { updateVersioned } from './versionedUpdate.server';

const PATH = '/admin/codes';
const STEP = 10;

/** 고친 뒤: 이 화면을 새로 그린다. 드롭다운 · 조건은 그릴 때마다 DB 를 읽으므로 지울 캐시가 없다(ADR 0023) */
const done = () => revalidatePath(PATH);

/**
 * 공통코드 더하기 — 묶음의 맨 뒤 순서로, 코드 값은 대문자. 잠긴 묶음(enum 과 같은 값)에는 더하지 않는다
 * (DB 의 guard_codes 도 막는다). 묶음(code_groups)은 변경 파일로만 생긴다.
 */
export const createCode = async (raw: unknown): Promise<ActionResult> => {
  if (!(await actionPermission('codes', 'CREATE'))) return NO_PERMISSION;
  const input = parseInput(codeCreateSchema, raw);
  if (!input.ok) return input;
  const { groupKey, code, label } = input.data;
  const supabase = await createSupabaseServerClient();
  const { data: group } = await supabase
    .from('code_groups')
    .select('is_locked')
    .eq('key', groupKey)
    .maybeSingle();
  if (!group) return fail('NOT_FOUND');
  if (group.is_locked) return fail('LOCKED_CODE');
  const { data: last } = await supabase
    .from('codes')
    .select('sort')
    .eq('group_key', groupKey)
    .order('sort', { ascending: false })
    .limit(1);
  const sort = (last?.[0]?.sort ?? 0) + STEP;
  const { error } = await supabase.from('codes').insert({ group_key: groupKey, code, label, sort });
  if (error) return { ok: false, error: toActionError(error) };
  done();
  return { ok: true, message: '코드를 더했습니다.' };
};

/** 이름 · 사용 여부(잠긴 코드는 이름만 — 끄기는 DB 가 막는다). 코드는 지우지 않고 끈다. */
export const updateCode = async (raw: unknown): Promise<ActionResult<{ updatedAt: string }>> => {
  if (!(await actionPermission('codes', 'UPDATE'))) return NO_PERMISSION;
  const input = parseInput(codeUpdateSchema, raw);
  if (!input.ok) return input;
  const { id, updatedAt, label, isActive } = input.data;
  const supabase = await createSupabaseServerClient();
  const result = await updateVersioned(supabase, 'codes', id, updatedAt, {
    label,
    is_active: isActive,
  });
  if (result.ok) done();
  return result;
};

/** 같은 묶음 안에서 위로 · 아래로. */
export const moveCode = async (raw: unknown): Promise<ActionResult> => {
  if (!(await actionPermission('codes', 'UPDATE'))) return NO_PERMISSION;
  const input = parseInput(moveSchema, raw);
  if (!input.ok) return input;
  const supabase = await createSupabaseServerClient();
  const { data: target } = await supabase
    .from('codes')
    .select('group_key')
    .eq('id', input.data.id)
    .maybeSingle();
  if (!target) return fail('NOT_FOUND');
  const { data: siblings, error } = await supabase
    .from('codes')
    .select('id, sort')
    .eq('group_key', target.group_key)
    .order('sort')
    .order('created_at');
  if (error) return { ok: false, error: toActionError(error) };
  const result = await applyMove(supabase, 'codes', siblings ?? [], input.data.id, input.data.dir);
  if (result.ok) done();
  return result;
};
