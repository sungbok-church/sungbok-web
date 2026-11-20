'use server';

import { fail } from '@/shared/api/result';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { revalidatePath } from 'next/cache';

import { type ActionResult, parseInput, toActionError } from './actionResult';
import { actionPermission, NO_PERMISSION } from './adminContext.server';
import type { Permission } from './adminNav';
import { groupCreateSchema, groupSaveSchema, groupUpdateSchema } from './groupInput';
import { updateVersioned } from './versionedUpdate.server';

const LIST = '/admin/groups';

// 권한 표는 DB 함수에 «메뉴key:기능» 목록으로 보낸다
const toKeys = (permissions: Permission[]) => permissions.map(p => `${p.menuKey}:${p.action}`);

/** 모르는 메뉴 key 가 있으면 NOT_FOUND — DB 함수는 모르는 key 를 조용히 건너뛰므로 먼저 거른다 */
const unknownMenu = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  permissions: Permission[]
) => {
  if (permissions.length === 0) return null;
  const { data, error } = await supabase.from('menus').select('key').eq('area', 'ADMIN');
  if (error) return { ok: false as const, error: toActionError(error) };
  const keys = new Set((data ?? []).map(m => m.key));
  return permissions.every(p => keys.has(p.menuKey)) ? null : fail('NOT_FOUND');
};

/**
 * 그룹 만들기 — 처음 권한 표를 함께, 한 트랜잭션으로(create_group). 권한이 하나라도 막히면 그룹도 만들지 않는다.
 * 권한 넣기는 DB 가 «그룹 수정» 으로 판정하므로 권한을 함께 주면 그 권한도 확인한다. key · 시스템 여부는 화면에서 정하지 않는다.
 */
export const createGroup = async (raw: unknown): Promise<ActionResult<{ id: string }>> => {
  if (!(await actionPermission('groups', 'CREATE'))) return NO_PERMISSION;
  const input = parseInput(groupCreateSchema, raw);
  if (!input.ok) return input;
  const { name, description, permissions } = input.data;
  if (permissions.length > 0 && !(await actionPermission('groups', 'UPDATE'))) return NO_PERMISSION;
  const supabase = await createSupabaseServerClient();
  const unknown = await unknownMenu(supabase, permissions);
  if (unknown) return unknown;
  const { data, error } = await supabase.rpc('create_group', {
    p_name: name,
    p_description: description as string, // 생성 타입은 null 을 모르지만 SQL 은 받는다
    p_permissions: toKeys(permissions),
  });
  if (error || !data) return { ok: false, error: toActionError(error) };
  revalidatePath(LIST);
  return { ok: true, data: { id: data }, message: '그룹을 만들었습니다.' };
};

/**
 * 그룹 고치기 — 이름 · 설명 · 사용 여부와 권한 표를 한 번에(save_group). 화면을 연 뒤 다른 사람이 그룹이나 권한 표를
 * 바꿨으면 저장하지 않는다(CONFLICT). 권한 표를 고치려면 «수정», 그룹 정보만이면 «수정» 또는 «삭제»(사용 여부만 — DB 의 guard_groups).
 */
export const saveGroup = async (raw: unknown): Promise<ActionResult<{ updatedAt: string }>> => {
  const input = parseInput(groupSaveSchema, raw);
  if (!input.ok) return input;
  const { id, updatedAt, name, description, isActive, permissions, seenPermissions } = input.data;
  const allowed = permissions
    ? await actionPermission('groups', 'UPDATE')
    : ((await actionPermission('groups', 'UPDATE')) ??
      (await actionPermission('groups', 'DELETE')));
  if (!allowed) return NO_PERMISSION;
  const supabase = await createSupabaseServerClient();
  const unknown = await unknownMenu(supabase, permissions ?? []);
  if (unknown) return unknown;
  const { data, error } = await supabase.rpc('save_group', {
    p_id: id,
    p_updated_at: updatedAt,
    p_name: name,
    p_description: description as string, // 생성 타입은 null 을 모르지만 SQL 은 받는다
    p_is_active: isActive,
    // 권한 표가 없으면 null — 권한은 그대로(«전체 관리»)
    p_permissions: (permissions ? toKeys(permissions) : null) as string[],
    p_seen_permissions: (seenPermissions ? toKeys(seenPermissions) : null) as string[],
  });
  if (error) return { ok: false, error: toActionError(error) };
  if (!data) return fail('CONFLICT');
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
  return { ok: true, data: { updatedAt: data }, message: '저장했습니다.' };
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
