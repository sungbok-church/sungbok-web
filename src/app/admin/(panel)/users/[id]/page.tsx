import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { can } from '@/domains/admin/lib/adminNav';
import { actorNameMap } from '@/domains/admin/api/server/auditRows.server';
import { DEPARTMENTS } from '@/domains/admin/lib/input/userInput';
import { canEditUser } from '@/domains/admin/lib/userAccess';
import { DetailList } from '@/domains/admin/components/features/Detail/DetailList';
import { ListNav } from '@/domains/admin/components/features/Detail/ListNav';
import { RecordMeta } from '@/domains/admin/components/features/Detail/RecordMeta';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { StatusBadge } from '@/domains/admin/components/features/StatusBadge';
import { UserDetailActions } from '@/domains/admin/components/widgets/UserDetailActions';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { PencilIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

const PATH = '/admin/users';

// 사용자 상세(보기) — 설계 6.10 «화면 흐름 표준 › 상세». 고치려면 [수정].
export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSupabaseServerClient();

  // 권한 확인과 함께 읽는다 — users/page.tsx 와 같다
  const [ctx, { data: profile }, { data: canManage }] = await Promise.all([
    requirePermission('users', 'READ'),
    supabase
      .from('profiles')
      .select(
        'id, name, email, department, is_active, must_change_password, created_at, created_by, updated_at, updated_by, user_groups(groups(id, name, description, is_system, is_active))'
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.rpc('can_manage_user', { p_target: id }),
  ]);
  if (!profile) notFound();
  // 다른 사람은 관리할 수 있을 때만 고친다(설계 6.4 — 남의 그룹 사람 · 내 부서 범위 밖은 DB 가 막는다). 자기 자신은 이름을 고친다
  const canEdit = canEditUser({
    canUpdate: can(ctx.permissions, 'users', 'UPDATE'),
    isSelf: profile.id === ctx.user.id,
    canManage: canManage === true,
  });
  const names = await actorNameMap(supabase, [profile.created_by, profile.updated_by]);
  const groups = (profile.user_groups ?? []).flatMap(ug => (ug.groups ? [ug.groups] : []));

  return (
    <>
      <div className="flex flex-col gap-2">
        <PageHeader
          title={profile.name}
          description={profile.email}
          actions={
            <>
              <ListNav listPath={PATH} id={profile.id} />
              {canEdit && (
                <Button nativeButton={false} render={<Link href={`${PATH}/${profile.id}/edit`} />}>
                  <PencilIcon data-icon="inline-start" />
                  수정
                </Button>
              )}
              {/* 비밀번호 초기화 · 끄기/켜기 · 변경 이력은 «더 보기» 메뉴 하나로 */}
              <UserDetailActions
                userId={profile.id}
                email={profile.email}
                name={profile.name}
                isActive={profile.is_active}
                canManage={canManage === true}
                canHistory={can(ctx.permissions, 'users', 'HISTORY')}
              />
            </>
          }
        />
        <RecordMeta
          createdAt={profile.created_at}
          createdBy={profile.created_by ? names[profile.created_by] : '시스템'}
          updatedAt={profile.updated_at}
          updatedBy={profile.updated_by ? names[profile.updated_by] : '시스템'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              items={[
                { label: '이름', value: profile.name },
                { label: '이메일(로그인 아이디)', value: profile.email },
                {
                  label: '상태',
                  value: <StatusBadge active={profile.is_active} />,
                },
                {
                  label: '담당 부서',
                  value: (
                    <span className="flex flex-col gap-0.5">
                      {profile.department
                        ? (DEPARTMENTS.find(d => d.value === profile.department)?.label ??
                          profile.department)
                        : '모든 부서'}
                      <span className="text-muted-foreground text-xs font-normal">
                        {profile.department
                          ? '«다음세대 부서» 메뉴에서 이 부서만 고칩니다.'
                          : '«다음세대 부서» 메뉴에서 부서를 가리지 않고 고칩니다.'}
                      </span>
                    </span>
                  ),
                },
                {
                  label: '비밀번호',
                  value: profile.must_change_password ? '다음 로그인 때 바꿔야 함' : '정상',
                },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>그룹</CardTitle>
            <CardDescription>속한 그룹의 권한을 합쳐 갖습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <p className="text-muted-foreground m-0 text-sm">
                속한 그룹이 없습니다 — 아무 메뉴도 쓸 수 없습니다.
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col divide-y p-0">
                {groups.map(g => (
                  <li key={g.id} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {can(ctx.permissions, 'groups', 'READ') ? (
                        <Link
                          href={`/admin/groups/${g.id}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {g.name}
                        </Link>
                      ) : (
                        g.name
                      )}
                      {g.is_system && <Badge variant="accent">모든 권한</Badge>}
                      <StatusBadge active={g.is_active} onlyOff />
                    </span>
                    {g.description && (
                      <span className="text-muted-foreground text-xs">{g.description}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
