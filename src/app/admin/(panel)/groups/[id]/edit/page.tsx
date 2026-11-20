import { requirePermission } from '@/domains/admin/api/adminContext.server';
import { loadGroupMatrix } from '@/domains/admin/api/groupMatrix.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { GroupForm } from '@/domains/admin/components/widgets/GroupForm';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { notFound } from 'next/navigation';
import { z } from 'zod';

// 그룹 수정 — 상세에서 [수정] 으로 들어온다. 기본 정보 · 권한을 한 번에 저장하고 상세로 돌아간다.
export default async function AdminGroupEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, permissions } = await requirePermission('groups', 'UPDATE');
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: group } = await supabase
    .from('groups')
    .select('id, name, description, is_system, is_active, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (!group) notFound();
  const matrix = group.is_system
    ? undefined
    : await loadGroupMatrix(supabase, { userId: user.id, mine: permissions }, group.id);

  return (
    <>
      <PageHeader title={`${group.name} 수정`} description={group.description ?? undefined} />
      <GroupForm
        key={group.updated_at}
        userId={user.id}
        initial={{
          name: group.name,
          description: group.description ?? '',
          isActive: group.is_active,
        }}
        editing={{ id: group.id, updatedAt: group.updated_at, isSystem: group.is_system }}
        matrix={matrix}
      />
    </>
  );
}
