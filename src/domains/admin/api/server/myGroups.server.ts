// 로그인한 사람의 그룹 소속 — «전체 관리» 인가 · 내 그룹(설계 6.4). 그릴지 말지와 저장 전 확인에 쓴다(막는 것은 DB 의
// is_full_admin · is_my_group). 한 요청 안에서는 한 번만 읽는다.
import 'server-only';

import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import type { PermissionAction } from '../../lib/adminNav';
import type { MyGroups } from '../../lib/groupScope';
import { actionPermission, type AdminContext, requirePermission } from './adminContext.server';

/**
 * 내 user_groups 행(늘 읽힌다 — RLS)을 한 번 읽는다. 켜진 시스템 그룹 구성원이면 «전체 관리». groupIds 는 시스템 그룹을 뺀 내 그룹.
 * 그룹 행이 안 읽히면(groups null) «전체 관리» 가 아닌 내 그룹으로 센다. 읽지 못하면 그룹 없음 — 고칠 수 없게 그린다.
 */
export const loadMyGroups = cache(async (userId: string): Promise<MyGroups> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('user_groups')
    .select('group_id, groups(is_system, is_active)')
    .eq('user_id', userId);
  if (error || !data) return { fullAdmin: false, groupIds: [] };
  return {
    fullAdmin: data.some(r => r.groups?.is_system && r.groups.is_active),
    groupIds: data.filter(r => !r.groups?.is_system).map(r => r.group_id),
  };
});

/**
 * «전체 관리» 그룹 id — 그 소속은 화면에서 아무도 바꾸지 않는다(설계 6.4). 서버가 Auth API · DB 를 부르기 전에 본다.
 * 읽지 못하면 빈 목록(막는 것은 DB 의 guard_user_groups).
 */
export const loadSystemGroupIds = cache(async (): Promise<string[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('groups').select('id').eq('is_system', true);
  return error || !data ? [] : data.map(g => g.id);
});

/** «전체 관리» 만 여는 화면(그룹 등록 · 수정) — 권한이 없거나 «전체 관리» 가 아니면 없는 화면(404) */
export const requireFullAdmin = async (
  menuKey: string,
  action: PermissionAction
): Promise<AdminContext> => {
  const ctx = await requirePermission(menuKey, action);
  if (!(await loadMyGroups(ctx.user.id)).fullAdmin) notFound();
  return ctx;
};

/** «전체 관리» 만 하는 Server Action(그룹 만들기 · 고치기) — 아니면 null(부르는 쪽이 NO_PERMISSION) */
export const actionFullAdmin = async (
  menuKey: string,
  action: PermissionAction
): Promise<AdminContext | null> => {
  const ctx = await actionPermission(menuKey, action);
  return ctx && (await loadMyGroups(ctx.user.id)).fullAdmin ? ctx : null;
};
