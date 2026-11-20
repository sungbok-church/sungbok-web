import { requirePermission } from '@/domains/admin/api/adminContext.server';
import { can } from '@/domains/admin/api/adminNav';
import { loadGroupMatrix } from '@/domains/admin/api/groupMatrix.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { GroupForm } from '@/domains/admin/components/widgets/GroupForm';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';

// 그룹 등록 — 이름 · 설명과 권한을 한 번에. 권한을 줄 수 있는 사람(그룹 수정 권한)에게만 표가 보인다.
export default async function AdminGroupNewPage() {
  const { user, permissions } = await requirePermission('groups', 'CREATE');
  const matrix = can(permissions, 'groups', 'UPDATE')
    ? await loadGroupMatrix(await createSupabaseServerClient(), {
        userId: user.id,
        mine: permissions,
      })
    : undefined;
  return (
    <>
      <PageHeader title="새 그룹" description="그룹 이름과 메뉴별 권한을 정합니다." />
      <GroupForm
        userId={user.id}
        initial={{ name: '', description: '', isActive: true }}
        matrix={matrix}
      />
    </>
  );
}
