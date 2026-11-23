import { requirePermission } from '@/domains/admin/api/adminContext.server';
import { can, screenLabel } from '@/domains/admin/api/adminNav';
import { SCREEN_DESCRIPTIONS } from '@/domains/admin/api/adminScreens';
import { GroupNav } from '@/domains/admin/components/features/GroupNav';
import { HistorySheet } from '@/domains/admin/components/features/HistorySheet';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { ItemCreateForm } from '@/domains/admin/components/widgets/ItemCreateForm';
import { SortableRows } from '@/domains/admin/components/widgets/SortableRows';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/shared/components/ui/empty';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

const PATH = '/admin/categories';

// 분류 관리(콘텐츠 › 분류 관리) — 왼쪽 묶음(주일광고 분류 · 앨범 분류 · 설교 시트지 묶음 …), 오른쪽 그 묶음의 분류.
// 더하고 · 이름을 바꾸고 · 순서를 바꾸고 · 끈다. 영문 이름(slug)은 공개 주소의 거르기 값이라 바꾸지 않는다.
export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string | string[] }>;
}) {
  const supabase = await createSupabaseServerClient();
  // 권한 확인과 함께 읽는다(DB 왕복 한 번 줄이기) — 권한이 없으면 404 로 끊고 읽은 값은 버린다(막는 것은 DB 의 RLS)
  const [ctx, { data: groups }, { data: all }] = await Promise.all([
    requirePermission('categories', 'READ'),
    supabase.from('category_groups').select('key, name').order('sort'),
    supabase.from('categories').select('group_key'),
  ]);
  const counts = new Map<string, number>();
  for (const c of all ?? []) counts.set(c.group_key, (counts.get(c.group_key) ?? 0) + 1);
  const list = (groups ?? []).map(g => ({ ...g, count: counts.get(g.key) ?? 0 }));
  const asked = (await searchParams).group;
  const current = list.find(g => g.key === asked) ?? list[0];

  const { data: items } = current
    ? await supabase
        .from('categories')
        .select('id, slug, label, is_active, updated_at')
        .eq('group_key', current.key)
        .order('sort')
        .order('created_at')
    : { data: [] };
  const title = screenLabel(ctx.nav, 'categories', '분류 관리');

  return (
    <>
      <PageHeader
        title={title}
        description={SCREEN_DESCRIPTIONS.categories}
        actions={
          can(ctx.permissions, 'categories', 'HISTORY') && (
            <HistorySheet table="categories" subject={title} />
          )
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[16rem_1fr]">
        <Card size="sm">
          <CardHeader>
            <CardTitle>묶음</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupNav
              label="분류 묶음"
              groups={list}
              current={current?.key ?? ''}
              basePath={PATH}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{current?.name ?? '분류'}</CardTitle>
            <CardDescription>
              글을 쓸 때 고르는 분류입니다. 끈 분류는 새 글에서 고를 수 없고, 이미 쓴 글에는 그대로
              남습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {current && can(ctx.permissions, 'categories', 'CREATE') && (
              <ItemCreateForm key={current.key} kind="categories" groupKey={current.key} />
            )}
            {(items ?? []).length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>아직 분류가 없습니다</EmptyTitle>
                  <EmptyDescription>위에서 이름과 영문 이름을 넣어 더해 주세요.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <SortableRows
                kind="categories"
                caption={`${current?.name ?? ''} 분류`}
                detailHeader="영문 이름"
                editable={can(ctx.permissions, 'categories', 'UPDATE')}
                rows={(items ?? []).map(c => ({
                  id: c.id,
                  label: c.label,
                  detail: c.slug,
                  isActive: c.is_active,
                  updatedAt: c.updated_at,
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
