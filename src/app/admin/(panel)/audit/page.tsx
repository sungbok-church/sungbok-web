import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { screenLabel } from '@/domains/admin/lib/adminNav';
import { dayRange, formatAdminTime } from '@/domains/admin/lib/adminTime';
import { actionLabel, formatChanges, subjectOf, tableLabel } from '@/domains/admin/lib/auditFormat';
import { ACTION_NAMES, TABLE_LABELS } from '@/domains/admin/lib/auditLabels';
import { referenceNames, withActorNames } from '@/domains/admin/api/server/auditRows.server';
import { readListDefaults } from '@/domains/admin/api/server/listDefaults.server';
import { type ListSpec, parseListQuery, rangeOf } from '@/domains/admin/lib/listQuery';
import {
  AdminTable,
  type TableRowData,
} from '@/domains/admin/components/features/AdminList/AdminTable';
import { ListToolbar } from '@/domains/admin/components/features/AdminList/ListToolbar';
import { AuditDetail } from '@/domains/admin/components/features/AuditDetail';
import { ACTION_TONE, AuditEntry } from '@/domains/admin/components/features/AuditEntry';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

const SPEC: ListSpec = {
  sorts: ['id'],
  defaultSort: 'id',
  defaultDir: 'desc',
  filters: { table: Object.keys(TABLE_LABELS), action: Object.keys(ACTION_NAMES), actor: null },
  // 검색어 대신 조건 · 기간으로 — 이력 내용은 jsonb 라 글자 검색이 맞지 않는다
  searchInUrl: false,
  dateRange: true,
};

// 변경 이력 전체(설계 6.7 · 6.10 «화면 흐름 표준 › 목록») — 대상 · 동작 · 사람 · 기간으로 거른다. 최신이 위.
// 한 건의 «항목 | 이전 | 이후» 는 [자세히] 창에서 본다(상세 화면은 없다).
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseListQuery(await searchParams, SPEC, await readListDefaults());
  const supabase = await createSupabaseServerClient();

  let req = supabase
    .from('audit_log')
    .select('id, table_name, action, at, changes, actor_id', { count: 'exact' })
    .order('id', { ascending: query.dir === 'asc' })
    .range(...rangeOf(query.page, query.size));
  if (query.filters.table) req = req.eq('table_name', query.filters.table);
  if (query.filters.action)
    req = req.eq('action', query.filters.action as 'INSERT' | 'UPDATE' | 'DELETE' | 'EXPORT');
  if (query.filters.actor) req = req.eq('actor_id', query.filters.actor);
  const { gte, lt } = dayRange(query.from, query.to);
  if (gte) req = req.gte('at', gte);
  if (lt) req = req.lt('at', lt);

  // 권한 확인과 함께 읽는다 — users/page.tsx 와 같다
  const [ctx, { data, count }, { data: recentActors }] = await Promise.all([
    requirePermission('audit', 'READ'),
    req,
    // «사람» 조건의 선택지 — 최근 기록 1000줄에 나온 사람
    supabase
      .from('audit_log')
      .select('actor_id')
      .not('actor_id', 'is', null)
      .order('id', { ascending: false })
      .limit(1000),
  ]);
  const actorIds = [
    ...new Set((recentActors ?? []).flatMap(r => (r.actor_id ? [r.actor_id] : []))),
  ];
  const [{ data: people }, items, names] = await Promise.all([
    actorIds.length > 0
      ? supabase.rpc('actor_names', { p_ids: actorIds })
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    withActorNames(supabase, data ?? []),
    referenceNames(supabase, data ?? []),
  ]);

  const rows: TableRowData[] = items.map(item => {
    const fields = formatChanges(item, names).map(line => line.field);
    const subject = subjectOf(item);
    const action = (
      <Badge variant={ACTION_TONE[item.action] ?? 'neutral'}>{actionLabel(item.action)}</Badge>
    );
    return {
      id: String(item.id),
      cells: {
        at: <time dateTime={item.at}>{formatAdminTime(item.at)}</time>,
        actor: item.actorName,
        target: (
          <span>
            {tableLabel(item.table_name)}
            {subject && <span className="text-muted-foreground"> · {subject}</span>}
          </span>
        ),
        action,
        fields: (
          <span className="text-muted-foreground line-clamp-1">
            {fields.length > 3
              ? `${fields.slice(0, 3).join(', ')} 외 ${fields.length - 3}`
              : fields.join(', ') || '—'}
          </span>
        ),
        detail: <AuditDetail item={item} names={names} />,
      },
      card: (
        <Card size="sm">
          <CardContent>
            <AuditEntry item={item} names={names} />
          </CardContent>
        </Card>
      ),
    };
  });

  return (
    <>
      <PageHeader title={screenLabel(ctx.nav, 'audit', '변경 이력')} />
      <ListToolbar
        userId={ctx.user.id}
        query={query}
        spec={SPEC}
        filters={[
          {
            name: 'table',
            label: '대상',
            options: Object.entries(TABLE_LABELS).map(([value, label]) => ({ value, label })),
          },
          {
            name: 'action',
            label: '동작',
            options: Object.entries(ACTION_NAMES).map(([value, label]) => ({ value, label })),
          },
          {
            name: 'actor',
            label: '사람',
            options: [...new Map((people ?? []).map(p => [p.id, p.name])).entries()].map(
              ([value, label]) => ({ value, label })
            ),
          },
        ]}
      />
      <AdminTable
        query={query}
        spec={SPEC}
        total={count ?? 0}
        rows={rows}
        columns={[
          {
            key: 'at',
            header: '시각',
            sortField: 'id',
            className: 'w-40 whitespace-nowrap',
          },
          { key: 'actor', header: '사람', className: 'w-32' },
          { key: 'target', header: '대상' },
          { key: 'action', header: '동작', className: 'w-24' },
          { key: 'fields', header: '바뀐 항목' },
          { key: 'detail', header: '자세히', srOnly: true, className: 'w-20 text-right' },
        ]}
        empty={{ title: '기록이 없습니다' }}
      />
    </>
  );
}
