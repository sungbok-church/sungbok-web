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
import { categoryOptions } from '@/shared/api/codeBook';
import { getCategoryBook } from '@/shared/api/codeBook.server';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { PlusIcon } from 'lucide-react';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

const PATH = '/admin/album';

// 교회앨범 목록(설계 6.10) — 최신 등록부터(공개 화면과 같은 순서). 조건: 분류 · 상태 · 삭제된 항목, 검색어는 제목.
export default async function AdminAlbumPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // 로그인 쿠키를 먼저 읽고 나서 지금 시각을 읽는다(Cache Components)
  const supabase = await createSupabaseServerClient();
  const [sp, book] = await Promise.all([searchParams, getCategoryBook()]);
  const now = new Date().toISOString();
  const categories = categoryOptions(book, 'ALBUM_CATEGORY');
  const spec: ListSpec = {
    sorts: ['created_at', 'updated_at'],
    defaultSort: 'created_at',
    defaultDir: 'desc',
    filters: {
      category: categories.map(c => c.value),
      status: CONTENT_STATUS_OPTIONS.map(o => o.value),
    },
  };
  const query = parseListQuery(sp, spec, await readListDefaults());
  let req = supabase
    .from('albums')
    .select(
      'id, title, status, deleted_at, created_at, updated_at, updated_by, categories(label), file_lists(files(count))',
      { count: 'exact' }
    )
    .order(query.sort, { ascending: query.dir === 'asc' })
    .order('id', { ascending: false })
    .range(...rangeOf(query.page, query.size));
  req = query.trash ? req.not('deleted_at', 'is', null) : req.is('deleted_at', null);
  const { category, status } = query.filters;
  if (query.q) req = req.or(orIlike(['title'], query.q));
  if (category) req = req.eq('category_id', category);
  if (status === 'DRAFT' || status === 'PUBLISHED') req = req.eq('status', status);
  const [ctx, { data, count }] = await Promise.all([requirePermission('album', 'READ'), req]);
  const names = await actorNameMap(
    supabase,
    (data ?? []).map(a => a.updated_by)
  );
  const canCreate = can(ctx.permissions, 'album', 'CREATE');

  const rows: TableRowData[] = (data ?? []).map(a => {
    const href = `${PATH}/${a.id}`;
    const label = (a.categories as { label: string } | null)?.label ?? '';
    const images = (a.file_lists as { files: { count: number }[] } | null)?.files?.[0]?.count ?? 0;
    const status = <ContentStatusBadge status={a.status} deletedAt={a.deleted_at} compact />;
    const updated = `${formatShortTime(a.updated_at, now)}${a.updated_by && names[a.updated_by] ? ` · ${names[a.updated_by]}` : ''}`;
    return {
      id: a.id,
      href,
      cells: {
        title: (
          <Link href={href} className="font-medium underline-offset-4 hover:underline">
            {a.title}
          </Link>
        ),
        category: label,
        images: <span className="tabular-nums">{images}장</span>,
        status,
        updated: <span className="text-muted-foreground tabular-nums">{updated}</span>,
      },
      card: (
        <Card size="sm">
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 font-medium break-words">{a.title}</span>
              {status}
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">
              {label} · {images}장
            </span>
          </CardContent>
        </Card>
      ),
    };
  });

  return (
    <>
      <PageHeader
        title={screenLabel(ctx.nav, 'album', '교회앨범')}
        actions={
          canCreate && (
            <Button nativeButton={false} render={<Link href={`${PATH}/new`} />}>
              <PlusIcon data-icon="inline-start" />새 앨범
            </Button>
          )
        }
      />
      <ListToolbar
        userId={ctx.user.id}
        query={query}
        spec={spec}
        trashable={can(ctx.permissions, 'album', 'DELETE')}
        searchPlaceholder="제목"
        filters={[
          { name: 'category', label: '분류', options: categories },
          { name: 'status', label: '상태', options: CONTENT_STATUS_OPTIONS },
        ]}
      />
      <AdminTable
        query={query}
        spec={spec}
        total={count ?? 0}
        rows={rows}
        columns={[
          { key: 'title', header: '제목' },
          { key: 'category', header: '분류', className: 'w-32' },
          { key: 'images', header: '그림', className: 'w-20' },
          { key: 'status', header: '상태', className: 'w-28' },
          { key: 'updated', header: '수정', sortField: 'updated_at', className: 'w-44' },
        ]}
        empty={{
          title: query.trash ? '휴지통이 비었습니다' : '앨범이 없습니다',
          create:
            canCreate && !query.trash
              ? { href: `${PATH}/new`, label: '첫 앨범 올리기' }
              : undefined,
        }}
      />
    </>
  );
}
