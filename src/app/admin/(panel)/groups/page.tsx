import { requirePermission } from '@/domains/admin/api/adminContext.server';
import { can, screenLabel } from '@/domains/admin/api/adminNav';
import { SCREEN_DESCRIPTIONS } from '@/domains/admin/api/adminScreens';
import { readListDefaults } from '@/domains/admin/api/listDefaults.server';
import { type ListSpec, orIlike, parseListQuery, rangeOf } from '@/domains/admin/api/listQuery';
import {
  AdminTable,
  type TableRowData,
} from '@/domains/admin/components/features/AdminList/AdminTable';
import { ListToolbar } from '@/domains/admin/components/features/AdminList/ListToolbar';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';

const PATH = '/admin/groups';
const SPEC: ListSpec = {
  sorts: ['name', 'created_at'],
  defaultSort: 'name',
  defaultDir: 'asc',
  filters: { active: ['1', '0'] },
};

// 그룹 목록(설계 6.10 «화면 흐름 표준 › 목록») — 줄을 누르면 상세. «전체 관리» 는 늘 맨 위.
export default async function AdminGroupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requirePermission('groups', 'READ');
  const query = parseListQuery(await searchParams, SPEC, await readListDefaults());
  const supabase = await createSupabaseServerClient();
  let req = supabase
    .from('groups')
    .select('id, name, description, is_system, is_active, user_groups(count)', { count: 'exact' })
    .order('is_system', { ascending: false })
    .order(query.sort, { ascending: query.dir === 'asc' })
    .range(...rangeOf(query.page, query.size));
  if (query.q) req = req.or(orIlike(['name', 'description'], query.q));
  if (query.filters.active) req = req.eq('is_active', query.filters.active === '1');
  const { data, count } = await req;

  const rows: TableRowData[] = (data ?? []).map(g => {
    const href = `${PATH}/${g.id}`;
    const members = g.user_groups?.[0]?.count ?? 0;
    const status = g.is_system ? (
      <Badge variant="accent">모든 권한</Badge>
    ) : g.is_active ? (
      <Badge variant="success">사용 중</Badge>
    ) : (
      <Badge variant="neutral">꺼짐</Badge>
    );
    return {
      id: g.id,
      href,
      cells: {
        name: (
          <Link href={href} className="font-medium underline-offset-4 hover:underline">
            {g.name}
          </Link>
        ),
        description: g.description ? (
          <span className="text-muted-foreground line-clamp-1">{g.description}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
        members: <span className="tabular-nums">{members}명</span>,
        status,
      },
      card: (
        <Card size="sm">
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{g.name}</span>
              {status}
            </div>
            {g.description && (
              <span className="text-muted-foreground text-xs">{g.description}</span>
            )}
            <span className="text-muted-foreground text-xs tabular-nums">구성원 {members}명</span>
          </CardContent>
        </Card>
      ),
    };
  });

  return (
    <>
      <PageHeader
        title={screenLabel(ctx.nav, 'groups', '그룹 · 권한')}
        description={SCREEN_DESCRIPTIONS.groups}
        actions={
          can(ctx.permissions, 'groups', 'CREATE') && (
            <Button nativeButton={false} render={<Link href={`${PATH}/new`} />}>
              <PlusIcon data-icon="inline-start" />새 그룹
            </Button>
          )
        }
      />
      <ListToolbar
        userId={ctx.user.id}
        query={query}
        spec={SPEC}
        searchPlaceholder="그룹 이름 · 설명"
        filters={[
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
        columns={[
          { key: 'name', header: '그룹', sortField: 'name', className: 'w-56' },
          { key: 'description', header: '설명' },
          { key: 'members', header: '구성원', className: 'w-24' },
          { key: 'status', header: '상태', className: 'w-28' },
        ]}
        empty={{
          title: '그룹이 없습니다',
          create: can(ctx.permissions, 'groups', 'CREATE')
            ? { href: `${PATH}/new`, label: '첫 그룹 만들기' }
            : undefined,
        }}
      />
    </>
  );
}
