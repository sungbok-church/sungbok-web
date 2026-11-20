import { requirePermission } from '@/domains/admin/api/adminContext.server';
import { can, screenLabel } from '@/domains/admin/api/adminNav';
import { SCREEN_DESCRIPTIONS } from '@/domains/admin/api/adminScreens';
import { GroupNav } from '@/domains/admin/components/features/GroupNav';
import { HistorySheet } from '@/domains/admin/components/features/HistorySheet';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { ItemCreateForm } from '@/domains/admin/components/widgets/ItemCreateForm';
import { SortableRows } from '@/domains/admin/components/widgets/SortableRows';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/shared/components/ui/empty';
import { LockIcon } from 'lucide-react';

// 관리자는 요청마다 그린다(src/app/admin/layout.tsx · ADR 0024) — 이 화면도 요청을 기다려도 된다(개발 중 «instant» 검사 제외).
export const instant = false;

const PATH = '/admin/codes';

// 코드 관리(시스템 › 코드 관리) — 공통코드. 왼쪽 묶음(직분 · 콘텐츠 상태 · 새가족 구분 · 새가족 처리 상태 …),
// 오른쪽 그 묶음의 코드. 코드 값은 영문 대문자이고 바꾸지 않는다.
// 잠긴 묶음은 프로그램이 쓰는 값(enum)이라 더하거나 끌 수 없고 이름 · 순서만 바꾼다.
export default async function AdminCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string | string[] }>;
}) {
  const ctx = await requirePermission('codes', 'READ');
  const supabase = await createSupabaseServerClient();
  const [{ data: groups }, { data: all }] = await Promise.all([
    supabase.from('code_groups').select('key, name, description, is_locked').order('sort'),
    supabase.from('codes').select('group_key'),
  ]);
  const counts = new Map<string, number>();
  for (const c of all ?? []) counts.set(c.group_key, (counts.get(c.group_key) ?? 0) + 1);
  const list = (groups ?? []).map(g => ({
    key: g.key,
    name: g.name,
    description: g.description,
    locked: g.is_locked,
    count: counts.get(g.key) ?? 0,
  }));
  const asked = (await searchParams).group;
  const current = list.find(g => g.key === asked) ?? list[0];

  const { data: items } = current
    ? await supabase
        .from('codes')
        .select('id, code, label, is_active, updated_at')
        .eq('group_key', current.key)
        .order('sort')
        .order('created_at')
    : { data: [] };
  const title = screenLabel(ctx.nav, 'codes', '코드 관리');

  return (
    <>
      <PageHeader
        title={title}
        description={SCREEN_DESCRIPTIONS.codes}
        actions={
          can(ctx.permissions, 'codes', 'HISTORY') && <HistorySheet table="codes" subject={title} />
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[16rem_1fr]">
        <Card size="sm">
          <CardHeader>
            <CardTitle>코드 묶음</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupNav
              label="코드 묶음"
              groups={list}
              current={current?.key ?? ''}
              basePath={PATH}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{current?.name ?? '코드'}</CardTitle>
            <CardDescription>
              {current?.description ?? ''}
              {current && <span className="ml-1 font-mono text-xs">({current.key})</span>}
            </CardDescription>
            {current?.locked && (
              <CardAction>
                <Badge variant="neutral">
                  <LockIcon aria-hidden />
                  잠긴 묶음
                </Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {current?.locked ? (
              <Alert>
                <LockIcon aria-hidden />
                <AlertDescription>
                  프로그램이 쓰는 값이라 코드를 더하거나 끌 수 없습니다. 화면에 보이는 이름과 순서만
                  바꿉니다.
                </AlertDescription>
              </Alert>
            ) : (
              current &&
              can(ctx.permissions, 'codes', 'CREATE') && (
                <ItemCreateForm key={current.key} kind="codes" groupKey={current.key} />
              )
            )}
            {(items ?? []).length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>아직 코드가 없습니다</EmptyTitle>
                  <EmptyDescription>위에서 이름과 코드 값을 넣어 더해 주세요.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <SortableRows
                kind="codes"
                caption={`${current?.name ?? ''} 코드`}
                detailHeader="코드 값"
                editable={can(ctx.permissions, 'codes', 'UPDATE')}
                rows={(items ?? []).map(c => ({
                  id: c.id,
                  label: c.label,
                  detail: c.code,
                  isActive: c.is_active,
                  updatedAt: c.updated_at,
                  locked: current?.locked,
                  lockedNote: '프로그램이 쓰는 값이라 끌 수 없습니다.',
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
