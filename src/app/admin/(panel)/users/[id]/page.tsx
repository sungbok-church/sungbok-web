import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { can } from '@/domains/admin/lib/adminNav';
import { actorNameMap } from '@/domains/admin/api/server/auditRows.server';
import { DEPARTMENTS } from '@/domains/admin/lib/input/userInput';
import { canEditUser } from '@/domains/admin/lib/userAccess';
import { type DetailItem, DetailList } from '@/domains/admin/components/features/Detail/DetailList';
import { ListNav } from '@/domains/admin/components/features/Detail/ListNav';
import { RecordMeta } from '@/domains/admin/components/features/Detail/RecordMeta';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { StatusBadge } from '@/domains/admin/components/features/StatusBadge';
import { UserDetailActions } from '@/domains/admin/components/widgets/UserDetailActions';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { PencilIcon } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

const PATH = '/admin/users';

// 사용자 상세(보기) — 설계 6.10 «화면 흐름 표준 › 상세». 머리(이름 · 상태 · 이메일) · 짧은 값 목록(그룹 · 담당 부서 …) ·
// 맨 아래 수정 시각. 머리에 있는 값은 본문에서 되풀이하지 않는다. 고치려면 [수정].
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
        'id, name, email, department, is_active, must_change_password, created_at, created_by, updated_at, updated_by, user_groups(groups(id, name, is_system, is_active))'
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

  const canSeeGroups = can(ctx.permissions, 'groups', 'READ');
  const facts: DetailItem[] = [
    {
      label: '그룹',
      value:
        groups.length === 0 ? (
          <span className="text-muted-foreground">없음 — 아무 메뉴도 쓸 수 없습니다</span>
        ) : (
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {groups.map(g => (
              <li key={g.id} className="flex items-center gap-1">
                <Badge
                  variant="outline"
                  render={canSeeGroups ? <Link href={`/admin/groups/${g.id}`} /> : undefined}
                >
                  {g.name}
                </Badge>
                {g.is_system && <Badge variant="accent">모든 권한</Badge>}
                <StatusBadge active={g.is_active} onlyOff />
              </li>
            ))}
          </ul>
        ),
    },
    {
      label: '담당 부서',
      value: profile.department
        ? (DEPARTMENTS.find(d => d.value === profile.department)?.label ?? profile.department)
        : '모든 부서',
    },
    // 비밀번호는 바꿔야 할 때만(«정상» 은 적지 않는다)
    ...(profile.must_change_password
      ? [{ label: '비밀번호', value: '다음 로그인 때 바꿔야 함' }]
      : []),
  ];

  return (
    <>
      <PageHeader
        title={profile.name}
        badge={<StatusBadge active={profile.is_active} />}
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

      <Card className="max-w-3xl">
        <CardContent>
          <DetailList items={facts} />
        </CardContent>
      </Card>

      <RecordMeta
        createdAt={profile.created_at}
        createdBy={profile.created_by ? names[profile.created_by] : '시스템'}
        updatedAt={profile.updated_at}
        updatedBy={profile.updated_by ? names[profile.updated_by] : '시스템'}
      />
    </>
  );
}
