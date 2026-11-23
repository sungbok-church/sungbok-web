import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { loadMyGroups } from '@/domains/admin/api/server/myGroups.server';
import { groupChoices } from '@/domains/admin/lib/groupScope';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { UserForm } from '@/domains/admin/components/widgets/UserForm';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { notFound } from 'next/navigation';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 계정 만들기 — 만들면 임시 비밀번호를 한 번 보여 준다(설계 11-1).
export default async function AdminUserNewPage() {
  const supabase = await createSupabaseServerClient();
  // 권한 확인과 함께 읽는다(DB 왕복 한 번 줄이기) — 권한이 없으면 404 로 끊고 읽은 값은 버린다(막는 것은 DB 의 RLS)
  // 부서 범위(«전체 관리» 아님 · 담당 부서 있음)가 있으면 그 부서로만 만든다 — 폼은 부서를 고정해 보여 준다
  // 범위를 읽지 못하면 어느 부서로 만들지 모른다 — 없는 화면으로(createUser 도 같은 경우 만들지 않는다)
  // 그룹은 «전체 관리» 가 아니면 내가 속한 그룹만 고른다(설계 6.4 ②) — 권한 확인 뒤 이어서 읽되 나머지와는 함께
  const context = requirePermission('users', 'CREATE');
  const [, mine, { data: groups }, { data: departmentLimit, error: scopeError }] =
    await Promise.all([
      context,
      context.then(c => loadMyGroups(c.user.id)),
      supabase
        .from('groups')
        .select('id, name, is_system, is_active, description')
        .eq('is_active', true)
        .order('name'),
      supabase.rpc('my_department_limit'),
    ]);
  if (scopeError) notFound();
  return (
    <>
      <PageHeader
        title="새 사용자"
        description="계정을 만들면 임시 비밀번호가 한 번 보입니다. 받은 사람은 첫 로그인 때 새 비밀번호를 정합니다."
      />
      <UserForm
        mode="create"
        groups={groupChoices(groups ?? [], mine, [])}
        ownGroupsOnly={!mine.fullAdmin}
        initial={{
          name: '',
          email: '',
          groupIds: [],
          department: departmentLimit ?? '',
          isActive: true,
        }}
        departmentLimit={departmentLimit ?? null}
      />
    </>
  );
}
