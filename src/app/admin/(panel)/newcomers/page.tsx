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
import { IfCan, ScreenHeader } from '@/domains/admin/components/features/AdminSession';
import { Deferred } from '@/domains/admin/components/features/Deferred';
import { ListBodySkeleton } from '@/domains/admin/components/features/ScreenSkeleton';
import { NewcomerStatusBadge } from '@/domains/admin/components/features/StatusBadge';
import { formatShortTime } from '@/domains/admin/lib/adminTime';
import { rangeOf, parseListQuery } from '@/domains/admin/lib/listQuery';
import { intentLabel, NEWCOMER_INTENTS, NEWCOMER_STATUSES } from '@/domains/admin/lib/newcomer';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { DownloadIcon } from 'lucide-react';

// 머리(제목 · 변경 이력)는 미리 만든 틀로 누르는 즉시, «엑셀»(지금 조건) · 검색 막대 · 줄은 서버에서 오는 대로(Deferred — ADR 0027)
export const instant = true;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PATH = '/admin/newcomers';

// 새가족 접수함(설계 6.11) — 최신 접수부터. 조건: 상태 · 종류 · 접수 기간. 검색어 칸은 없다(이름 · 연락처가 주소에 남지 않게).
export default function AdminNewcomersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <ScreenHeader
        menuKey="newcomers"
        fallback="새가족"
        actions={
          <>
            <IfCan menuKey="newcomers" action="EXPORT">
              <Deferred
                content={exportButton(searchParams)}
                fallback={
                  <Button variant="outline" disabled>
                    <DownloadIcon data-icon="inline-start" />
                    엑셀
                  </Button>
                }
              />
            </IfCan>
            {/* 엑셀 받기 기록(누가 언제 몇 건) — 접수 한 건의 이력은 상세에서 */}
            <IfCan menuKey="newcomers" action="HISTORY">
              <HistorySheet table="newcomers" subject="엑셀 받기" />
            </IfCan>
          </>
        }
      />
      <Deferred content={newcomerList(searchParams)} fallback={<ListBodySkeleton />} />
    </>
  );
}

/** «엑셀» — 지금 조건 그대로(쪽 나누기 없이) 받는 주소. 조건은 주소에서 읽어 오므로 그 전에는 누를 수 없는 같은 모양 */
const exportButton = async (searchParams: SearchParams) => {
  const query = parseListQuery(await searchParams, NEWCOMER_LIST_SPEC, await readListDefaults());
  const exportParams = new URLSearchParams(
    Object.entries({ ...query.filters, from: query.from, to: query.to, dir: query.dir }).filter(
      ([, v]) => v
    )
  );
  return (
    <Button
      variant="outline"
      nativeButton={false}
      render={<a href={`${PATH}/export?${exportParams}`} download />}
    >
      <DownloadIcon data-icon="inline-start" />
      엑셀
    </Button>
  );
};

/** 검색 막대 · 줄 — 권한을 확인하고(없으면 «없음») 조건대로 읽어 그린다 */
const newcomerList = async (searchParams: SearchParams) => {
  const supabase = await createSupabaseServerClient();
  const sp = await searchParams;
  const now = new Date().toISOString();
  const query = parseListQuery(sp, NEWCOMER_LIST_SPEC, await readListDefaults());
  const [ctx, { data, count }] = await Promise.all([
    requirePermission('newcomers', 'READ'),
    newcomerQuery(supabase, query, { count: true }).range(...rangeOf(query.page, query.size)),
  ]);

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
};
