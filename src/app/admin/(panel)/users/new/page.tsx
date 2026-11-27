import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { loadMyGroups } from '@/domains/admin/api/server/myGroups.server';
import { can } from '@/domains/admin/lib/adminNav';
import { groupChoices } from '@/domains/admin/lib/groupScope';
import { readMenuRows } from '@/domains/admin/lib/permissionSummary';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import {
  type UserNewData,
  UserNewForm,
} from '@/domains/admin/components/widgets/UserCreateForm/UserNewForm';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { notFound } from 'next/navigation';
import { cache, Suspense } from 'react';

// 미리 만든 틀로 누르는 즉시 보이고 바로 쓴다(ADR 0027) — 제목 · 1단계 폼은 틀에, 그룹 · 부서 범위 · 권한은 약속으로 넘겨
// 오는 대로 채우고, 권한 · 부서 범위 확인은 Suspense 안의 NewUserGate 가 한다(아니면 «없음»)
export const instant = true;

// 부서 범위(«전체 관리» 아님 · 담당 부서 있음)가 있으면 그 부서로만 만든다 — 폼은 부서를 고정해 보여 준다.
// 확인(NewUserGate)과 폼 값(loadNewUser)이 함께 쓴다 — 한 요청 안에서 한 번만 읽는다(cache)
const readDepartmentLimit = cache(async () =>
  (await createSupabaseServerClient()).rpc('my_department_limit')
);

/** 사용자 등록 권한 · 부서 범위를 확인만 한다 — 범위를 읽지 못하면 어느 부서로 만들지 모른다(createUser 도 같은 경우 만들지 않는다) */
const NewUserGate = async () => {
  const [, { error }] = await Promise.all([
    requirePermission('users', 'CREATE'),
    readDepartmentLimit(),
  ]);
  if (error) notFound();
  return null;
};

/**
 * 고를 그룹 · 부서 범위 · 메뉴와 그룹 권한 — 기다리지 않고 약속으로 넘긴다.
 * 그룹은 «전체 관리» 가 아니면 내가 속한 그룹만 고른다(설계 6.4 ②). 메뉴와 그룹 권한(group_permissions)은 «이 사람이 갖게 될
 * 권한» 요약에 쓴다 — 그룹 권한은 «그룹 · 권한» 조회 권한이 있어야 읽히므로(RLS) 없으면 요약 없이 그린다
 */
const loadNewUser = async (): Promise<UserNewData> => {
  const supabase = await createSupabaseServerClient();
  // 권한을 확인한 뒤에만 내보낸다(없으면 «없음»)
  const context = requirePermission('users', 'CREATE');
  const [{ permissions }, mine, { data: groups }, { data: departmentLimit }, { data: menuRows }] =
    await Promise.all([
      context,
      context.then(c => loadMyGroups(c.user.id)),
      supabase
        .from('groups')
        .select('id, name, is_system, is_active, description')
        .eq('is_active', true)
        .order('name'),
      readDepartmentLimit(),
      supabase
        .from('menus')
        .select(
          'id, key, parent_id, label, default_label, sort, actions, group_permissions(group_id, action)'
        )
        .eq('area', 'ADMIN')
        .order('sort'),
    ]);
  const { menus, grants } = readMenuRows(menuRows ?? []);
  return {
    groups: groupChoices(groups ?? [], mine, []),
    ownGroupsOnly: !mine.fullAdmin,
    departmentLimit: departmentLimit ?? null,
    menus,
    grants: can(permissions, 'groups', 'READ') && menuRows ? grants : null,
  };
};

// 새 사용자 — 1 기본 정보 → 2 역할 → 3 확인
export default function AdminUserNewPage() {
  return (
    <>
      <PageHeader title="새 사용자" />
      <Suspense fallback={null}>
        <NewUserGate />
      </Suspense>
      <UserNewForm data={loadNewUser()} />
    </>
  );
}
