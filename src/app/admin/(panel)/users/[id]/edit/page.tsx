import { requirePermission } from '@/domains/admin/api/adminContext.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { UserForm } from '@/domains/admin/components/widgets/UserForm';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { notFound } from 'next/navigation';
import { z } from 'zod';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 사용자 수정 — 상세에서 [수정] 으로 들어온다. 저장하면 상세로 돌아간다.
export default async function AdminUserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requirePermission('users', 'UPDATE');
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, { data: groups }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, email, department, is_active, updated_at, user_groups(group_id)')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('groups').select('id, name, description, is_system, is_active').order('name'),
  ]);
  if (!profile) notFound();
  const memberOf = (profile.user_groups ?? []).map(ug => ug.group_id);

  return (
    <>
      <PageHeader title={`${profile.name} 수정`} description={profile.email} />
      <UserForm
        key={profile.updated_at}
        mode="edit"
        groups={(groups ?? [])
          .filter(g => g.is_active || memberOf.includes(g.id))
          .map(g => ({
            id: g.id,
            name: g.name,
            isSystem: g.is_system,
            description: g.description,
          }))}
        initial={{
          name: profile.name,
          email: profile.email,
          groupIds: memberOf,
          department: profile.department ?? '',
          isActive: profile.is_active,
        }}
        editing={{ id: profile.id, updatedAt: profile.updated_at }}
        userId={user.id}
      />
    </>
  );
}
