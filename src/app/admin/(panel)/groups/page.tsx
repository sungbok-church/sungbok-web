import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { readListDefaults } from '@/domains/admin/api/server/listDefaults.server';
import { loadMyGroups } from '@/domains/admin/api/server/myGroups.server';
import { type ListSpec, orIlike, parseListQuery, rangeOf } from '@/domains/admin/lib/listQuery';
import {
  AdminTable,
  type TableRowData,
} from '@/domains/admin/components/features/AdminList/AdminTable';
import { ListToolbar } from '@/domains/admin/components/features/AdminList/ListToolbar';
import { ScreenHeader } from '@/domains/admin/components/features/AdminSession';
import { Deferred } from '@/domains/admin/components/features/Deferred';
import { ListBodySkeleton } from '@/domains/admin/components/features/ScreenSkeleton';
import {
  StatusBadge,
  STATUS_FILTER_OPTIONS,
} from '@/domains/admin/components/features/StatusBadge';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { PlusIcon } from 'lucide-react';
import { IntentLink as Link } from '@/domains/admin/components/features/IntentLink';

// 머리(제목)는 미리 만든 틀로 누르는 즉시, «새 그룹» · 검색 막대 · 줄은 서버에서 오는 대로(Deferred — ADR 0027)
export const instant = true;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PATH = '/admin/groups';
const SPEC: ListSpec = {
  sorts: ['name', 'created_at'],
  defaultSort: 'name',
  defaultDir: 'asc',
  filters: { active: ['1', '0'] },
};

// 그룹 목록(설계 6.10 «화면 흐름 표준 › 목록») — 줄을 누르면 상세. «전체 관리» 는 늘 맨 위.
export default function AdminGroupsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <ScreenHeader
        menuKey="groups"
        fallback="그룹 · 권한"
        actions={<Deferred content={newGroupButton()} fallback={null} />}
      />
      <Deferred content={groupList(searchParams)} fallback={<ListBodySkeleton />} />
    </>
  );
}

/**
 * «새 그룹» — 그룹 만들기는 «전체 관리» 만(설계 6.4). 권한이 아니라 그룹 소속이라 관리자 틀이 들고 있지 않아 서버에서 확인해 온다
 * (권한 확인 · 그룹 소속은 한 요청에 한 번만 읽는다 — 아래 목록과 함께 쓴다)
 */
const newGroupButton = async () => {
  const ctx = await requirePermission('groups', 'READ');
  const { fullAdmin } = await loadMyGroups(ctx.user.id);
  return fullAdmin ? (
    <Button nativeButton={false} render={<Link href={`${PATH}/new`} eager />}>
      <PlusIcon data-icon="inline-start" />새 그룹
    </Button>
  ) : null;
};

/** 검색 막대 · 줄 — 권한을 확인하고(없으면 «없음») 조건대로 읽어 그린다 */
const groupList = async (searchParams: SearchParams) => {
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
  // 권한 확인과 함께 읽는다 — users/page.tsx 와 같다. 그룹 만들기는 «전체 관리» 만(설계 6.4) — 권한 확인 뒤 이어서 읽되 목록과는 함께
  const context = requirePermission('groups', 'READ');
  const [ctx, { fullAdmin }, { data, count }] = await Promise.all([
    context,
    context.then(c => loadMyGroups(c.user.id)),
    req,
  ]);

  const rows: TableRowData[] = (data ?? []).map(g => {
    const href = `${PATH}/${g.id}`;
    const members = g.user_groups?.[0]?.count ?? 0;
    const status = g.is_system ? (
      <Badge variant="accent">모든 권한</Badge>
    ) : (
      <StatusBadge active={g.is_active} />
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
      <ListToolbar
        userId={ctx.user.id}
        query={query}
        spec={SPEC}
        searchPlaceholder="그룹 이름 · 설명"
        filters={[
          {
            name: 'active',
            label: '상태',
            options: STATUS_FILTER_OPTIONS,
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
          create: fullAdmin ? { href: `${PATH}/new`, label: '첫 그룹 만들기' } : undefined,
        }}
      />
    </>
  );
};
