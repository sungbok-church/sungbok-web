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
import { type ListSpec, orIlike, parseListQuery, rangeOf } from '@/domains/admin/lib/listQuery';
import { RESOURCE_SECTION_KEYS, SECTION_CONFIG } from '@/domains/admin/lib/resourceSection';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { PlusIcon } from 'lucide-react';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

const PATH = '/admin/resources';
const SECTION_OPTIONS = RESOURCE_SECTION_KEYS.map(k => ({
  value: k,
  label: SECTION_CONFIG[k].label,
}));

// 설교 시트지 목록(설계 6.10) — 최신 날짜부터(날짜 없는 자료는 뒤). 조건: 분류 · 상태 · 삭제된 항목, 검색어는 제목 · 본문.
export default async function AdminResourcesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // 로그인 쿠키를 먼저 읽고 나서 지금 시각을 읽는다(Cache Components)
  const supabase = await createSupabaseServerClient();
  const sp = await searchParams;
  const now = new Date().toISOString();
  const spec: ListSpec = {
    sorts: ['date', 'updated_at'],
    defaultSort: 'date',
    defaultDir: 'desc',
    filters: {
      section: RESOURCE_SECTION_KEYS,
      status: CONTENT_STATUS_OPTIONS.map(o => o.value),
    },
  };
  const query = parseListQuery(sp, spec, await readListDefaults());
  let req = supabase
    .from('resources')
    .select(
      'id, title, section, episode, date, year, status, deleted_at, updated_at, updated_by, categories(label)',
      { count: 'exact' }
    )
    .order(query.sort, { ascending: query.dir === 'asc', nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(...rangeOf(query.page, query.size));
  req = query.trash ? req.not('deleted_at', 'is', null) : req.is('deleted_at', null);
  const { section, status } = query.filters;
  if (query.q) req = req.or(orIlike(['title', 'passage'], query.q));
  if (section === 'SUNDAY' || section === 'SERIES' || section === 'SEASONAL')
    req = req.eq('section', section);
  if (status === 'DRAFT' || status === 'PUBLISHED') req = req.eq('status', status);
  const [ctx, { data, count }] = await Promise.all([requirePermission('resources', 'READ'), req]);
  const names = await actorNameMap(
    supabase,
    (data ?? []).map(r => r.updated_by)
  );
  const canCreate = can(ctx.permissions, 'resources', 'CREATE');

  const rows: TableRowData[] = (data ?? []).map(r => {
    const href = `${PATH}/${r.id}`;
    const series = (r.categories as { label: string } | null)?.label ?? '';
    const group = `${series}${r.episode ? ` ${r.episode}회` : ''}`;
    const when = r.date ?? (r.year ? `${r.year}년` : '—');
    const status = <ContentStatusBadge status={r.status} deletedAt={r.deleted_at} compact />;
    const updated = `${formatShortTime(r.updated_at, now)}${r.updated_by && names[r.updated_by] ? ` · ${names[r.updated_by]}` : ''}`;
    return {
      id: r.id,
      href,
      cells: {
        date: <span className="tabular-nums">{when}</span>,
        title: (
          <Link href={href} className="font-medium underline-offset-4 hover:underline">
            {r.title}
          </Link>
        ),
        group,
        section: SECTION_CONFIG[r.section].label,
        status,
        updated: <span className="text-muted-foreground tabular-nums">{updated}</span>,
      },
      card: (
        <Card size="sm">
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 font-medium break-words">{r.title}</span>
              {status}
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">
              {[when, group].filter(Boolean).join(' · ')}
            </span>
          </CardContent>
        </Card>
      ),
    };
  });

  return (
    <>
      <PageHeader
        title={screenLabel(ctx.nav, 'resources', '설교 시트지')}
        actions={
          canCreate && (
            <Button nativeButton={false} render={<Link href={`${PATH}/new`} />}>
              <PlusIcon data-icon="inline-start" />새 시트지
            </Button>
          )
        }
      />
      <ListToolbar
        userId={ctx.user.id}
        query={query}
        spec={spec}
        trashable={can(ctx.permissions, 'resources', 'DELETE')}
        searchPlaceholder="제목 · 본문"
        filters={[
          { name: 'section', label: '분류', options: SECTION_OPTIONS },
          { name: 'status', label: '상태', options: CONTENT_STATUS_OPTIONS },
        ]}
      />
      <AdminTable
        query={query}
        spec={spec}
        total={count ?? 0}
        rows={rows}
        columns={[
          { key: 'date', header: '날짜', sortField: 'date', className: 'w-32' },
          { key: 'title', header: '제목' },
          { key: 'group', header: '묶음', className: 'w-48' },
          { key: 'section', header: '분류', className: 'w-36' },
          { key: 'status', header: '상태', className: 'w-28' },
          { key: 'updated', header: '수정', sortField: 'updated_at', className: 'w-44' },
        ]}
        empty={{
          title: query.trash ? '휴지통이 비었습니다' : '시트지가 없습니다',
          create:
            canCreate && !query.trash
              ? { href: `${PATH}/new`, label: '첫 시트지 올리기' }
              : undefined,
        }}
      />
    </>
  );
}
