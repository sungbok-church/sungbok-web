import { loadGroupMatrix } from '@/domains/admin/api/server/groupMatrix.server';
import { requireFullAdmin } from '@/domains/admin/api/server/myGroups.server';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { GroupForm } from '@/domains/admin/components/widgets/GroupForm';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { notFound } from 'next/navigation';
import { z } from 'zod';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

// 그룹 수정 — 상세에서 [수정] 으로 들어온다. 이름 · 설명 · 권한을 한 번에 저장하고 상세로 돌아간다. «전체 관리» 만(설계 6.4).
// 머리는 그룹 이름만(«수정» 은 위쪽 경로 표시가 알린다). «전체 관리» 그룹은 이름 · 설명만 고친다(권한 칸 없음).
export default async function AdminGroupEditPage({ params }: { params: Promise<{ id: string }> }) {
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
}
