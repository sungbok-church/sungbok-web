'use server';

import { fail } from '@/shared/api/result';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { revalidatePath } from 'next/cache';

import { type ActionResult, parseInput, toActionError } from './actionResult';
import { actionPermission, NO_PERMISSION } from './adminContext.server';
import type { Permission } from './adminNav';
import { groupCreateSchema, groupPermissionsSchema, groupUpdateSchema } from './groupInput';
import { diffPermissions } from './permissionMatrix';
import { updateVersioned } from './versionedUpdate.server';

const LIST = '/admin/groups';

/** 그룹 만들기 — 권한은 만든 뒤 표에서 준다. key · 시스템 여부는 화면에서 정하지 않는다(DB 가 막는다). */
export const createGroup = async (raw: unknown): Promise<ActionResult<{ id: string }>> => {
  if (!(await actionPermission('groups', 'CREATE'))) return NO_PERMISSION;
  const input = parseInput(groupCreateSchema, raw);
  if (!input.ok) return input;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('groups').insert(input.data).select('id').single();
  if (error || !data) return { ok: false, error: toActionError(error) };
  revalidatePath(LIST);
  return { ok: true, data: { id: data.id }, message: '그룹을 만들었습니다.' };
};

/** 이름 · 설명 · 사용 여부. «삭제» 권한만 있으면 사용 여부만 바뀐다(DB 의 guard_groups). */
export const updateGroup = async (raw: unknown): Promise<ActionResult<{ updatedAt: string }>> => {
  // 수정 또는 삭제(사용 여부만) 권한 — 조회만이면 행 권한이 0줄로 걸러 «다른 사람이 먼저 고쳤습니다» 로 잘못 알려진다
  const allowed =
    (await actionPermission('groups', 'UPDATE')) ?? (await actionPermission('groups', 'DELETE'));
  if (!allowed) return NO_PERMISSION;
  const input = parseInput(groupUpdateSchema, raw);
  if (!input.ok) return input;
  const { id, updatedAt, name, description, isActive } = input.data;
  const supabase = await createSupabaseServerClient();
  const result = await updateVersioned(supabase, 'groups', id, updatedAt, {
    name,
    description,
    is_active: isActive,
  });
  if (result.ok) {
    revalidatePath(LIST);
    revalidatePath(`${LIST}/${id}`);
  }
  return result;
};

/**
 * 권한 표 저장 — 지금 칸과 비교해 바뀐 것만 넣고 뺀다. 로그인한 사람의 세션으로 하므로
 * «자기가 가진 권한만 줄 수 있다» 를 DB 가 다시 막는다.
 */
export const saveGroupPermissions = async (raw: unknown): Promise<ActionResult> => {
  if (!(await actionPermission('groups', 'UPDATE'))) return NO_PERMISSION;
  const input = parseInput(groupPermissionsSchema, raw);
  if (!input.ok) return input;
  const { groupId, permissions } = input.data;
  const supabase = await createSupabaseServerClient();

  const [{ data: menus, error: menuError }, { data: current, error: currentError }] =
    await Promise.all([
      supabase.from('menus').select('id, key').eq('area', 'ADMIN'),
      supabase.from('group_permissions').select('action, menus(key)').eq('group_id', groupId),
    ]);
  if (menuError || currentError)
    return { ok: false, error: toActionError(menuError ?? currentError) };
  const menuId = new Map((menus ?? []).map(menu => [menu.key, menu.id]));
  if (permissions.some(p => !menuId.has(p.menuKey))) return fail('NOT_FOUND');

  const before: Permission[] = (current ?? []).flatMap(row =>
    row.menus ? [{ menuKey: row.menus.key, action: row.action }] : []
  );
  const { add, remove } = diffPermissions(before, permissions);

  if (add.length > 0) {
    const { error } = await supabase
      .from('group_permissions')
      .insert(
        add.map(p => ({ group_id: groupId, menu_id: menuId.get(p.menuKey)!, action: p.action }))
      );
    if (error) return { ok: false, error: toActionError(error) };
  }
  for (const p of remove) {
    const target = menuId.get(p.menuKey);
    if (!target) continue;
    const { error } = await supabase
      .from('group_permissions')
      .delete()
      .eq('group_id', groupId)
      .eq('menu_id', target)
      .eq('action', p.action);
    if (error) return { ok: false, error: toActionError(error) };
  }

  revalidatePath(`${LIST}/${groupId}`);
  return { ok: true, message: '권한을 저장했습니다.' };
};
