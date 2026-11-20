import { requirePermission } from '@/domains/admin/api/adminContext.server';
import { can } from '@/domains/admin/api/adminNav';
import { actorNameMap } from '@/domains/admin/api/auditRows.server';
import { loadGroupMatrix } from '@/domains/admin/api/groupMatrix.server';
import { DetailList } from '@/domains/admin/components/features/Detail/DetailList';
import { ListNav } from '@/domains/admin/components/features/Detail/ListNav';
import { RecordMeta } from '@/domains/admin/components/features/Detail/RecordMeta';
import { HistorySheet } from '@/domains/admin/components/features/HistorySheet';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { GroupDetailActions } from '@/domains/admin/components/widgets/GroupDetailActions';
import { PermissionMatrix } from '@/domains/admin/components/widgets/PermissionMatrix';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { PencilIcon, ShieldCheckIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

const PATH = '/admin/groups';

// 그룹 상세(보기) — 설계 6.10 «화면 흐름 표준 › 상세». 기본 정보 · 구성원 · 권한(보기 전용). 고치려면 [수정].
export default async function AdminGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requirePermission('groups', 'READ');
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();
  const canSeeUsers = can(ctx.permissions, 'users', 'READ');

  const [{ data: group }, { data: members }] = await Promise.all([
    supabase
      .from('groups')
      .select(
        'id, name, description, is_system, is_active, created_at, created_by, updated_at, updated_by'
      )
      .eq('id', id)
      .maybeSingle(),
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
  ]);
  if (!group) notFound();
  const [names, matrix] = await Promise.all([
    actorNameMap(supabase, [group.created_by, group.updated_by]),
    group.is_system
      ? Promise.resolve([])
      : loadGroupMatrix(supabase, { userId: ctx.user.id, mine: ctx.permissions }, group.id),
  ]);
  const people = (members ?? [])
    .flatMap(m => (m.profiles ? [m.profiles] : []))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  const memberCount = (members ?? []).length;
  const granted = matrix.reduce((n, r) => n + r.cells.filter(c => c.checked).length, 0);
  const canToggle =
    !group.is_system &&
    (can(ctx.permissions, 'groups', 'UPDATE') || can(ctx.permissions, 'groups', 'DELETE'));

  return (
    <>
      <div className="flex flex-col gap-2">
        <PageHeader
          title={group.name}
          description={group.description ?? undefined}
          actions={
            <>
              <ListNav listPath={PATH} id={group.id} />
              {can(ctx.permissions, 'groups', 'UPDATE') && (
                <Button nativeButton={false} render={<Link href={`${PATH}/${group.id}/edit`} />}>
                  <PencilIcon data-icon="inline-start" />
                  수정
                </Button>
              )}
              {canToggle && (
                <GroupDetailActions
                  group={{
                    id: group.id,
                    name: group.name,
                    description: group.description ?? '',
                    isActive: group.is_active,
                    updatedAt: group.updated_at,
                  }}
                />
              )}
              {can(ctx.permissions, 'groups', 'HISTORY') && (
                <HistorySheet table="groups" rowId={group.id} subject={group.name} />
              )}
            </>
          }
        />
        <RecordMeta
          createdAt={group.created_at}
          createdBy={group.created_by ? names[group.created_by] : '시스템'}
          updatedAt={group.updated_at}
          updatedBy={group.updated_by ? names[group.updated_by] : '시스템'}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              items={[
                { label: '그룹 이름', value: group.name },
                {
                  label: '상태',
                  value: group.is_system ? (
                    <Badge variant="accent">모든 권한</Badge>
                  ) : group.is_active ? (
                    <Badge variant="success">사용 중</Badge>
                  ) : (
                    <Badge variant="neutral">꺼짐</Badge>
                  ),
                },
                { label: '설명', value: group.description || '—', wide: true },
                { label: '구성원', value: `${memberCount}명` },
                {
                  label: '권한',
                  value: group.is_system ? '모든 메뉴 · 모든 기능' : `${granted}개`,
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>구성원</CardTitle>
            <CardDescription>구성원은 사용자 화면에서 그룹을 골라 바꿉니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {!canSeeUsers ? (
              <p className="text-muted-foreground m-0 text-sm">
                {memberCount}명 — 이름은 사용자 조회 권한이 있어야 보입니다.
              </p>
            ) : people.length === 0 ? (
              <p className="text-muted-foreground m-0 text-sm">아직 구성원이 없습니다.</p>
            ) : (
              <ul className="m-0 flex max-h-80 list-none flex-col divide-y overflow-y-auto p-0">
                {people.map(p => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 py-2 first:pt-0"
                  >
                    <div className="flex min-w-0 flex-col">
                      <Link
                        href={`/admin/users/${p.id}`}
                        className="truncate text-sm font-medium underline-offset-4 hover:underline"
                      >
                        {p.name}
                      </Link>
                      <span className="text-muted-foreground truncate text-xs">{p.email}</span>
                    </div>
                    {!p.is_active && <Badge variant="neutral">꺼짐</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>권한</CardTitle>
          <CardDescription>
            이 그룹이 쓸 수 있는 메뉴와 기능입니다. «–» 는 그 메뉴에 없는 기능입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {group.is_system ? (
            <Alert>
              <ShieldCheckIcon aria-hidden />
              <AlertDescription>
                이 그룹은 모든 메뉴의 모든 기능을 가집니다. 끄거나 지울 수 없고, 구성원은 «전체
                관리» 구성원만 바꿀 수 있습니다.
              </AlertDescription>
            </Alert>
          ) : (
            <PermissionMatrix rows={matrix} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
