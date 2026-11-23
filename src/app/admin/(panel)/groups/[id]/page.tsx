import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { can } from '@/domains/admin/lib/adminNav';
import { actorNameMap } from '@/domains/admin/api/server/auditRows.server';
import { loadGroupMatrix } from '@/domains/admin/api/server/groupMatrix.server';
import { loadMyGroups } from '@/domains/admin/api/server/myGroups.server';
import { ListNav } from '@/domains/admin/components/features/Detail/ListNav';
import { RecordMeta } from '@/domains/admin/components/features/Detail/RecordMeta';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { StatusBadge } from '@/domains/admin/components/features/StatusBadge';
import { GroupDetailActions } from '@/domains/admin/components/widgets/GroupDetailActions';
import { PermissionMatrix } from '@/domains/admin/components/widgets/PermissionMatrix';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { PencilIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

const PATH = '/admin/groups';

// 그룹 상세(보기) — 설계 6.10 «화면 흐름 표준 › 상세». 머리(이름 · 상태 · 설명) · 구성원 · 권한(보기 전용) · 맨 아래 수정 시각.
// 한 값은 한 번만 — 머리에 있는 이름 · 설명 · 상태를 본문에서 되풀이하지 않고, 개수는 칸 제목 옆에 둔다.
// «전체 관리»(시스템 그룹)는 머리의 «모든 권한» 표 하나로 — 권한 칸을 그리지 않는다. 고치려면 [수정].
// 그룹을 고치고 끄고 켜는 것은 «전체 관리» 만 한다(설계 6.4) — 그 밖의 사람에게는 [수정] · 끄기/켜기를 그리지 않는다.
export default async function AdminGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  // 권한 확인과 그룹 읽기를 함께(DB 왕복 한 번 줄이기) — 권한이 없으면 404 로 끊고 읽은 값은 버린다(막는 것은 DB 의 RLS).
  // 구성원 · 이름 · 권한 표는 그다음 한 번에 읽는다(구성원 칸은 사용자 조회 권한에 따라, 권한 표는 그룹 종류에 따라 다르다).
  const [ctx, { data: group }] = await Promise.all([
    requirePermission('groups', 'READ'),
    supabase
      .from('groups')
      .select(
        'id, name, description, is_system, is_active, created_at, created_by, updated_at, updated_by'
      )
      .eq('id', id)
      .maybeSingle(),
  ]);
  if (!group) notFound();
  const canSeeUsers = can(ctx.permissions, 'users', 'READ');

  const [{ data: members }, names, matrix, { fullAdmin }] = await Promise.all([
    supabase
      .from('user_groups')
      .select(canSeeUsers ? 'user_id, profiles(id, name, email, is_active)' : 'user_id')
      .eq('group_id', id)
      .overrideTypes<
        {
          user_id: string;
          profiles?: { id: string; name: string; email: string; is_active: boolean } | null;
        }[],
        { merge: false }
      >(),
    actorNameMap(supabase, [group.created_by, group.updated_by]),
    group.is_system ? Promise.resolve([]) : loadGroupMatrix(supabase, group.id),
    loadMyGroups(ctx.user.id),
  ]);
  const people = (members ?? [])
    .flatMap(m => (m.profiles ? [m.profiles] : []))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  const memberCount = (members ?? []).length;
  const granted = matrix.reduce((n, r) => n + r.cells.filter(c => c.checked).length, 0);

  const count = (n: number) => (
    <span className="text-muted-foreground ml-1.5 font-normal tabular-nums">{n}</span>
  );

  return (
    <>
      <PageHeader
        title={group.name}
        badge={
          group.is_system ? (
            <Badge variant="accent">모든 권한</Badge>
          ) : (
            <StatusBadge active={group.is_active} />
          )
        }
        description={group.description ?? undefined}
        actions={
          <>
            <ListNav listPath={PATH} id={group.id} />
            {fullAdmin && (
              <Button nativeButton={false} render={<Link href={`${PATH}/${group.id}/edit`} />}>
                <PencilIcon data-icon="inline-start" />
                수정
              </Button>
            )}
            {/* 끄기/켜기 · 변경 이력은 «더 보기» 메뉴 하나로 */}
            <GroupDetailActions
              group={{
                id: group.id,
                name: group.name,
                description: group.description ?? '',
                isActive: group.is_active,
                updatedAt: group.updated_at,
              }}
              canToggle={fullAdmin && !group.is_system}
              canHistory={can(ctx.permissions, 'groups', 'HISTORY')}
            />
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>
            구성원
            {count(memberCount)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!canSeeUsers ? (
            <p className="text-muted-foreground m-0 text-sm">
              이름은 사용자 조회 권한이 있어야 보입니다.
            </p>
          ) : people.length === 0 ? (
            <p className="text-muted-foreground m-0 text-sm">아직 없습니다.</p>
          ) : (
            <ul className="m-0 grid max-h-96 list-none grid-cols-1 gap-x-6 gap-y-3 overflow-y-auto p-0 sm:grid-cols-2 lg:grid-cols-3">
              {people.map(p => (
                <li key={p.id} className="flex min-w-0 items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-col">
                    <Link
                      href={`/admin/users/${p.id}`}
                      className="truncate text-sm font-medium underline-offset-4 hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className="text-muted-foreground truncate text-xs">{p.email}</span>
                  </div>
                  <StatusBadge active={p.is_active} onlyOff />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!group.is_system && (
        <Card>
          <CardHeader>
            <CardTitle>
              권한
              {count(granted)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PermissionMatrix rows={matrix} />
          </CardContent>
        </Card>
      )}

      <RecordMeta
        createdAt={group.created_at}
        createdBy={group.created_by ? names[group.created_by] : '시스템'}
        updatedAt={group.updated_at}
        updatedBy={group.updated_by ? names[group.updated_by] : '시스템'}
      />
    </>
  );
}
