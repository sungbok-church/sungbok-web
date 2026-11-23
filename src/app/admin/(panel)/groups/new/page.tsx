import { loadGroupMatrix } from '@/domains/admin/api/server/groupMatrix.server';
import { requireFullAdmin } from '@/domains/admin/api/server/myGroups.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { GroupCreateForm } from '@/domains/admin/components/widgets/GroupCreateForm';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 그룹 등록 — 1 이름 · 설명 → 2 메뉴 권한, 만들 때 한 번에 저장한다. «전체 관리» 만(설계 6.4) — 아니면 404.
export default async function AdminGroupNewPage() {
  const { user } = await requireFullAdmin('groups', 'CREATE');
  const matrix = await loadGroupMatrix(await createSupabaseServerClient());
  return (
    <>
      <PageHeader title="새 그룹" />
      <GroupCreateForm userId={user.id} matrix={matrix} />
    </>
  );
}
