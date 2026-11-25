import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { actorNameMap } from '@/domains/admin/api/server/auditRows.server';
import { readListDefaults } from '@/domains/admin/api/server/listDefaults.server';
import {
  AdminTable,
  type TableRowData,
} from '@/domains/admin/components/features/AdminList/AdminTable';
import { ListToolbar } from '@/domains/admin/components/features/AdminList/ListToolbar';
import { IntentLink as Link } from '@/domains/admin/components/features/IntentLink';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import {
  CONTENT_STATUS_OPTIONS,
  ContentStatusBadge,
} from '@/domains/admin/components/features/StatusBadge';
import { can, screenLabel } from '@/domains/admin/lib/adminNav';
import { formatShortTime } from '@/domains/admin/lib/adminTime';
import { seoulToday } from '@/domains/admin/lib/content';
import { type ListSpec, parseListQuery, rangeOf } from '@/domains/admin/lib/listQuery';
import { issueLongDate } from '@/domains/news/api/bulletinList';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { PlusIcon } from 'lucide-react';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

const PATH = '/admin/bulletin';
/** 주보가 시작된 해(기존 사이트에서 옮긴 첫 호 2025-03-02) */
const FIRST_YEAR = 2025;

// 주보 목록(설계 6.10 «화면 흐름 표준 › 목록») — 최신 주일부터. 검색어 칸은 없다(글자가 없는 그림 글). 조건: 연도 · 상태 · 삭제된 항목.
export default async function AdminBulletinPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // 로그인 쿠키를 먼저 읽고 나서 지금 시각을 읽는다(Cache Components — 요청 값을 읽기 전에 시각을 읽으면 미리 그리기 오류)
  const supabase = await createSupabaseServerClient();
  const sp = await searchParams;
  // 요청마다 지금 시각 기준 — 한 번 읽어 아래에서 같이 쓴다
  const now = new Date().toISOString();
  const thisYear = Number(seoulToday(Date.parse(now)).slice(0, 4));
  const years = Array.from({ length: thisYear + 1 - FIRST_YEAR + 1 }, (_, i) =>
    String(thisYear + 1 - i)
  );
  const spec: ListSpec = {
    sorts: ['date', 'updated_at'],
    defaultSort: 'date',
    defaultDir: 'desc',
    filters: { year: years, status: CONTENT_STATUS_OPTIONS.map(o => o.value) },
    searchInUrl: false,
  };
  const query = parseListQuery(sp, spec, await readListDefaults());
  let req = supabase
    .from('bulletins')
    .select('id, date, status, deleted_at, updated_at, updated_by, file_lists(files(count))', {
      count: 'exact',
    })
    .order(query.sort, { ascending: query.dir === 'asc' })
    .range(...rangeOf(query.page, query.size));
  req = query.trash ? req.not('deleted_at', 'is', null) : req.is('deleted_at', null);
  const { year, status } = query.filters;
  if (year) req = req.gte('date', `${year}-01-01`).lt('date', `${Number(year) + 1}-01-01`);
  if (status === 'DRAFT' || status === 'PUBLISHED') req = req.eq('status', status);
  // 권한 확인과 함께 읽는다 — 권한이 없으면 404 로 끊고 읽은 값은 버린다(막는 것은 RLS)
  const [ctx, { data, count }] = await Promise.all([requirePermission('bulletin', 'READ'), req]);
  const names = await actorNameMap(
    supabase,
    (data ?? []).map(b => b.updated_by)
  );
  const canCreate = can(ctx.permissions, 'bulletin', 'CREATE');

  const rows: TableRowData[] = (data ?? []).map(b => {
    const href = `${PATH}/${b.id}`;
    const pages = (b.file_lists as { files: { count: number }[] } | null)?.files?.[0]?.count ?? 0;
    const status = <ContentStatusBadge status={b.status} deletedAt={b.deleted_at} />;
    const updated = `${formatShortTime(b.updated_at, now)}${b.updated_by && names[b.updated_by] ? ` · ${names[b.updated_by]}` : ''}`;
    return {
      id: b.id,
      href,
      cells: {
        date: (
          <Link href={href} className="font-medium tabular-nums underline-offset-4 hover:underline">
            {issueLongDate(b.date)}
          </Link>
        ),
        pages: <span className="tabular-nums">{pages}쪽</span>,
        status,
        updated: <span className="text-muted-foreground tabular-nums">{updated}</span>,
      },
      card: (
        <Card size="sm">
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium tabular-nums">{issueLongDate(b.date)}</span>
              {status}
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">
              {pages}쪽 · {updated}
            </span>
          </CardContent>
        </Card>
      ),
    };
  });

  return (
    <>
      <PageHeader
        title={screenLabel(ctx.nav, 'bulletin', '주보')}
        actions={
          canCreate && (
            <Button nativeButton={false} render={<Link href={`${PATH}/new`} />}>
              <PlusIcon data-icon="inline-start" />새 주보
            </Button>
          )
        }
      />
      <ListToolbar
        userId={ctx.user.id}
        query={query}
        spec={spec}
        trashable={can(ctx.permissions, 'bulletin', 'DELETE')}
        filters={[
          { name: 'year', label: '연도', options: years.map(y => ({ value: y, label: `${y}년` })) },
          { name: 'status', label: '상태', options: CONTENT_STATUS_OPTIONS },
        ]}
      />
      <AdminTable
        query={query}
        spec={spec}
        total={count ?? 0}
        rows={rows}
        columns={[
          { key: 'date', header: '주일', sortField: 'date', className: 'w-48' },
          { key: 'pages', header: '쪽', className: 'w-20' },
          { key: 'status', header: '상태', className: 'w-28' },
          { key: 'updated', header: '수정', sortField: 'updated_at' },
        ]}
        empty={{
          title: query.trash ? '휴지통이 비었습니다' : '주보가 없습니다',
          create:
            canCreate && !query.trash
              ? { href: `${PATH}/new`, label: '첫 주보 올리기' }
              : undefined,
        }}
      />
    </>
  );
}
