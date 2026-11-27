import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { actorNameMap } from '@/domains/admin/api/server/auditRows.server';
import { readListDefaults } from '@/domains/admin/api/server/listDefaults.server';
import { loadNewsVideo } from '@/domains/admin/api/server/newsVideo.server';
import {
  AdminTable,
  type TableRowData,
} from '@/domains/admin/components/features/AdminList/AdminTable';
import { ListToolbar } from '@/domains/admin/components/features/AdminList/ListToolbar';
import { DetailList } from '@/domains/admin/components/features/Detail/DetailList';
import { ListNav } from '@/domains/admin/components/features/Detail/ListNav';
import { RecordMeta } from '@/domains/admin/components/features/Detail/RecordMeta';
import { IntentLink as Link } from '@/domains/admin/components/features/IntentLink';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { PermissionGate } from '@/domains/admin/components/features/PermissionGate';
import {
  CONTENT_STATUS_OPTIONS,
  ContentStatusBadge,
} from '@/domains/admin/components/features/StatusBadge';
import { ContentDetailActions } from '@/domains/admin/components/widgets/ContentDetailActions';
import { NewsVideoForm } from '@/domains/admin/components/widgets/NewsVideoForm';
import {
  type NewsVideoNewData,
  NewsVideoNewForm,
} from '@/domains/admin/components/widgets/NewsVideoForm/NewsVideoNewForm';
import { can, screenLabel } from '@/domains/admin/lib/adminNav';
import { formatShortTime } from '@/domains/admin/lib/adminTime';
import { isCalendarDate, seoulToday } from '@/domains/admin/lib/content';
import { type ListSpec, orIlike, parseListQuery, rangeOf } from '@/domains/admin/lib/listQuery';
import { defaultNewsDate, NEWS_FEEDS, type NewsFeedKey } from '@/domains/admin/lib/newsFeed';
import { getCategoryBook } from '@/shared/api/codeBook.server';
import { categoryOptions } from '@/shared/api/codeBook';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { ExternalLinkIcon, PencilIcon, PlusIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';

// 주일광고 · 성복의 뜰 화면(패키지 B2) — 두 메뉴가 같은 부품을 쓰고, 페이지(app/admin/(panel)/<메뉴>/…)는 메뉴만 넘긴다.
// 페이지마다 권한 확인과 데이터 읽기를 함께 시작한다(권한이 없으면 404 — 막는 것은 RLS).

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FIRST_YEAR = 2024;

/** 목록 — 최신 날짜부터. 조건: 분류 · 상태 · 연도 · 삭제된 항목, 검색어는 제목 */
export const NewsVideoListScreen = async ({
  feed,
  searchParams,
}: {
  feed: NewsFeedKey;
  searchParams: SearchParams;
}) => {
  const cfg = NEWS_FEEDS[feed];
  // 로그인 쿠키를 먼저 읽고 나서 지금 시각을 읽는다(Cache Components)
  const supabase = await createSupabaseServerClient();
  const [sp, book] = await Promise.all([searchParams, getCategoryBook()]);
  const now = new Date().toISOString();
  const thisYear = Number(seoulToday(Date.parse(now)).slice(0, 4));
  const years = Array.from({ length: thisYear + 1 - FIRST_YEAR + 1 }, (_, i) =>
    String(thisYear + 1 - i)
  );
  const categories = categoryOptions(book, cfg.categoryGroup);
  const spec: ListSpec = {
    sorts: ['date', 'updated_at'],
    defaultSort: 'date',
    defaultDir: 'desc',
    filters: {
      category: categories.map(c => c.value),
      status: CONTENT_STATUS_OPTIONS.map(o => o.value),
      year: years,
    },
  };
  const query = parseListQuery(sp, spec, await readListDefaults());
  let req = supabase
    .from('news_videos')
    .select(
      'id, title, date, status, video_id, deleted_at, updated_at, updated_by, categories(label)',
      {
        count: 'exact',
      }
    )
    .eq('feed', cfg.feed)
    .order(query.sort, { ascending: query.dir === 'asc' })
    .order('created_at', { ascending: false })
    .range(...rangeOf(query.page, query.size));
  req = query.trash ? req.not('deleted_at', 'is', null) : req.is('deleted_at', null);
  const { category, status, year } = query.filters;
  if (query.q) req = req.or(orIlike(['title'], query.q));
  if (category) req = req.eq('category_id', category);
  if (status === 'DRAFT' || status === 'PUBLISHED') req = req.eq('status', status);
  if (year) req = req.gte('date', `${year}-01-01`).lt('date', `${Number(year) + 1}-01-01`);
  const [ctx, { data, count }] = await Promise.all([requirePermission(cfg.menuKey, 'READ'), req]);
  const names = await actorNameMap(
    supabase,
    (data ?? []).map(v => v.updated_by)
  );
  const canCreate = can(ctx.permissions, cfg.menuKey, 'CREATE');

  const rows: TableRowData[] = (data ?? []).map(v => {
    const href = `${cfg.adminPath}/${v.id}`;
    const label = (v.categories as { label: string } | null)?.label ?? '';
    const status = <ContentStatusBadge status={v.status} deletedAt={v.deleted_at} compact />;
    const updated = `${formatShortTime(v.updated_at, now)}${v.updated_by && names[v.updated_by] ? ` · ${names[v.updated_by]}` : ''}`;
    return {
      id: v.id,
      href,
      cells: {
        date: <span className="tabular-nums">{v.date}</span>,
        title: (
          <Link href={href} className="font-medium underline-offset-4 hover:underline">
            {v.title}
          </Link>
        ),
        category: label,
        status,
        updated: <span className="text-muted-foreground tabular-nums">{updated}</span>,
      },
      card: (
        <Card size="sm">
          <CardContent className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 font-medium break-words">{v.title}</span>
              {status}
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">
              {v.date} · {label}
            </span>
          </CardContent>
        </Card>
      ),
    };
  });

  return (
    <>
      <PageHeader
        title={screenLabel(ctx.nav, cfg.menuKey, cfg.label)}
        actions={
          canCreate && (
            <Button nativeButton={false} render={<Link href={`${cfg.adminPath}/new`} />}>
              <PlusIcon data-icon="inline-start" />새 {cfg.label}
            </Button>
          )
        }
      />
      <ListToolbar
        userId={ctx.user.id}
        query={query}
        spec={spec}
        trashable={can(ctx.permissions, cfg.menuKey, 'DELETE')}
        searchPlaceholder="제목"
        filters={[
          { name: 'category', label: '분류', options: categories },
          { name: 'status', label: '상태', options: CONTENT_STATUS_OPTIONS },
          { name: 'year', label: '연도', options: years.map(y => ({ value: y, label: `${y}년` })) },
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
          { key: 'category', header: '분류', className: 'w-32' },
          { key: 'status', header: '상태', className: 'w-28' },
          { key: 'updated', header: '수정', sortField: 'updated_at', className: 'w-44' },
        ]}
        empty={{
          title: query.trash ? '휴지통이 비었습니다' : `${cfg.label} 글이 없습니다`,
          create:
            canCreate && !query.trash
              ? { href: `${cfg.adminPath}/new`, label: `첫 ${cfg.label} 올리기` }
              : undefined,
        }}
      />
    </>
  );
};

/** 새 글에 서버가 채우는 것 — 사용자 · 분류 · 분류 더하기 권한 · 날짜(?date= · 없으면 주일광고 이번 주일 · 성복의 뜰 오늘) */
const loadNewsVideoNew = async (
  feed: NewsFeedKey,
  searchParams: SearchParams
): Promise<NewsVideoNewData> => {
  const cfg = NEWS_FEEDS[feed];
  const [ctx, sp, book] = await Promise.all([
    // 권한을 확인한 뒤에만 내보낸다(없으면 «없음»)
    requirePermission(cfg.menuKey, 'CREATE'),
    searchParams,
    getCategoryBook(),
  ]);
  const asked = typeof sp.date === 'string' && isCalendarDate(sp.date) ? sp.date : null;
  return {
    userId: ctx.user.id,
    categories: categoryOptions(book, cfg.categoryGroup),
    canAddCategory: can(ctx.permissions, 'categories', 'CREATE'),
    // 요청마다 지금 시각 기준(로그인 쿠키를 읽은 뒤)
    date: asked ?? defaultNewsDate(feed, seoulToday(new Date().getTime())),
  };
};

/**
 * 새 글 — 미리 만든 틀로 누르는 즉시 보이고 바로 쓴다(ADR 0027). 제목 · 폼은 틀에, 서버에서 받을 것은 약속으로 넘겨 오는 대로
 * 채우고(분류가 하나뿐이면 골라 둔다), 권한 확인은 Suspense 안의 PermissionGate 가 한다(없으면 «없음»).
 * 화면(page)은 동기 함수여야 틀에 들어간다 — 이 부품을 기다리지 않고 그대로 돌려준다.
 */
export const NewsVideoNewScreen = ({
  feed,
  searchParams,
}: {
  feed: NewsFeedKey;
  searchParams: SearchParams;
}) => (
  <>
    <PageHeader title={`새 ${NEWS_FEEDS[feed].label}`} />
    <Suspense fallback={null}>
      <PermissionGate menuKey={NEWS_FEEDS[feed].menuKey} action="CREATE" />
    </Suspense>
    <NewsVideoNewForm feed={feed} data={loadNewsVideoNew(feed, searchParams)} />
  </>
);

const idOrNotFound = async (params: Promise<{ id: string }>) => {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  return id;
};

/** 상세 — 머리: [목록] · 이전/다음 · [복제해서 새로 쓰기] · (공개면) [사이트에서 보기] · [수정] · «더 보기» */
export const NewsVideoDetailScreen = async ({
  feed,
  params,
}: {
  feed: NewsFeedKey;
  params: Promise<{ id: string }>;
}) => {
  const cfg = NEWS_FEEDS[feed];
  const id = await idOrNotFound(params);
  const supabase = await createSupabaseServerClient();
  const [ctx, video] = await Promise.all([
    requirePermission(cfg.menuKey, 'READ'),
    loadNewsVideo(supabase, feed, id),
  ]);
  if (!video) notFound();
  const names = await actorNameMap(supabase, [video.createdBy, video.updatedBy]);
  const live = video.status === 'PUBLISHED' && !video.trashed && video.videoId;

  return (
    <>
      <PageHeader
        title={video.title}
        badge={<ContentStatusBadge status={video.status} deletedAt={video.deletedAt} />}
        actions={
          <>
            <ListNav listPath={cfg.adminPath} id={video.id} />
            <ContentDetailActions
              kind={feed}
              id={video.id}
              subject={video.title}
              trashed={video.trashed}
              canCreate={can(ctx.permissions, cfg.menuKey, 'CREATE')}
              canUpdate={can(ctx.permissions, cfg.menuKey, 'UPDATE')}
              canTrash={can(ctx.permissions, cfg.menuKey, 'DELETE')}
              canPurge={can(ctx.permissions, cfg.menuKey, 'PURGE')}
              canHistory={can(ctx.permissions, cfg.menuKey, 'HISTORY')}
            >
              {live && (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={
                    <a
                      href={`${cfg.publicPath}/${video.videoId}`}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  <ExternalLinkIcon data-icon="inline-start" />
                  사이트에서 보기
                </Button>
              )}
              {!video.trashed && can(ctx.permissions, cfg.menuKey, 'UPDATE') && (
                <Button
                  nativeButton={false}
                  render={<Link href={`${cfg.adminPath}/${video.id}/edit`} />}
                >
                  <PencilIcon data-icon="inline-start" />
                  수정
                </Button>
              )}
            </ContentDetailActions>
          </>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 md:flex-row">
          {video.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element -- 유튜브가 주는 썸네일 그대로(ADR 0013)
            <img
              src={video.thumbnail}
              alt=""
              width={480}
              height={360}
              className="bg-muted aspect-video w-full max-w-xs shrink-0 rounded-md border object-cover"
            />
          )}
          <DetailList
            items={[
              { label: '분류', value: video.categoryLabel },
              {
                label: '날짜',
                value: video.dateFrom === 'UPLOAD' ? `${video.date} (업로드)` : video.date,
              },
              {
                label: '영상',
                value: video.videoId ? (
                  <a
                    href={`https://www.youtube.com/watch?v=${video.videoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-4 hover:underline"
                  >
                    youtu.be/{video.videoId}
                  </a>
                ) : (
                  '없음'
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      {video.description && (
        <Card>
          <CardContent>
            {/* 유튜브에서 옮긴 설명에는 긴 주소가 흔하다 — 줄을 넘기지 않으면 카드가 가로로 넘친다 */}
            <p className="m-0 text-sm break-words whitespace-pre-line">{video.description}</p>
          </CardContent>
        </Card>
      )}

      <RecordMeta
        createdAt={video.createdAt}
        createdBy={video.createdBy ? names[video.createdBy] : '시스템'}
        updatedAt={video.updatedAt}
        updatedBy={video.updatedBy ? names[video.updatedBy] : '시스템'}
      />
    </>
  );
};

/** 수정 — 휴지통에 든 글은 고치지 않는다(복구한 뒤에) */
export const NewsVideoEditScreen = async ({
  feed,
  params,
}: {
  feed: NewsFeedKey;
  params: Promise<{ id: string }>;
}) => {
  const cfg = NEWS_FEEDS[feed];
  const id = await idOrNotFound(params);
  const supabase = await createSupabaseServerClient();
  const [ctx, video, book] = await Promise.all([
    requirePermission(cfg.menuKey, 'UPDATE'),
    loadNewsVideo(supabase, feed, id),
    getCategoryBook(),
  ]);
  if (!video || video.trashed) notFound();
  return (
    <>
      <PageHeader title={video.title} />
      <NewsVideoForm
        key={video.updatedAt}
        feed={feed}
        userId={ctx.user.id}
        categories={categoryOptions(book, cfg.categoryGroup, video.categoryId)}
        canAddCategory={can(ctx.permissions, 'categories', 'CREATE')}
        initial={{
          title: video.title,
          categoryId: video.categoryId,
          date: video.date,
          video: video.videoId ?? '',
          description: video.description,
        }}
        editing={{ id: video.id, updatedAt: video.updatedAt, status: video.status }}
      />
    </>
  );
};
