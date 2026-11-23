import { loadGroupMatrix } from '@/domains/admin/api/server/groupMatrix.server';
import { requireFullAdmin } from '@/domains/admin/api/server/myGroups.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { GroupForm } from '@/domains/admin/components/widgets/GroupForm';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 그룹 등록 — 이름 · 설명과 권한을 한 번에. «전체 관리» 만(설계 6.4) — 아니면 404.
export default async function AdminGroupNewPage() {
  const { user } = await requireFullAdmin('groups', 'CREATE');
  const matrix = await loadGroupMatrix(await createSupabaseServerClient());
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
