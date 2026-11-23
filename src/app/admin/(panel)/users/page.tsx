import { requirePermission } from '@/domains/admin/api/adminContext.server';
import { can, screenLabel } from '@/domains/admin/api/adminNav';
import { SCREEN_DESCRIPTIONS } from '@/domains/admin/api/adminScreens';
import { readListDefaults } from '@/domains/admin/api/listDefaults.server';
import { type ListSpec, orIlike, parseListQuery, rangeOf } from '@/domains/admin/api/listQuery';
import { DEPARTMENTS } from '@/domains/admin/api/userInput';
import {
  AdminTable,
  type TableRowData,
} from '@/domains/admin/components/features/AdminList/AdminTable';
import { ListToolbar } from '@/domains/admin/components/features/AdminList/ListToolbar';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { UserBulkActions } from '@/domains/admin/components/widgets/UserBulkActions';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

const PATH = '/admin/users';
const SPEC: ListSpec = {
  sorts: ['name', 'created_at'],
  defaultSort: 'name',
  defaultDir: 'asc',
  filters: {
    group: null,
    active: ['1', '0'],
    department: [...DEPARTMENTS.map(d => d.value), 'all'],
  },
};

const departmentLabel = (slug: string | null) =>
  slug ? (DEPARTMENTS.find(d => d.value === slug)?.label ?? slug) : '모든 부서';

// 사용자 목록(설계 6.10 «화면 흐름 표준 › 목록») — 줄을 누르면 상세.
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseListQuery(await searchParams, SPEC, await readListDefaults());
  const supabase = await createSupabaseServerClient();

  const groupFilter = query.filters.group;
  let req = supabase
    .from('profiles')
    .select(
      `id, name, email, department, is_active, created_at, user_groups${groupFilter ? '!inner' : ''}(group_id, groups(name))`,
      { count: 'exact' }
    )
    .order(query.sort, { ascending: query.dir === 'asc' })
    .range(...rangeOf(query.page, query.size));
  if (query.q) req = req.or(orIlike(['name', 'email'], query.q));
  if (groupFilter) req = req.eq('user_groups.group_id', groupFilter);
  if (query.filters.active) req = req.eq('is_active', query.filters.active === '1');
  if (query.filters.department === 'all') req = req.is('department', null);
  else if (query.filters.department)
    req = req.eq('department', query.filters.department as (typeof DEPARTMENTS)[number]['value']);

  // 권한 확인과 목록 읽기를 함께 시작한다(DB 왕복 한 번 줄이기) — 권한이 없으면 404 로 끊고 읽은 값은 버린다(막는 것은 DB 의 RLS)
  const [ctx, { data, count }, { data: groups }] = await Promise.all([
    requirePermission('users', 'READ'),
    req,
    supabase.from('groups').select('id, name').order('name'),
  ]);

  const rows: TableRowData[] = (data ?? []).map(p => {
    const groupNames = (p.user_groups ?? []).map(ug => ug.groups?.name ?? '').filter(Boolean);
    const status = p.is_active ? (
      <Badge variant="success">사용 중</Badge>
    ) : (
      <Badge variant="neutral">꺼짐</Badge>
    );
    const groupBadges =
      groupNames.length === 0 ? (
        <span className="text-muted-foreground">없음</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {groupNames.map(g => (
            <Badge key={g} variant="outline">
              {g}
            </Badge>
          ))}
        </div>
      );
    const href = `${PATH}/${p.id}`;
    return {
      id: p.id,
      href,
      cells: {
        name: (
          <div className="flex min-w-0 flex-col">
            <Link href={href} className="truncate font-medium underline-offset-4 hover:underline">
              {p.name}
            </Link>
            <span className="text-muted-foreground truncate text-xs">{p.email}</span>
          </div>
        ),
        groups: groupBadges,
        department: departmentLabel(p.department),
        status,
      },
      card: (
        <Card size="sm">
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{p.name}</span>
              {status}
            </div>
            <span className="text-muted-foreground text-xs">{p.email}</span>
            {groupBadges}
          </CardContent>
        </Card>
      ),
    };
  });

  return (
    <>
      <PageHeader
        title={screenLabel(ctx.nav, 'users', '사용자')}
        description={SCREEN_DESCRIPTIONS.users}
        actions={
          can(ctx.permissions, 'users', 'CREATE') && (
            <Button nativeButton={false} render={<Link href={`${PATH}/new`} />}>
              <PlusIcon data-icon="inline-start" />새 사용자
            </Button>
          )
        }
      />
      <ListToolbar
        userId={ctx.user.id}
        query={query}
        spec={SPEC}
        searchPlaceholder="이름 · 이메일"
        filters={[
          {
            name: 'group',
            label: '그룹',
            options: (groups ?? []).map(g => ({ value: g.id, label: g.name })),
          },
          {
            name: 'department',
            label: '부서 범위',
            options: [{ value: 'all', label: '모든 부서' }, ...DEPARTMENTS],
          },
          {
            name: 'active',
            label: '상태',
            options: [
              { value: '1', label: '사용 중' },
              { value: '0', label: '꺼짐' },
            ],
          },
        ]}
      />
      <AdminTable
        query={query}
        spec={SPEC}
        total={count ?? 0}
        rows={rows}
        bulk={can(ctx.permissions, 'users', 'UPDATE') ? <UserBulkActions /> : undefined}
        columns={[
          { key: 'name', header: '사용자', sortField: 'name' },
          { key: 'groups', header: '그룹' },
          { key: 'department', header: '다음세대 부서 범위' },
          { key: 'status', header: '상태' },
        ]}
        empty={{
          title: '사용자가 없습니다',
          create: can(ctx.permissions, 'users', 'CREATE')
            ? { href: `${PATH}/new`, label: '첫 사용자 만들기' }
            : undefined,
        }}
      />
    </>
  );
}
