import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { readListDefaults } from '@/domains/admin/api/server/listDefaults.server';
import { NEWCOMER_LIST_SPEC, newcomerQuery } from '@/domains/admin/api/server/newcomer.server';
import {
  AdminTable,
  type TableRowData,
} from '@/domains/admin/components/features/AdminList/AdminTable';
import { ListToolbar } from '@/domains/admin/components/features/AdminList/ListToolbar';
import { IntentLink as Link } from '@/domains/admin/components/features/IntentLink';
import { HistorySheet } from '@/domains/admin/components/features/HistorySheet';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { NewcomerStatusBadge } from '@/domains/admin/components/features/StatusBadge';
import { can, screenLabel } from '@/domains/admin/lib/adminNav';
import { formatShortTime } from '@/domains/admin/lib/adminTime';
import { rangeOf, parseListQuery } from '@/domains/admin/lib/listQuery';
import { intentLabel, NEWCOMER_INTENTS, NEWCOMER_STATUSES } from '@/domains/admin/lib/newcomer';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { DownloadIcon } from 'lucide-react';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

const PATH = '/admin/newcomers';

// 새가족 접수함(설계 6.11) — 최신 접수부터. 조건: 상태 · 종류 · 접수 기간. 검색어 칸은 없다(이름 · 연락처가 주소에 남지 않게).
export default async function AdminNewcomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createSupabaseServerClient();
  const sp = await searchParams;
  const now = new Date().toISOString();
  const query = parseListQuery(sp, NEWCOMER_LIST_SPEC, await readListDefaults());
  const [ctx, { data, count }] = await Promise.all([
    requirePermission('newcomers', 'READ'),
    newcomerQuery(supabase, query, { count: true }).range(...rangeOf(query.page, query.size)),
  ]);
  // 엑셀은 지금 조건 그대로(쪽 나누기 없이)
  const exportParams = new URLSearchParams(
    Object.entries({ ...query.filters, from: query.from, to: query.to, dir: query.dir }).filter(
      ([, v]) => v
    )
  );

  const rows: TableRowData[] = (data ?? []).map(n => {
    const href = `${PATH}/${n.id}`;
    const status = <NewcomerStatusBadge status={n.status} />;
    const at = formatShortTime(n.created_at, now);
    return {
      id: n.id,
      href,
      cells: {
        name: (
          <Link href={href} className="font-medium underline-offset-4 hover:underline">
            {n.name}
          </Link>
        ),
        intent: intentLabel(n.intent),
        phone: <span className="tabular-nums">{n.phone}</span>,
        visit: <span className="tabular-nums">{n.visit_date ?? '—'}</span>,
        status,
        at: <span className="text-muted-foreground tabular-nums">{at}</span>,
      },
      card: (
        <Card size="sm">
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {n.name} · {intentLabel(n.intent)}
              </span>
              {status}
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">
              {n.phone} · {at}
            </span>
          </CardContent>
        </Card>
      ),
    };
  });

  return (
    <>
      <PageHeader
        title={screenLabel(ctx.nav, 'newcomers', '새가족')}
        actions={
          <>
            {can(ctx.permissions, 'newcomers', 'EXPORT') && (
              <Button
                variant="outline"
                nativeButton={false}
                render={<a href={`${PATH}/export?${exportParams}`} download />}
              >
                <DownloadIcon data-icon="inline-start" />
                엑셀
              </Button>
            )}
            {/* 엑셀 받기 기록(누가 언제 몇 건) — 접수 한 건의 이력은 상세에서 */}
            {can(ctx.permissions, 'newcomers', 'HISTORY') && (
              <HistorySheet table="newcomers" subject="엑셀 받기" />
            )}
          </>
        }
      />
      <ListToolbar
        userId={ctx.user.id}
        query={query}
        spec={NEWCOMER_LIST_SPEC}
        filters={[
          { name: 'status', label: '상태', options: [...NEWCOMER_STATUSES] },
          { name: 'intent', label: '종류', options: [...NEWCOMER_INTENTS] },
        ]}
      />
      <AdminTable
        query={query}
        spec={NEWCOMER_LIST_SPEC}
        total={count ?? 0}
        rows={rows}
        columns={[
          { key: 'name', header: '이름' },
          { key: 'intent', header: '종류', className: 'w-20' },
          { key: 'phone', header: '연락처' },
          { key: 'visit', header: '방문 예정일', className: 'w-32' },
          { key: 'status', header: '상태', className: 'w-24' },
          { key: 'at', header: '접수 시각', sortField: 'created_at', className: 'w-32' },
        ]}
        empty={{ title: '접수된 새가족이 없습니다' }}
      />
    </>
  );
}
