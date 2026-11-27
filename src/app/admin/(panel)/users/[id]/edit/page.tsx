import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { loadMyGroups } from '@/domains/admin/api/server/myGroups.server';
import { groupChoices } from '@/domains/admin/lib/groupScope';
import { canEditUser } from '@/domains/admin/lib/userAccess';
import { Deferred } from '@/domains/admin/components/features/Deferred';
import { FormScreenSkeleton } from '@/domains/admin/components/features/ScreenSkeleton';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { UserForm } from '@/domains/admin/components/widgets/UserForm';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { notFound } from 'next/navigation';
import { z } from 'zod';

// 수정 폼은 원래 값이 있어야 그릴 수 있어 화면 전체를 서버에서 오는 대로 그린다 — 오기 전에는 폼 뼈대(Deferred — ADR 0027)
export const instant = true;

type Params = Promise<{ id: string }>;

// 사용자 수정 — 상세에서 [수정] 으로 들어온다. 저장하면 상세로 돌아간다. 머리는 이름만(«수정» 은 위쪽 경로 표시가 알린다).
export default function AdminUserEditPage({ params }: { params: Params }) {
  return <Deferred content={userEdit(params)} fallback={<FormScreenSkeleton />} />;
}

/** 화면 전체(머리 · 수정 폼) — 권한을 확인하고(없으면 «없음») 읽어 그린다 */
const userEdit = async (params: Params) => {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  // 권한 확인과 함께 읽는다(DB 왕복 한 번 줄이기) — 권한이 없으면 404 로 끊고 읽은 값은 버린다(막는 것은 DB 의 RLS)
  // 그룹은 «전체 관리» 가 아니면 내가 속한 그룹만 넣고 뺀다(설계 6.4 ②) — «전체 관리» 소속은 잠긴 채 보여 준다
  const context = requirePermission('users', 'UPDATE');
  const [
    { user },
    mine,
    { data: profile },
    { data: groups },
    { data: departmentLimit },
    { data: canManage },
  ] = await Promise.all([
    context,
    context.then(c => loadMyGroups(c.user.id)),
    supabase
      .from('profiles')
      .select('id, name, email, department, is_active, updated_at, user_groups(group_id)')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('groups').select('id, name, description, is_system, is_active').order('name'),
    supabase.rpc('my_department_limit'),
    supabase.rpc('can_manage_user', { p_target: id }),
  ]);
  if (!profile) notFound();
  // 다른 사람은 관리할 수 있을 때만(남의 그룹 사람 · 내 부서 범위 밖은 DB 가 막는다) — 상세도 [수정] 을 숨긴다
  if (
    !canEditUser({ canUpdate: true, isSelf: profile.id === user.id, canManage: canManage === true })
  )
    notFound();
  const memberOf = (profile.user_groups ?? []).map(ug => ug.group_id);

  return (
    <>
      <PageHeader title={profile.name} />
      <UserForm
        key={profile.updated_at}
        groups={groupChoices(groups ?? [], mine, memberOf)}
        ownGroupsOnly={!mine.fullAdmin}
        initial={{
          name: profile.name,
          email: profile.email,
          groupIds: memberOf,
          department: profile.department ?? '',
          isActive: profile.is_active,
        }}
        departmentLimit={departmentLimit ?? null}
        editing={{ id: profile.id, updatedAt: profile.updated_at }}
        userId={user.id}
      />
    </>
  );
};
