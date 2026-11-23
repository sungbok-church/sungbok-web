import type { Database } from '@/shared/api/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

import { requirePermission } from '@/domains/admin/api/server/adminContext.server';
import { can, screenLabel } from '@/domains/admin/lib/adminNav';
import { GroupNav } from '@/domains/admin/components/features/GroupNav';
import { HistorySheet } from '@/domains/admin/components/features/HistorySheet';
import { PageHeader } from '@/domains/admin/components/features/PageHeader';
import { SortableRows } from '@/domains/admin/components/widgets/SortableRows';
import { createSupabaseServerClient } from '@/shared/api/supabase/serverClient.server';
import { Badge } from '@/shared/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Empty, EmptyHeader, EmptyTitle } from '@/shared/components/ui/empty';
import { LockIcon } from 'lucide-react';

import { ItemCreateForm } from './ItemCreateForm';
import { ITEM_KINDS, type ItemKind } from './itemKinds';

type Client = SupabaseClient<Database>;
type Group = { key: string; name: string; description: string | null; locked: boolean };
type Item = { id: string; label: string; detail: string; isActive: boolean; updatedAt: string };

/** 왼쪽 묶음 — 코드 묶음만 설명 · 잠금이 있다 */
const readGroups = async (supabase: Client, kind: ItemKind): Promise<Group[]> => {
  if (kind === 'codes') {
    const { data } = await supabase
      .from('code_groups')
      .select('key, name, description, is_locked')
      .order('sort');
    return (data ?? []).map(g => ({
      key: g.key,
      name: g.name,
      description: g.description,
      locked: g.is_locked,
    }));
  }
  const { data } = await supabase.from('category_groups').select('key, name').order('sort');
  return (data ?? []).map(g => ({ ...g, description: null, locked: false }));
};

/** 오른쪽 표 — 그 묶음의 줄. 둘째 칸(detail)은 영문 값(분류: slug · 코드: code) */
const readItems = async (supabase: Client, kind: ItemKind, groupKey: string): Promise<Item[]> => {
  const toItem = (r: {
    id: string;
    label: string;
    is_active: boolean;
    updated_at: string;
    detail: string;
  }) => ({
    id: r.id,
    label: r.label,
    detail: r.detail,
    isActive: r.is_active,
    updatedAt: r.updated_at,
  });
  if (kind === 'codes') {
    const { data } = await supabase
      .from('codes')
      .select('id, detail:code, label, is_active, updated_at')
      .eq('group_key', groupKey)
      .order('sort')
      .order('created_at');
    return (data ?? []).map(toItem);
  }
  const { data } = await supabase
    .from('categories')
    .select('id, detail:slug, label, is_active, updated_at')
    .eq('group_key', groupKey)
    .order('sort')
    .order('created_at');
  return (data ?? []).map(toItem);
};

/**
 * 분류 관리(콘텐츠 › 분류 관리) · 코드 관리(시스템 › 코드 관리)의 화면 — 두 화면은 «묶음 안의 이름 목록» 으로 같다.
 * 왼쪽 묶음(분류: 주일광고 분류 · 앨범 분류 … / 코드: 직분 · 콘텐츠 상태 · 새가족 구분 …), 오른쪽 그 묶음의 줄.
 * 더하고 · 이름을 바꾸고 · 순서를 바꾸고 · 끈다. 영문 값(분류 slug · 코드 값)은 공개 주소 · 프로그램이 쓰므로 바꾸지 않는다.
 * 잠긴 코드 묶음은 프로그램이 쓰는 값(enum)이라 더하거나 끌 수 없고 이름 · 순서만 바꾼다. 다른 점은 ITEM_KINDS.
 */
export const ItemGroupsScreen = async ({
  kind,
  searchParams,
}: {
  kind: ItemKind;
  searchParams: Promise<{ group?: string | string[] }>;
}) => {
  const k = ITEM_KINDS[kind];
  const supabase = await createSupabaseServerClient();
  // 권한 확인과 함께 읽는다(DB 왕복 한 번 줄이기) — 권한이 없으면 404 로 끊고 읽은 값은 버린다(막는 것은 DB 의 RLS)
  const [ctx, groups, { data: all }] = await Promise.all([
    requirePermission(kind, 'READ'),
    readGroups(supabase, kind),
    supabase.from(kind).select('group_key'),
  ]);
  const counts = new Map<string, number>();
  for (const c of all ?? []) counts.set(c.group_key, (counts.get(c.group_key) ?? 0) + 1);
  const list = groups.map(g => ({ ...g, count: counts.get(g.key) ?? 0 }));
  const asked = (await searchParams).group;
  const current = list.find(g => g.key === asked) ?? list[0];

  const items = current ? await readItems(supabase, kind, current.key) : [];
  const title = screenLabel(ctx.nav, kind, k.title);

  return (
    <>
      <PageHeader
        title={title}
        actions={
          can(ctx.permissions, kind, 'HISTORY') && <HistorySheet table={kind} subject={title} />
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[16rem_1fr]">
        <Card size="sm">
          <CardHeader>
            <CardTitle>{k.groupsTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupNav
              label={k.groupsLabel}
              groups={list}
              current={current?.key ?? ''}
              basePath={`/admin/${kind}`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{current?.name ?? k.noun}</CardTitle>
            {/* 코드 묶음의 설명(DB 의 값)만 — 화면 설명 문장은 달지 않는다 */}
            {current?.description && <CardDescription>{current.description}</CardDescription>}
            {current?.locked && (
              <CardAction>
                <Badge variant="neutral">
                  <LockIcon aria-hidden />
                  이름 · 순서만 바꿈
                </Badge>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* 잠긴 묶음은 머리의 «이름 · 순서만 바꿈» 표가 알린다 — 더하기 칸을 그리지 않는다 */}
            {current && !current.locked && can(ctx.permissions, kind, 'CREATE') && (
              <ItemCreateForm key={current.key} kind={kind} groupKey={current.key} />
            )}
            {items.length === 0 ? (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyTitle>아직 {k.noun}가 없습니다</EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              <SortableRows
                kind={kind}
                caption={`${current?.name ?? ''} ${k.noun}`}
                detailHeader={k.fieldLabel}
                editable={can(ctx.permissions, kind, 'UPDATE')}
                rows={items.map(item =>
                  current?.locked
                    ? {
                        ...item,
                        locked: true,
                        lockedNote: '프로그램이 쓰는 값이라 끌 수 없습니다.',
                      }
                    : item
                )}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};
