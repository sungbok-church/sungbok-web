import { loadGroupMatrix } from '@/domains/admin/api/server/groupMatrix.server';
import { requireFullAdmin } from '@/domains/admin/api/server/myGroups.server';
import { Deferred } from '@/domains/admin/components/features/Deferred';
import { FormScreenSkeleton } from '@/domains/admin/components/features/ScreenSkeleton';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { GroupForm } from '@/domains/admin/components/widgets/GroupForm';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { notFound } from 'next/navigation';
import { z } from 'zod';

// 수정 폼은 원래 값이 있어야 그릴 수 있어 화면 전체를 서버에서 오는 대로 그린다 — 오기 전에는 폼 뼈대(Deferred — ADR 0027)
export const instant = true;

type Params = Promise<{ id: string }>;

// 그룹 수정 — 상세에서 [수정] 으로 들어온다. 이름 · 설명 · 권한을 한 번에 저장하고 상세로 돌아간다. «전체 관리» 만(설계 6.4).
// 머리는 그룹 이름만(«수정» 은 위쪽 경로 표시가 알린다). «전체 관리» 그룹은 이름 · 설명만 고친다(권한 칸 없음).
export default function AdminGroupEditPage({ params }: { params: Params }) {
  return <Deferred content={groupEdit(params)} fallback={<FormScreenSkeleton />} />;
}

/** 화면 전체(머리 · 수정 폼) — 권한을 확인하고(없으면 «없음») 읽어 그린다 */
const groupEdit = async (params: Params) => {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  // 권한 확인과 함께 읽는다(DB 왕복 한 번 줄이기) — «전체 관리» 가 아니면 404 로 끊고 읽은 값은 버린다(막는 것은 DB)
  const [{ user }, { data: group }] = await Promise.all([
    requireFullAdmin('groups', 'UPDATE'),
    supabase
      .from('groups')
      .select('id, name, description, is_system, is_active, updated_at')
      .eq('id', id)
      .maybeSingle(),
  ]);
  if (!group) notFound();
  // 시스템 그룹(«전체 관리»)은 표가 없다(모든 권한)
  const matrix = group.is_system ? undefined : await loadGroupMatrix(supabase, group.id);

  return (
    <>
      <PageHeader title={group.name} />
      <GroupForm
        key={group.updated_at}
        userId={user.id}
        initial={{
          name: group.name,
          description: group.description ?? '',
          isActive: group.is_active,
        }}
        editing={{ id: group.id, updatedAt: group.updated_at }}
        matrix={matrix}
      />
    </>
  );
};
