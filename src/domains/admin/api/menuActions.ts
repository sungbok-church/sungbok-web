'use server';

import { fail } from '@/shared/api/result';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { revalidatePath } from 'next/cache';

import { type ActionResult, parseInput, toActionError } from './actionResult';
import { actionPermission, NO_PERMISSION } from './adminContext.server';
import { menuUpdateSchema, moveSchema } from './codeInput';
import { applyMove } from './sortRows.server';
import { updateVersioned } from './versionedUpdate.server';

/**
 * 메뉴 이름 · 사용 여부(설계 6.5). 이름을 비우면 기본 이름으로 돌아간다. 잠긴 메뉴는 끌 수 없고,
 * 그 밖의 칸(주소 · 기능 · 상위)은 DB 가 막는다(guard_menus). 왼쪽 메뉴에 바로 반영되도록 관리자 전체를 다시 그린다.
 */
export const updateMenu = async (raw: unknown): Promise<ActionResult<{ updatedAt: string }>> => {
  if (!(await actionPermission('menus', 'UPDATE'))) return NO_PERMISSION;
  const input = parseInput(menuUpdateSchema, raw);
  if (!input.ok) return input;
  const { id, updatedAt, label, isActive } = input.data;
  const supabase = await createSupabaseServerClient();
  const result = await updateVersioned(supabase, 'menus', id, updatedAt, {
    label,
    is_active: isActive,
  });
  if (result.ok) revalidatePath('/admin', 'layout');
  return result;
};

/** 같은 영역 · 같은 상위 메뉴 안에서 위로 · 아래로(다른 상위로 옮기기는 없다 — 설계 11-5). */
export const moveMenu = async (raw: unknown): Promise<ActionResult> => {
  if (!(await actionPermission('menus', 'UPDATE'))) return NO_PERMISSION;
  const input = parseInput(moveSchema, raw);
  if (!input.ok) return input;
  const supabase = await createSupabaseServerClient();
  const { data: target } = await supabase
    .from('menus')
    .select('area, parent_id')
    .eq('id', input.data.id)
    .maybeSingle();
  if (!target) return fail('NOT_FOUND');
  let siblings = supabase.from('menus').select('id, sort').eq('area', target.area);
  siblings = target.parent_id
    ? siblings.eq('parent_id', target.parent_id)
    : siblings.is('parent_id', null);
  const { data, error } = await siblings.order('sort').order('created_at');
  if (error) return { ok: false, error: toActionError(error) };
  const result = await applyMove(supabase, 'menus', data ?? [], input.data.id, input.data.dir);
  if (result.ok) revalidatePath('/admin', 'layout');
  return result;
};
