import { requirePermission } from '@/domains/admin/api/adminContext.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { UserForm } from '@/domains/admin/components/widgets/UserForm';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 계정 만들기 — 만들면 임시 비밀번호를 한 번 보여 준다(설계 11-1).
export default async function AdminUserNewPage() {
  const supabase = await createSupabaseServerClient();
  // 권한 확인과 함께 읽는다(DB 왕복 한 번 줄이기) — 권한이 없으면 404 로 끊고 읽은 값은 버린다(막는 것은 DB 의 RLS)
  const [, { data: groups }] = await Promise.all([
    requirePermission('users', 'CREATE'),
    supabase
      .from('groups')
      .select('id, name, is_system, description')
      .eq('is_active', true)
      .order('name'),
  ]);
  return (
    <>
      <PageHeader
        title="새 사용자"
        description="계정을 만들면 임시 비밀번호가 한 번 보입니다. 받은 사람은 첫 로그인 때 새 비밀번호를 정합니다."
      />
      <UserForm
        mode="create"
        groups={(groups ?? []).map(g => ({
          id: g.id,
          name: g.name,
          isSystem: g.is_system,
          description: g.description,
        }))}
        initial={{ name: '', email: '', groupIds: [], department: '', isActive: true }}
      />
    </>
  );
}
